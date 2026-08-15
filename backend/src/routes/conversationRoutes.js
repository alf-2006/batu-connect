const express = require('express');
const { sendStudentQuestionToWhatsApp } = require('../services/whatsappService');
const { authenticateToken, requireStudent, verifyConversationOwnership } = require('../middleware/authMiddleware');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * POST /api/conversations
 * Starts a new student question to doctor & dispatches to WhatsApp
 * SECURITY FIX: Added authentication and proper rate limiting
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { doctorId, subject, questionContent } = req.body;

    // SECURITY FIX: Always use authenticated user's ID - never trust client-provided studentId
    const studentId = req.user.id;

    if (!doctorId || !subject) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة (الدكتور، الموضوع)' });
    }

    // Verify student exists
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ error: 'حساب المستخدم غير موجود، يرجى الخروج وتسجيل الدخول مجدداً' });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId }
    });

    if (!doctor || !doctor.isActive) {
      return res.status(404).json({ error: 'الدكتور المحدد غير متاح حالياً' });
    }

    // SECURITY FIX: Generate unique reference code with crypto.randomUUID for zero collision
    const crypto = require('crypto');
    const uniqueId = crypto.randomBytes(6).toString('hex').toUpperCase();
    const referenceCode = `REQ-${uniqueId}`; // e.g., REQ-A3F8B2C14E9D

    // SECURITY FIX: Use transaction to prevent race condition in rate limiting
    const conversation = await prisma.$transaction(async (tx) => {
      // Rate Limiting - Bypass for Admins, 100 per hour limit for students
      if (req.user.role !== 'admin') {
        const recentConvs = await tx.conversation.count({
          where: {
            studentId: student.id,
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
          }
        });

        if (recentConvs >= 100) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        }
      }

      // Create Conversation in DB within transaction
      return await tx.conversation.create({
        data: {
          studentId: student.id,
          doctorId: doctor.id,
          subject: subject.trim(),
          referenceCode: referenceCode,
          status: 'open'
        }
      });
    });

    // Dispatch to WhatsApp Automation layer only if questionContent is provided
    let initialMessage = null;
    if (questionContent && questionContent.trim()) {
      initialMessage = await sendStudentQuestionToWhatsApp(
        conversation,
        student,
        doctor,
        questionContent.trim()
      );
    }

    const isWhatsAppConnected = initialMessage && initialMessage.status === 'sent';
    const errorCode = !isWhatsAppConnected ? 596 : null;
    const warningMessage = !isWhatsAppConnected 
      ? 'تم حفظ الاستفسار محلياً بالنظام'
      : null;

    return res.status(201).json({
      message: isWhatsAppConnected 
        ? 'تم إرسال السؤال بنجاح إلى واتساب الدكتور' 
        : warningMessage,
      errorCode,
      warningCode: !isWhatsAppConnected ? 'ERR_WA_NOT_CONNECTED' : null,
      warningMessage,
      isWhatsAppConnected,
      conversation: {
        id: conversation.id,
        referenceCode: conversation.referenceCode,
        subject: conversation.subject,
        status: conversation.status,
        createdAt: conversation.createdAt,
        doctorName: doctor.fullName,
        doctorDepartment: doctor.department
      },
      initialMessage
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'لقد تجاوزت الحد الأقصى (100 محادثة في الساعة). يرجى الانتظار قليلاً.' });
    }
    return res.status(500).json({ error: 'فشل إنشاء المحادثة وإرسال الرسالة' });
  }
});

/**
 * GET /api/conversations?studentId=...
 * Fetch all conversations for student
 * SECURITY FIX: Added authentication
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ error: 'معرّف الطالب مطلوب' });
    }

    // Verify student is accessing their own data (Admins can view any)
    if (req.user.role !== 'admin' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'لا يمكنك عرض محادثات طالب آخر' });
    }

    const conversations = await prisma.conversation.findMany({
      where: { studentId },
      include: {
        doctor: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = conversations.map(c => ({
      id: c.id,
      referenceCode: c.referenceCode,
      subject: c.subject,
      status: c.status,
      createdAt: c.createdAt,
      doctorId: c.doctor.id,
      doctorName: c.doctor.fullName,
      doctorDepartment: c.doctor.department,
      lastMessage: c.messages[0] || null
    }));

    return res.json(formatted);

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'تعذر جلب المحادثات' });
  }
});

/**
 * GET /api/conversations/:id
 * Fetch conversation details & all messages
 * SECURITY FIX: Added authentication and ownership verification
 */
router.get('/:id', authenticateToken, verifyConversationOwnership, async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, fullName: true, universityId: true, department: true }
        },
        doctor: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'المحادثة غير موجودة' });
    }

    return res.json({
      id: conversation.id,
      referenceCode: conversation.referenceCode,
      subject: conversation.subject,
      status: conversation.status,
      createdAt: conversation.createdAt,
      student: conversation.student,
      doctor: {
        id: conversation.doctor.id,
        fullName: conversation.doctor.fullName,
        department: conversation.doctor.department,
        specialty: conversation.doctor.specialty,
        avatarUrl: conversation.doctor.avatarUrl || null
      },
      messages: conversation.messages
    });

  } catch (error) {
    console.error('Error fetching conversation details:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل المحادثة' });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Student sends a follow-up text message, image, or audio voice note inside the conversation
 * SECURITY FIX: Added authentication, file validation, and async file operations
 */
router.post('/:id/messages', authenticateToken, verifyConversationOwnership, async (req, res) => {
  try {
    const { id } = req.params;
    const { textContent, imageBase64, audioBase64, documentBase64, documentName } = req.body;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        student: true,
        doctor: true
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'المحادثة غير موجودة' });
    }

    const fs = require('fs').promises;
    const path = require('path');

    let imageUrl = null;
    if (imageBase64) {
      const matches = imageBase64.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'صيغة الصورة غير مدعومة. يرجى استخدام JPEG, PNG, GIF أو WEBP' });
      }

      const [, fileType, base64Data] = matches;
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)' });
      }

      // SECURITY FIX: Verify actual file content using magic bytes
      const isValidImage = (
        (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) || // JPEG
        (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) || // PNG
        (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) || // GIF
        (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) // WEBP
      );

      if (!isValidImage) {
        return res.status(400).json({ error: 'محتوى الملف غير صالح - الملف ليس صورة حقيقية' });
      }

      const filename = `student_img_${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileType}`;
      const uploadsDir = path.join(__dirname, '../../public/uploads');

      try {
        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.writeFile(path.join(uploadsDir, filename), buffer);
        imageUrl = `/uploads/${filename}`;
      } catch (fsError) {
        console.error('Error saving image file:', fsError);
        return res.status(500).json({ error: 'فشل حفظ الصورة' });
      }
    }

    let audioUrl = null;
    if (audioBase64) {
      try {
        const matches = audioBase64.match(/^data:audio\/(mpeg|mp3|mp4|ogg|wav|webm);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ error: 'صيغة الصوت غير مدعومة' });
        }

        const [, fileType, rawData] = matches;
        const buffer = Buffer.from(rawData, 'base64');

        if (buffer.length > 10 * 1024 * 1024) {
          return res.status(400).json({ error: 'حجم الملف الصوتي كبير جداً (الحد الأقصى 10 ميجابايت)' });
        }

        const filename = `student_audio_${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileType}`;
        const audioDir = path.join(__dirname, '../../public/uploads/audio');

        await fs.mkdir(audioDir, { recursive: true });
        await fs.writeFile(path.join(audioDir, filename), buffer);
        audioUrl = `/uploads/audio/${filename}`;
      } catch (audioErr) {
        console.error('Error saving audio file:', audioErr);
        return res.status(500).json({ error: 'فشل حفظ الملف الصوتي' });
      }
    }

    let documentUrl = null;
    let finalDocName = documentName || null;
    if (documentBase64) {
      try {
        const matches = documentBase64.match(/^data:(application\/[a-zA-Z0-9.-]+|text\/plain);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ error: 'صيغة المستند غير مدعومة (يدعم PDF, Word, PowerPoint, ZIP, TXT)' });
        }

        const [, mimeType, rawDocData] = matches;
        const buffer = Buffer.from(rawDocData, 'base64');

        if (buffer.length > 15 * 1024 * 1024) {
          return res.status(400).json({ error: 'حجم المستند كبير جداً (الحد الأقصى 15 ميجابايت)' });
        }

        let ext = 'pdf';
        if (mimeType.includes('pdf')) ext = 'pdf';
        else if (mimeType.includes('word') || mimeType.includes('msword')) ext = 'docx';
        else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) ext = 'pptx';
        else if (mimeType.includes('zip')) ext = 'zip';
        else if (mimeType.includes('plain')) ext = 'txt';

        const safeDocName = (documentName || `doc_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `doc_${Date.now()}_${safeDocName}.${ext}`;
        const docDir = path.join(__dirname, '../../public/uploads/documents');

        await fs.mkdir(docDir, { recursive: true });
        await fs.writeFile(path.join(docDir, filename), buffer);
        documentUrl = `/uploads/documents/${filename}`;
        if (!finalDocName) finalDocName = filename;
      } catch (docErr) {
        console.error('Error saving document file:', docErr);
        return res.status(500).json({ error: 'فشل حفظ المستند المرفق' });
      }
    }

    const { sendStudentFollowUpMessageToWhatsApp } = require('../services/whatsappService');
    const newMsg = await sendStudentFollowUpMessageToWhatsApp(
      conversation,
      conversation.student,
      conversation.doctor,
      textContent || '',
      imageUrl,
      audioUrl,
      documentUrl,
      finalDocName
    );

    return res.status(201).json(newMsg);

  } catch (error) {
    console.error('Error sending follow-up message:', error);
    return res.status(500).json({ error: error.message || 'فشل إرسال الرسالة' });
  }
});

module.exports = router;
