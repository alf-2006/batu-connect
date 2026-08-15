const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding departments...');

  const defaultDepts = [
    {
      key: 'doctors',
      nameAr: 'الدكاترة',
      nameEn: 'Professors & Lecturers',
      icon: 'graduation-cap',
      colorToken: 'teal',
      displayOrder: 1
    },
    {
      key: 'ta',
      nameAr: 'المعيدين',
      nameEn: 'Teaching Assistants',
      icon: 'users',
      colorToken: 'blue',
      displayOrder: 2
    },
    {
      key: 'student_affairs',
      nameAr: 'شؤون الطلبة',
      nameEn: 'Student Affairs',
      icon: 'building',
      colorToken: 'orange',
      displayOrder: 3
    },
    {
      key: 'admin_staff',
      nameAr: 'الإدارة',
      nameEn: 'Platform Administration',
      icon: 'shield',
      colorToken: 'purple',
      displayOrder: 4
    }
  ];

  for (const deptData of defaultDepts) {
    await prisma.department.upsert({
      where: { key: deptData.key },
      update: deptData,
      create: deptData
    });
  }

  const doctorsDept = await prisma.department.findUnique({ where: { key: 'doctors' } });

  if (doctorsDept) {
    await prisma.doctor.updateMany({
      where: { departmentId: null },
      data: { departmentId: doctorsDept.id }
    });
  }

  console.log('Departments seeded successfully!');
}

seed()
  .catch((err) => console.error('Seeding error:', err))
  .finally(() => prisma.$disconnect());
