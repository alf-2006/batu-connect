const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * GET /api/doctors
 * Endpoint for students to view active staff members by department & search query.
 * SECURITY STRICT RULE: Never leak doctor's encrypted or raw phone number!
 */
router.get('/', async (req, res) => {
  try {
    const { departmentKey, search, studentId } = req.query;

    const whereCondition = {
      isActive: true,
      NOT: [
        { fullName: { contains: 'دكتور الرمز' } },
        { fullName: { contains: '[TEST]' } }
      ]
    };

    if (departmentKey && departmentKey !== 'all') {
      const dept = await prisma.department.findUnique({
        where: { key: departmentKey }
      });
      if (dept) {
        if (departmentKey === 'doctors') {
          whereCondition.OR = [
            { departmentId: dept.id },
            { departmentId: null }
          ];
        } else {
          whereCondition.OR = [
            { departmentId: dept.id },
            { department: { contains: dept.nameAr } }
          ];
        }
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereCondition.OR = [
        { fullName: { contains: q } },
        { specialty: { contains: q } },
        { department: { contains: q } },
        { courses: { contains: q } }
      ];
    }

    const doctors = await prisma.doctor.findMany({
      where: whereCondition,
      include: {
        departmentRef: {
          select: { key: true, nameAr: true, colorToken: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // If studentId is provided, calculate unread message counts for each staff member
    let studentConversations = [];
    if (studentId) {
      studentConversations = await prisma.conversation.findMany({
        where: { studentId },
        include: {
          messages: {
            where: { senderType: 'doctor' },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
    }

    const sanitizedDoctors = doctors.map((doc) => {
      const studentConv = studentConversations.find((c) => c.doctorId === doc.id);
      const lastMsg = studentConv?.messages?.[0];

      return {
        id: doc.id,
        fullName: doc.fullName,
        department: doc.department || doc.departmentRef?.nameAr || 'غير محدد',
        specialty: doc.specialty || null,
        title: doc.title || null,
        courses: doc.courses ? doc.courses.split(',').map((c) => c.trim()).filter(Boolean) : [],
        avatarUrl: doc.avatarUrl || null,
        officeLocation: doc.officeLocation || null,
        bio: doc.bio || null,
        lastSeenAt: doc.lastSeenAt || doc.createdAt,
        isActive: doc.isActive,
        departmentKey: doc.departmentRef?.key || 'doctors',
        departmentColor: doc.departmentRef?.colorToken || 'teal',
        conversationId: studentConv?.id || null,
        unreadCount: studentConv?.status === 'answered' ? 1 : 0,
        lastMessageAt: lastMsg?.createdAt || studentConv?.createdAt || null
      };
    });

    return res.json(sanitizedDoctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return res.status(500).json({ error: 'تعذر جلب قائمة الدكاترة والكادر الأكاديمي' });
  }
});

module.exports = router;
