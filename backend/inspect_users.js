const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { role: 'admin' },
    data: { isSuperAdmin: true }
  });
  const users = await prisma.user.findMany({ where: { role: 'admin' } });
  console.log('UPDATED ADMIN USERS:', users);
}

main().finally(() => prisma.$disconnect());
