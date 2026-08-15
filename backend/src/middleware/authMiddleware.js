const jwt = require('jsonwebtoken');

// SECURITY: Throw error if JWT_SECRET is not set - no default fallback
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify JWT token and attach user to request
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (req.cookies && req.cookies.token) || (authHeader && authHeader.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول للوصول إلى هذا المورد' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'الجلسة منتهية أو غير صالحة، يرجى تسجيل الدخول مجدداً' });
  }
}

/**
 * Middleware to verify user is Admin
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'هذا المورد متاح للمسؤولين فقط' });
  }

  next();
}

/**
 * Middleware to verify user is Student
 */
function requireStudent(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'هذا المورد متاح للطلاب فقط' });
  }

  next();
}

/**
 * Verify conversation ownership (student can only access their own conversations)
 */
async function verifyConversationOwnership(req, res, next) {
  const prisma = require('../lib/prisma');
  const conversationId = req.params.id || req.body.conversationId;

  if (!conversationId) {
    return res.status(400).json({ error: 'معرف المحادثة مطلوب' });
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'المحادثة غير موجودة' });
    }

    // Admin can access all conversations
    if (req.user.role === 'admin') {
      req.conversation = conversation;
      return next();
    }

    // Student can only access their own conversations
    if (req.user.role === 'student' && conversation.studentId !== req.user.id) {
      return res.status(403).json({ error: 'ليس لديك صلاحية للوصول إلى هذه المحادثة' });
    }

    req.conversation = conversation;
    next();
  } catch (error) {
    console.error('Error verifying conversation ownership:', error);
    return res.status(500).json({ error: 'خطأ في التحقق من الصلاحيات' });
  }
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireStudent,
  verifyConversationOwnership,
  JWT_SECRET
};
