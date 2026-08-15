const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * GET /api/departments
 * Public/Student route to fetch active departments with staff counters
 */
router.get('/', async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { doctors: { where: { isActive: true } } }
        }
      }
    });

    const result = departments.map((dept) => ({
      id: dept.id,
      key: dept.key,
      nameAr: dept.nameAr,
      nameEn: dept.nameEn,
      icon: dept.icon,
      colorToken: dept.colorToken,
      displayOrder: dept.displayOrder,
      memberCount: dept._count.doctors
    }));

    return res.json(result);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return res.status(500).json({ error: 'فشل جلب الأقسام الأكاديمية' });
  }
});

module.exports = router;
