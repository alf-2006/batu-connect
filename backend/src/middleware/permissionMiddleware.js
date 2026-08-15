const prisma = require('../lib/prisma');

/**
 * Middleware to check granular admin permissions against live DB state
 * (Guarantees permission revocation takes effect instantly without waiting for JWT expiry)
 */
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح لك بالوصول لهذا الإجراء' });
      }

      // Fetch fresh admin status from database
      const admin = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!admin || admin.role !== 'admin' || admin.isActive === false) {
        return res.status(401).json({ error: 'حساب المشرف غير موجود أو تم تعطيله' });
      }

      // Super Admin has unrestricted access to all endpoints
      if (admin.isSuperAdmin) {
        req.adminObj = admin;
        return next();
      }

      let perms = [];
      try {
        perms = JSON.parse(admin.permissions || '[]');
      } catch (e) {
        perms = [];
      }

      if (!perms.includes(permissionKey)) {
        return res.status(403).json({ error: `عذراً، ليس لديك صلاحية الوصول لإجراء (${permissionKey})` });
      }

      req.adminObj = admin;
      next();
    } catch (err) {
      console.error('Permission middleware error:', err);
      return res.status(500).json({ error: 'خطأ في التحقق من الصلاحيات' });
    }
  };
}

/**
 * Middleware restricted exclusively to Super Admin
 */
async function requireSuperAdmin(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'هذا الإجراء متاح للمدير الرئيسي الفائق فقط' });
    }

    const admin = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!admin || !admin.isSuperAdmin || admin.isActive === false) {
      return res.status(403).json({ error: 'هذا الإجراء متاح للمدير الرئيسي الفائق فقط (Super Admin)' });
    }

    req.adminObj = admin;
    next();
  } catch (err) {
    console.error('SuperAdmin middleware error:', err);
    return res.status(500).json({ error: 'خطأ في التحقق من مستوى الإشراف' });
  }
}

module.exports = {
  requirePermission,
  requireSuperAdmin
};
