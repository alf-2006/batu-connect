const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.department.updateMany({
    where: { key: 'ta' },
    data: { nameAr: 'المعيدين' }
  });

  await prisma.department.updateMany({
    where: { key: 'admin_staff' },
    data: { nameAr: 'الإدارة' }
  });

  const depts = await prisma.department.findMany();
  console.log('UPDATED DEPARTMENTS IN DB:', depts);
}

main().finally(() => prisma.$disconnect());
