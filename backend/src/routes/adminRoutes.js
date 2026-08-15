const express = require('express');
const bcrypt = require('bcryptjs');
const { encryptPhoneNumber, decryptPhoneNumber } = require('../services/cryptoService');
const { getWhatsAppStatus, initWhatsApp, simulateDoctorReply, disconnectWhatsAppSession, sendStudentQuestionToWhatsApp } = require('../services/whatsappService');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { PERMISSIONS, ALL_PERMISSIONS } = require('../constants/permissions');
const { requirePermission, requireSuperAdmin } = require('../middleware/permissionMiddleware');
const prisma = require('../lib/prisma');

const router = express.Router();

// Apply authentication to ALL admin routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/me
 * Fetch current admin profile & permissions
 */
router.get('/me', async (req, res) => {
  try {
    let admin = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!admin || admin.role !== 'admin' || admin.isActive === false) {
      return res.status(401).json({ error: 'الحساب غير موجود أو تم تعطيله' });
    }

    // Auto-promote primary admin to Super Admin if no super admin exists yet in system
    if (!admin.isSuperAdmin) {
      const superAdminCount = await prisma.user.count({
        where: { role: 'admin', isSuperAdmin: true }
      });
      if (superAdminCount === 0) {
        admin = await prisma.user.update({
          where: { id: admin.id },
          data: { isSuperAdmin: true }
        });
      }
    }

    let perms = [];
    try { perms = JSON.parse(admin.permissions || '[]'); } catch (e) {}

    return res.json({
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      isSuperAdmin: Boolean(admin.isSuperAdmin),
      isActive: Boolean(admin.isActive),
      permissions: perms,
      createdAt: admin.createdAt,
      lastLoginAt: admin.lastLoginAt
    });
  } catch (err) {
    console.error('Error fetching admin profile:', err);
    return res.status(500).json({ error: 'فشل جلب بيانات المشرف' });
  }
});

/**
 * GET /api/admin/sub-admins
 * List all admin & sub-admin accounts
 */
router.get('/sub-admins', requireSuperAdmin, async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      orderBy: { createdAt: 'desc' }
    });

    const result = admins.map(adm => {
      let perms = [];
      try { perms = JSON.parse(adm.permissions || '[]'); } catch (e) {}
      return {
        id: adm.id,
        fullName: adm.fullName,
        email: adm.email,
        role: adm.role,
        isSuperAdmin: Boolean(adm.isSuperAdmin),
        isActive: Boolean(adm.isActive),
        permissions: perms,
        createdAt: adm.createdAt,
        lastLoginAt: adm.lastLoginAt
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('List sub-admins error:', error);
    return res.status(500).json({ error: 'فشل جلب قائمة المشرفين' });
  }
});

/**
 * POST /api/admin/sub-admins
 * Create new Sub-Admin account
 */
router.post('/sub-admins', requireSuperAdmin, async (req, res) => {
  try {
    const { fullName, email, password, permissions } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'الاسم الكامل، البريد الإلكتروني، وكلمة المرور حقول إجبارية' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن لا تقل عن 6 أحرف' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existing) {
      return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    const rawPerms = Array.isArray(permissions) ? permissions : [];
    const validPerms = rawPerms.filter(p => ALL_PERMISSIONS.includes(p));
    const hashedPassword = await bcrypt.hash(password, 10);

    const newSubAdmin = await prisma.user.create({
      data: {
        role: 'admin',
        fullName: fullName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        isSuperAdmin: false,
        isActive: true,
        permissions: JSON.stringify(validPerms)
      }
    });

    return res.status(201).json({
      message: 'تم إنشاء حساب المشرف الجديد بنجاح',
      admin: {
        id: newSubAdmin.id,
        fullName: newSubAdmin.fullName,
        email: newSubAdmin.email,
        role: newSubAdmin.role,
        isSuperAdmin: false,
        isActive: true,
        permissions: validPerms,
        createdAt: newSubAdmin.createdAt
      }
    });
  } catch (error) {
    console.error('Create sub-admin error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء حساب المشرف' });
  }
});

/**
 * PUT /api/admin/sub-admins/:id
 * Update sub-admin details & permissions
 */
router.put('/sub-admins/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, password, permissions } = req.body;

    const targetAdmin = await prisma.user.findUnique({ where: { id } });

    if (!targetAdmin || targetAdmin.role !== 'admin') {
      return res.status(404).json({ error: 'حساب المشرف غير موجود' });
    }

    if (targetAdmin.isSuperAdmin) {
      return res.status(403).json({ error: 'لا يمكن تعديل صلاحيات المدير الرئيسي (Super Admin)' });
    }

    const updateData = {};

    if (fullName && fullName.trim()) {
      updateData.fullName = fullName.trim();
    }

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== targetAdmin.email) {
        const emailCheck = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (emailCheck) {
          return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
        }
        updateData.email = cleanEmail;
      }
    }

    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return res.status(400).json({ error: 'كلمة المرور يجب أن لا تقل عن 6 أحرف' });
      }
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    if (Array.isArray(permissions)) {
      const validPerms = permissions.filter(p => ALL_PERMISSIONS.includes(p));
      updateData.permissions = JSON.stringify(validPerms);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    let perms = [];
    try { perms = JSON.parse(updated.permissions || '[]'); } catch (e) {}

    return res.json({
      message: 'تم تحديث حساب المشرف بنجاح',
      admin: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        isSuperAdmin: false,
        isActive: Boolean(updated.isActive),
        permissions: perms,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('Update sub-admin error:', error);
    return res.status(500).json({ error: 'فشل تحديث حساب المشرف' });
  }
});

/**
 * PATCH /api/admin/sub-admins/:id/status
 * Toggle sub-admin active status
 */
router.patch('/sub-admins/:id/status', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(403).json({ error: 'حظر أمني: لا يمكنك تعطيل حسابك الحالي' });
    }

    const targetAdmin = await prisma.user.findUnique({ where: { id } });
    if (!targetAdmin || targetAdmin.role !== 'admin') {
      return res.status(404).json({ error: 'حساب المشرف غير موجود' });
    }

    if (targetAdmin.isSuperAdmin) {
      return res.status(403).json({ error: 'حظر أمني: لا يمكنك تعطيل المدير الرئيسي (Super Admin)' });
    }

    const newStatus = !targetAdmin.isActive;

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: newStatus }
    });

    return res.json({
      message: newStatus ? 'تم تفعيل حساب المشرف بنجاح' : 'تم تعطيل حساب المشرف بنجاح',
      id: updated.id,
      isActive: newStatus
    });
  } catch (error) {
    console.error('Toggle admin status error:', error);
    return res.status(500).json({ error: 'فشل تغيير حالة المشرف' });
  }
});

/**
 * DELETE /api/admin/sub-admins/:id
 * Delete sub-admin account
 */
router.delete('/sub-admins/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(403).json({ error: 'حظر أمني: لا يمكنك حذف حسابك الحالي' });
    }

    const targetAdmin = await prisma.user.findUnique({ where: { id } });
    if (!targetAdmin || targetAdmin.role !== 'admin') {
      return res.status(404).json({ error: 'حساب المشرف غير موجود' });
    }

    if (targetAdmin.isSuperAdmin) {
      return res.status(403).json({ error: 'حظر أمني: لا يمكنك حذف المدير الرئيسي (Super Admin)' });
    }

    await prisma.user.delete({ where: { id } });

    return res.json({ message: 'تم حذف حساب المشرف نهائياً' });
  } catch (error) {
    console.error('Delete sub-admin error:', error);
    return res.status(500).json({ error: 'فشل حذف حساب المشرف' });
  }
});

/**
 * GET /api/admin/doctors
 * Admin list all doctors with masked phone for verification
 */
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const result = doctors.map(doc => {
      const decrypted = decryptPhoneNumber(doc.whatsappNumberEnc);
      const masked = decrypted ? `${decrypted.substring(0, 5)}****${decrypted.slice(-3)}` : 'غير مشفر';
      return {
        id: doc.id,
        fullName: doc.fullName,
        title: doc.title,
        department: doc.department,
        specialty: doc.specialty,
        courses: doc.courses,
        whatsappMasked: masked,
        // SECURITY FIX: Never expose raw phone numbers in API
        // whatsappRaw has been removed for security
        isActive: doc.isActive,
        createdAt: doc.createdAt
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('Admin doctors fetch error:', error);
    return res.status(500).json({ error: 'خطأ في جلب بيانات الدكاترة للأدمن' });
  }
});

const path = require('path');
const fs = require('fs').promises;

async function resolveDepartmentId(departmentInput) {
  const defaultDept = await prisma.department.findFirst({
    where: { key: 'doctors' }
  }) || await prisma.department.findFirst();

  if (!departmentInput || !departmentInput.toString().trim()) {
    return defaultDept ? defaultDept.id : null;
  }

  const cleaned = departmentInput.toString().trim();

  const matched = await prisma.department.findFirst({
    where: {
      OR: [
        { id: cleaned },
        { key: cleaned },
        { nameAr: cleaned },
        { nameEn: cleaned },
        { nameAr: { contains: cleaned } }
      ]
    }
  });

  return matched ? matched.id : (defaultDept ? defaultDept.id : null);
}

/**
 * POST /api/admin/doctors
 * Add doctor & immediately encrypt phone with AES-256-GCM (NO email/user account created)
 */
router.post('/doctors', async (req, res) => {
  try {
    const { fullName, department, specialty, title, courses, whatsappNumber, avatarBase64 } = req.body;

    if (!fullName || !whatsappNumber) {
      return res.status(400).json({ error: 'الاسم الكامل ورقم الواتساب فقط هما الحقول الإجبارية' });
    }

    // Process avatar photo if provided
    let avatarUrl = null;
    if (avatarBase64) {
      try {
        const matches = avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const ext = matches[1].split('/')[1] || 'jpg';
          const cleanExt = ext.replace(/[^a-z0-9]/gi, '');
          const filename = `avatar_${Date.now()}_${Math.floor(Math.random() * 10000)}.${cleanExt || 'jpg'}`;
          const uploadsDir = path.join(__dirname, '../../public/uploads/avatars');
          await fs.mkdir(uploadsDir, { recursive: true });
          await fs.writeFile(path.join(uploadsDir, filename), buffer);
          avatarUrl = `/uploads/avatars/${filename}`;
        }
      } catch (err) {
        console.error('Error saving doctor avatar:', err);
      }
    }

    // Encrypt phone number using AES-256-GCM
    const encryptedPhone = encryptPhoneNumber(whatsappNumber.trim());

    // Resolve departmentId
    const departmentId = await resolveDepartmentId(department);

    const newDoctor = await prisma.doctor.create({
      data: {
        fullName: fullName.trim(),
        department: department ? department.trim() : null,
        departmentId: departmentId,
        specialty: specialty ? specialty.trim() : null,
        title: title ? title.trim() : null,
        courses: courses ? courses.trim() : null,
        avatarUrl: avatarUrl,
        whatsappNumberEnc: encryptedPhone,
        isActive: true
      }
    });

    return res.status(201).json({
      message: 'تمت إضافة الدكتور بنجاح وتشفير رقم الهاتف بـ AES-256',
      doctor: newDoctor
    });

  } catch (error) {
    console.error('Admin add doctor error:', error);
    return res.status(500).json({ error: 'فشل إضافة الدكتور' });
  }
});

/**
 * PUT /api/admin/doctors/:id
 * Edit doctor details & re-encrypt phone if updated
 */
router.put('/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, department, specialty, title, courses, whatsappNumber, avatarBase64 } = req.body;

    const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!existingDoctor) {
      return res.status(404).json({ error: 'الدكتور غير موجود' });
    }

    let avatarUrl = existingDoctor.avatarUrl;
    if (avatarBase64) {
      try {
        const matches = avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const ext = matches[1].split('/')[1] || 'jpg';
          const cleanExt = ext.replace(/[^a-z0-9]/gi, '');
          const filename = `avatar_${Date.now()}_${Math.floor(Math.random() * 10000)}.${cleanExt || 'jpg'}`;
          const uploadsDir = path.join(__dirname, '../../public/uploads/avatars');
          await fs.mkdir(uploadsDir, { recursive: true });
          await fs.writeFile(path.join(uploadsDir, filename), buffer);
          avatarUrl = `/uploads/avatars/${filename}`;
        }
      } catch (err) {
        console.error('Error saving doctor avatar:', err);
      }
    }

    let encryptedPhone = existingDoctor.whatsappNumberEnc;
    if (whatsappNumber && whatsappNumber.trim()) {
      encryptedPhone = encryptPhoneNumber(whatsappNumber.trim());
    }

    const newDeptStr = department !== undefined ? (department ? department.trim() : null) : existingDoctor.department;
    const departmentId = await resolveDepartmentId(newDeptStr);

    const updatedDoctor = await prisma.doctor.update({
      where: { id },
      data: {
        fullName: fullName ? fullName.trim() : existingDoctor.fullName,
        department: newDeptStr,
        departmentId: departmentId,
        specialty: specialty !== undefined ? (specialty ? specialty.trim() : null) : existingDoctor.specialty,
        title: title !== undefined ? (title ? title.trim() : null) : existingDoctor.title,
        courses: courses !== undefined ? (courses ? courses.trim() : null) : existingDoctor.courses,
        avatarUrl: avatarUrl,
        whatsappNumberEnc: encryptedPhone
      }
    });

    return res.json({
      message: 'تم تحديث بيانات الدكتور وتشفير الرقم بنجاح',
      doctor: updatedDoctor
    });
  } catch (error) {
    console.error('Admin update doctor error:', error);
    return res.status(500).json({ error: 'فشل تحديث بيانات الدكتور' });
  }
});

/**
 * PATCH /api/admin/doctors/:id/toggle-active
 * Toggle doctor isActive status
 */
router.patch('/doctors/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!existingDoctor) {
      return res.status(404).json({ error: 'الدكتور غير موجود' });
    }

    const updatedDoctor = await prisma.doctor.update({
      where: { id },
      data: { isActive: !existingDoctor.isActive }
    });

    return res.json({
      message: updatedDoctor.isActive ? 'تم تفعيل حساب الدكتور بنجاح' : 'تم تجميد/إلغاء تفعيل حساب الدكتور بنجاح',
      doctor: updatedDoctor
    });
  } catch (error) {
    console.error('Admin toggle doctor active error:', error);
    return res.status(500).json({ error: 'فشل تغيير حالة تفعيل الدكتور' });
  }
});

/**
 * DELETE /api/admin/doctors/:id
 * Delete doctor and associated messages/conversations
 */
router.delete('/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!existingDoctor) {
      return res.status(404).json({ error: 'الدكتور غير موجود' });
    }

    // Delete physical uploaded files for this doctor and their messages
    const messagesWithFiles = await prisma.message.findMany({
      where: { conversation: { doctorId: id } }
    });

    const fs = require('fs').promises;
    const path = require('path');
    const publicDir = path.join(__dirname, '../../public');

    if (existingDoctor.avatarUrl) {
      await fs.unlink(path.join(publicDir, existingDoctor.avatarUrl.replace(/^\//, ''))).catch(() => {});
    }

    for (const msg of messagesWithFiles) {
      if (msg.imageUrl) await fs.unlink(path.join(publicDir, msg.imageUrl.replace(/^\//, ''))).catch(() => {});
      if (msg.audioUrl) await fs.unlink(path.join(publicDir, msg.audioUrl.replace(/^\//, ''))).catch(() => {});
      if (msg.documentUrl) await fs.unlink(path.join(publicDir, msg.documentUrl.replace(/^\//, ''))).catch(() => {});
    }

    // SECURITY FIX: Use transaction to ensure atomic deletion
    await prisma.$transaction(async (tx) => {
      // First delete all messages in conversations with this doctor
      await tx.message.deleteMany({
        where: { conversation: { doctorId: id } }
      });

      // Then delete all conversations with this doctor
      await tx.conversation.deleteMany({
        where: { doctorId: id }
      });

      // Finally delete the doctor
      await tx.doctor.delete({
        where: { id }
      });
    });

    return res.json({ message: 'تم حذف الدكتور وكافة متعلقاته بنجاح' });
  } catch (error) {
    console.error('Admin delete doctor error:', error);
    return res.status(500).json({ error: 'فشل حذف الدكتور' });
  }
});

/**
 * GET /api/admin/doctors/export
 * Download CSV/Excel UTF-8 BOM of all doctors
 */
router.get('/doctors/export', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      orderBy: { createdAt: 'desc' }
    });

    let csv = '\uFEFFالاسم الكامل,المسمى الوظيفي,القسم,التخصص,المواد الدراسية,رقم الهاتف المشفر (المقنع),الحالة,تاريخ الإضافة\n';

    doctors.forEach(d => {
      const decrypted = decryptPhoneNumber(d.whatsappNumberEnc);
      const masked = decrypted ? `${decrypted.substring(0, 5)}****${decrypted.slice(-3)}` : 'غير مشفر';
      const status = d.isActive ? 'مفعل' : 'غير مفعل';
      const date = new Date(d.createdAt).toLocaleDateString('ar-EG');

      const cleanName = `"${(d.fullName || '').replace(/"/g, '""')}"`;
      const cleanTitle = `"${(d.title || '').replace(/"/g, '""')}"`;
      const cleanDept = `"${(d.department || '').replace(/"/g, '""')}"`;
      const cleanSpec = `"${(d.specialty || '').replace(/"/g, '""')}"`;
      const cleanCourses = `"${(d.courses || '').replace(/"/g, '""')}"`;

      csv += `${cleanName},${cleanTitle},${cleanDept},${cleanSpec},${cleanCourses},"${masked}","${status}","${date}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="doctors_export.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('Admin export doctors error:', error);
    return res.status(500).json({ error: 'فشل تصدير بيانات الدكاترة' });
  }
});

/**
 * POST /api/admin/doctors/import
 * Batch import doctors from Excel/CSV format with AES-256 encryption
 */
router.post('/doctors/import', async (req, res) => {
  try {
    const { doctorsList, csvText } = req.body;
    let itemsToImport = [];

    if (Array.isArray(doctorsList)) {
      itemsToImport = doctorsList;
    } else if (csvText && typeof csvText === 'string') {
      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
      lines.forEach((line, idx) => {
        if (idx === 0 && (line.includes('الاسم') || line.toLowerCase().includes('name'))) return;
        const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
        if (parts.length >= 2) {
          itemsToImport.push({
            fullName: parts[0],
            whatsappNumber: parts[1],
            department: parts[2] || null,
            specialty: parts[3] || null,
            title: parts[4] || null,
            courses: parts[5] || null
          });
        }
      });
    }

    if (!itemsToImport.length) {
      return res.status(400).json({ error: 'لم يتم العثور على بيانات صالحة للاستيراد' });
    }

    let addedCount = 0;
    for (const item of itemsToImport) {
      if (item.fullName && item.whatsappNumber) {
        const encryptedPhone = encryptPhoneNumber(item.whatsappNumber.trim());
        const departmentId = await resolveDepartmentId(item.department);
        await prisma.doctor.create({
          data: {
            fullName: item.fullName.trim(),
            department: item.department ? item.department.trim() : null,
            departmentId: departmentId,
            specialty: item.specialty ? item.specialty.trim() : null,
            title: item.title ? item.title.trim() : null,
            courses: item.courses ? item.courses.trim() : null,
            whatsappNumberEnc: encryptedPhone,
            isActive: true
          }
        });
        addedCount++;
      }
    }

    return res.json({
      message: `تم استيراد وتشفير بيانات ${addedCount} دكتور بنجاح!`,
      importedCount: addedCount
    });
  } catch (error) {
    console.error('Admin import doctors error:', error);
    return res.status(500).json({ error: 'فشل استيراد بيانات الدكاترة' });
  }
});

/**
 * GET /api/admin/conversations
 * Admin global overview of all conversations
 */
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        student: { select: { fullName: true, universityId: true, department: true } },
        doctor: true,
        messages: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = conversations.map(c => ({
      id: c.id,
      referenceCode: c.referenceCode,
      subject: c.subject,
      status: c.status,
      createdAt: c.createdAt,
      studentName: c.student.fullName,
      studentId: c.student.universityId,
      studentDept: c.student.department,
      doctorName: c.doctor.fullName,
      messagesCount: c.messages.length,
      lastMessage: c.messages[0] || null
    }));

    return res.json(result);
  } catch (error) {
    console.error('Admin conversations error:', error);
    return res.status(500).json({ error: 'خطأ في جلب المحادثات للأدمن' });
  }
});

/**
 * GET /api/admin/whatsapp/status
 * Get connection status, QR Code, and logs
 */
router.get('/whatsapp/status', (req, res) => {
  const status = getWhatsAppStatus();
  return res.json(status);
});

/**
 * POST /api/admin/whatsapp/reconnect
 */
router.post('/whatsapp/reconnect', async (req, res) => {
  try {
    await initWhatsApp();
    return res.json({ message: 'جاري إعادة الاتصال برقم واتساب...' });
  } catch (err) {
    return res.status(500).json({ error: 'فشل إعادة الاتصال' });
  }
});

/**
 * POST /api/admin/whatsapp/simulate
 * Simulates incoming doctor reply on WhatsApp for quick UI testing
 */
router.post('/whatsapp/simulate', async (req, res) => {
  try {
    const { doctorPhone, messageContent, quotedMessageId } = req.body;
    if (!doctorPhone || !messageContent) {
      return res.status(400).json({ error: 'رقم الدكتور ونص الرسالة حقول إجبارية' });
    }

    await simulateDoctorReply({ doctorPhone, messageContent, quotedMessageId });
    return res.json({ message: 'تم إرسال الرد التجريبي بنجاح إلى النظام والمطابقة جارية!' });
  } catch (error) {
    console.error('Simulate error:', error);
    return res.status(500).json({ error: 'فشل المحاكاة' });
  }
});

/**
 * POST /api/admin/whatsapp/disconnect
 * Disconnect current WhatsApp session & generate new QR code for another phone number
 */
router.post('/whatsapp/disconnect', async (req, res) => {
  try {
    const result = await disconnectWhatsAppSession();
    return res.json(result);
  } catch (error) {
    console.error('Disconnect error:', error);
    return res.status(500).json({ error: 'فشل قطع الاتصال بالواتساب' });
  }
});

/**
 * POST /api/admin/whatsapp/send-student-test
 * Send a test student question directly to any custom Doctor WhatsApp phone number
 * SECURITY FIX: Use separate test database or add _TEST flag to prevent pollution
 */
router.post('/whatsapp/send-student-test', async (req, res) => {
  try {
    const { doctorPhone, doctorId, studentName, universityId, department, subject, questionContent } = req.body;
    if ((!doctorPhone && !doctorId) || !questionContent) {
      return res.status(400).json({ error: 'رقم هاتف الدكتور ونص الرسالة حقول إجبارية' });
    }

    const { normalizePhoneNumber } = require('../services/cryptoService');

    let doctor;
    if (doctorId) {
      doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    }

    if (!doctor && doctorPhone) {
      const cleanInput = doctorPhone.trim();
      const allDocs = await prisma.doctor.findMany({ where: { isActive: true } });
      doctor = allDocs.find(d => {
        const dec = decryptPhoneNumber(d.whatsappNumberEnc);
        return dec && normalizePhoneNumber(dec) === normalizePhoneNumber(cleanInput);
      });

      // Only create test doctor if it doesn't exist - mark it clearly as TEST
      if (!doctor) {
        doctor = await prisma.doctor.create({
          data: {
            fullName: `[TEST] دكتور تجريبي (${cleanInput.substring(0, 6)})`,
            whatsappNumberEnc: encryptPhoneNumber(cleanInput),
            department: '[TEST] محاكي مباشر',
            specialty: 'اختبار رسائل المنصة',
            isActive: false // Inactive so it doesn't show in student list
          }
        });
      }
    }

    if (!doctor) {
      return res.status(404).json({ error: 'تعذر تحديد الدكتور أو رقم الهاتف' });
    }

    // SECURITY FIX: Reuse existing test student or find by email pattern
    const testEmail = `test_student_${req.user.id}@test.edu.eg`; // Link to admin who created it
    let student = await prisma.user.findUnique({ where: { email: testEmail } });

    if (!student) {
      const hashedPass = await bcrypt.hash('test123', 10);
      student = await prisma.user.create({
        data: {
          role: 'student',
          fullName: studentName ? `[TEST] ${studentName.trim()}` : '[TEST] طالب تجريبي',
          email: testEmail,
          universityId: universityId ? universityId.trim() : 'TEST-99999',
          department: department ? department.trim() : '[TEST] تكنولوجيا المعلومات',
          password: hashedPass
        }
      });
    }

    // Generate unique reference code using timestamp for better uniqueness
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(100 + Math.random() * 900);
    const referenceCode = `TEST-${timestamp}${randomNum}`;

    // Create Conversation
    const conversation = await prisma.conversation.create({
      data: {
        studentId: student.id,
        doctorId: doctor.id,
        subject: subject ? `[TEST] ${subject.trim()}` : '[TEST] استفسار تجريبي',
        referenceCode: referenceCode,
        status: 'open'
      }
    });

    // Dispatch real WhatsApp message to Doctor
    const initialMessage = await sendStudentQuestionToWhatsApp(
      conversation,
      student,
      doctor,
      questionContent.trim()
    );

    return res.json({
      message: `تم إرسال الرسالة التجريبية بنجاح إلى واتساب (${doctor.fullName})!`,
      referenceCode: conversation.referenceCode,
      conversation,
      initialMessage,
      note: 'هذه رسالة تجريبية - يمكن حذف البيانات التجريبية من لوحة التحكم'
    });
  } catch (error) {
    console.error('Send student test error:', error);
    return res.status(500).json({ error: error.message || 'فشل إرسال رسالة الطالب التجريبية' });
  }
});

/**
 * GET /api/admin/system/diagnostics
 * Developer System Error & Diagnostic Log API
 */
router.get('/system/diagnostics', async (req, res) => {
  try {
    const waStatus = getWhatsAppStatus();

    // Known System Error Codes Catalogue
    const errorCatalog = [
      {
        code: 'ERR_WA_NOT_CONNECTED',
        numericCode: 596,
        severity: 'HIGH',
        title: 'جلسة الواتساب غير متصلة (خطأ #596)',
        titleEn: 'WhatsApp Session Disconnected (#596)',
        cause: 'لم يتم قراءة رمز QR كود من الهاتف أو انقطع اتصال الجلسة',
        solution: 'توجه إلى تبويب (ربط سيرفر التواصل) وافتح تطبيق الواتساب على هاتفك واعمل Scan للـ QR'
      },
      {
        code: 'ERR_DOCTOR_NO_PHONE',
        numericCode: 597,
        severity: 'HIGH',
        title: 'رقم الدكتور غير متوفر أو غير مائل للاستخدام',
        titleEn: 'Doctor Phone Invalid / Missing',
        cause: 'رقم هاتف الدكتور المسجل في قاعدة البيانات فارغ أو صيغته خاطئة',
        solution: 'افتح إدارة أرقام الدكاترة وعدل رقم هاتف الدكتور لتعديله بصيغة محلي أو دولي صحيحة'
      },
      {
        code: 'ERR_DECRYPT_FAIL',
        numericCode: 2003,
        severity: 'CRITICAL',
        title: 'فشل فك تشفير مفتاح AES-256',
        titleEn: 'AES Decryption Failed',
        cause: 'تغير مفتاح التشفير المحفوظ في ملف البيئة .env',
        solution: 'تأكد من قيمة ENCRYPTION_KEY في ملف .env بالخادم الخلفي'
      },
      {
        code: 'ERR_BAILEYS_LOGGED_OUT',
        numericCode: 2004,
        severity: 'HIGH',
        title: 'تم إلغاء اقتران الهاتف من تطبيق الواتساب',
        titleEn: 'Session Logged Out from WhatsApp App',
        cause: 'تم اختيار خروج من الجهاز المرتبط داخل تطبيق الواتساب بالهاتف',
        solution: 'قم بإعادة توليد رمز QR جديد من لوحة التحكم وقراءته مجدداً'
      },
      {
        code: 'ERR_RATE_LIMIT_EXCEEDED',
        numericCode: 2005,
        severity: 'MEDIUM',
        title: 'تجاوز حد الإرسال المسموح به',
        titleEn: 'Rate Limit Threshold Reached',
        cause: 'قام الطالب بإرسال أكثر من 100 استفسار خلال ساعة واحدة',
        solution: 'الانتظار لمدة ساعة أو رفع حد الإرسال من الإعدادات'
      },
      {
        code: 'ERR_QUEUE_COOLDOWN',
        numericCode: 2006,
        severity: 'INFO',
        title: 'طابور الإرسال في فترة استراحة أمان (Cooldown)',
        titleEn: 'Smart Queue Cooldown Active',
        cause: 'تم إرسال 60 رسالة متتالية والنظام في فترة راحة 5 دقائق لحماية الرقم من الحظر',
        solution: 'سيتم استئناف الإرسال تلقائياً فور انتهاء العد التنازلي'
      }
    ];

    // Fetch recent local conversations with pending status
    const recentPendingConvs = await prisma.conversation.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { fullName: true, email: true } },
        doctor: { select: { fullName: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } }
      }
    });

    const memoryUsage = process.memoryUsage();

    return res.json({
      timestamp: new Date().toISOString(),
      server: {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryHeapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        memoryHeapTotalMB: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
        env: process.env.NODE_ENV || 'development'
      },
      whatsapp: {
        status: waStatus.status,
        isConnected: waStatus.status === 'connected',
        logs: waStatus.logs || [],
        queue: waStatus.queue || {}
      },
      errorCatalog,
      recentPendingConvs
    });

  } catch (error) {
    console.error('Diagnostics API error:', error);
    return res.status(500).json({ error: 'فشل جلب تشخيصات النظام' });
  }
});

module.exports = router;
