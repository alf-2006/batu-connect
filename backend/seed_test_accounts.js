const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Student Account
  await prisma.user.upsert({
    where: { email: 'student@batu.edu.eg' },
    update: { password: hashedPassword, role: 'student' },
    create: {
      role: 'student',
      fullName: 'أحمد علي الكومي',
      email: 'student@batu.edu.eg',
      universityId: '202410882',
      department: 'تكنولوجيا المعلومات',
      password: hashedPassword
    }
  });

  // Admin Account
  await prisma.user.upsert({
    where: { email: 'admin@batu.edu.eg' },
    update: { password: hashedPassword, role: 'admin' },
    create: {
      role: 'admin',
      fullName: 'مدير النظام',
      email: 'admin@batu.edu.eg',
      universityId: 'ADM-001',
      department: 'إدارة قسم IT',
      password: hashedPassword
    }
  });

  console.log('SUCCESS: Accounts created/updated with password: 123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
