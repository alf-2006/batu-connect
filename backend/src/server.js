const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { initSocket } = require('./services/socketService');
const { initWhatsApp } = require('./services/whatsappService');
const { encryptPhoneNumber } = require('./services/cryptoService');
const prisma = require('./lib/prisma');

const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const pushRoutes = require('./routes/pushRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

const path = require('path');

// Security Headers Middleware
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/push', pushRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Prevent process crashes from background library errors (e.g. Baileys Bad MAC session errors)
process.on('uncaughtException', (err) => {
  console.error('Captured Uncaught Exception:', err.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Captured Unhandled Rejection:', reason);
});

// Global Error Handler Middleware (prevents leaking internal stack traces)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'حدث خطأ في الخادم، يرجى المحاولة لاحقاً' });
});

// Initialize Socket.io
initSocket(io);

/**
 * Seed initial system data (Admin + Demo Doctors)
 */
async function seedDefaultData() {
  try {
    // Admin check
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@it-dept.edu.eg' }
    });

    if (!adminUser) {
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          role: 'admin',
          fullName: 'مدير النظام (قسم تكنولوجيا المعلومات)',
          email: 'admin@it-dept.edu.eg',
          universityId: 'ADM-001',
          department: 'إدارة قسم IT',
          password: hashedAdminPassword
        }
      });
      console.log('[تم الانشاء] تم إنشاء حساب الأدمن الافتراضي: admin@it-dept.edu.eg');
    }

    // Seed Sample Doctors if empty
    const docCount = await prisma.doctor.count();
    if (docCount === 0) {
      const sampleDoctors = [
        {
          fullName: 'د. محمد أحمد عبد الرحمن',
          email: 'm.abdelrahman@it-dept.edu.eg',
          department: 'تكنولوجيا المعلومات',
          specialty: 'هندسة البرمجيات والتطوير',
          phone: '+201012345678'
        },
        {
          fullName: 'د. سارة محمود مصطفى',
          email: 's.mostafa@it-dept.edu.eg',
          department: 'علوم الحاسب',
          specialty: 'الذكاء الاصطناعي وتعلم الآلة',
          phone: '+201098765432'
        },
        {
          fullName: 'د. خالد إبراهيم حسن',
          email: 'k.hassan@it-dept.edu.eg',
          department: 'شبكات الحاسب',
          specialty: 'الأمن السيبراني والشبكات',
          phone: '+201122334455'
        }
      ];

      for (const d of sampleDoctors) {
        await prisma.doctor.create({
          data: {
            fullName: d.fullName,
            department: d.department,
            specialty: d.specialty,
            courses: 'مشروع التخرج, خوارزميات البرمجة',
            whatsappNumberEnc: encryptPhoneNumber(d.phone),
            isActive: true
          }
        });
      }
      console.log('[تم الإضافة] تم إضافة دكاترة تجريبيين وتشفير أرقام هواتفهم بـ AES-256 بنجاح');
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`[Backend API] Server running on http://localhost:${PORT}`);
  
  // Seed Database
  await seedDefaultData();

  // Initialize Baileys WhatsApp Engine in background
  initWhatsApp().catch(err => console.error('Baileys init error:', err));
});
