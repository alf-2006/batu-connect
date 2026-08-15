const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiting map for IP brute-force protection
const authAttempts = new Map();

function rateLimitAuth(maxAttempts = 15, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const record = authAttempts.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
    } else {
      record.count += 1;
    }

    authAttempts.set(ip, record);

    if (record.count > maxAttempts) {
      return res.status(429).json({ error: 'تم تجاوز عدد محاولات الدخول المسموح بها. يرجى الانتظار قليلاً.' });
    }

    next();
  };
}

/**
 * Quick Student Auth / Registration (MVP experience)
 * Takes email or universityId, fullName, department
 */
router.post('/student-quick', rateLimitAuth(20), async (req, res) => {
  try {
    const { fullName, email, universityId, department } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: 'يرجى إدخال الاسم الكامل والبريد الإلكتروني' });
    }

    const cleanEmail = email.trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (user) {
      if (user.role === 'admin') {
        return res.status(403).json({ error: 'لا يمكن استخدام الدخول السريع لحساب المسئول، يرجى تسجيل الدخول من صفحة الدخول الرسمية' });
      }
    } else {
      // SECURITY FIX: Generate unique random password per user instead of shared default
      const crypto = require('crypto');
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          role: 'student',
          fullName: fullName.trim(),
          email: cleanEmail,
          universityId: universityId ? universityId.trim() : `STD-${Math.floor(100000 + Math.random() * 900000)}`,
          department: department ? department.trim() : 'تكنولوجيا المعلومات',
          password: hashedPassword
        }
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        universityId: user.universityId,
        department: user.department
      }
    });

  } catch (error) {
    console.error('Quick auth error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

/**
 * Student Registration (Sign Up) with Email & Password
 */
router.post('/register', rateLimitAuth(10), async (req, res) => {
  try {
    const { fullName, email, password, universityId, department } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'الاسم الكامل، البريد الإلكتروني، وكلمة المرور حقول إجبارية' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن لا تقل عن 6 أحرف' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        role: 'student',
        fullName: fullName.trim(),
        email: cleanEmail,
        universityId: universityId ? universityId.trim() : `STD-${Math.floor(100000 + Math.random() * 900000)}`,
        department: department ? department.trim() : 'تكنولوجيا المعلومات',
        password: hashedPassword
      }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'تم إنشاء الحساب وتناول الدخول بنجاح',
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        universityId: user.universityId,
        department: user.department
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب' });
  }
});

/**
 * Standard Admin / Doctor / Student Login
 */
router.post('/login', rateLimitAuth(10), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'يرجى تقديم البريد الإلكتروني وكلمة المرور' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'تم تعطيل هذا الحساب من قبل مدير النظام' });
    }

    // Auto-promote first active admin to Super Admin if none exists yet
    if (user.role === 'admin' && !user.isSuperAdmin) {
      const superAdminCount = await prisma.user.count({
        where: { role: 'admin', isSuperAdmin: true }
      });
      if (superAdminCount === 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { isSuperAdmin: true }
        });
      }
    }

    // Record last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    }).catch(() => {});

    let perms = [];
    try {
      perms = JSON.parse(user.permissions || '[]');
    } catch (e) {
      perms = [];
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        fullName: user.fullName,
        isSuperAdmin: Boolean(user.isSuperAdmin),
        permissions: perms
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        universityId: user.universityId,
        department: user.department,
        isSuperAdmin: Boolean(user.isSuperAdmin),
        permissions: perms,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;
