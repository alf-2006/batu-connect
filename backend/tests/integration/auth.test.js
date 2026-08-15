// Mock Prisma
const mockPrisma = require('jest-mock-extended').mockDeep();
jest.mock('../../src/lib/prisma', () => mockPrisma);

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

process.env.JWT_SECRET = 'test_secret_for_jest';
const authRoutes = require('../../src/routes/authRoutes');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/student-quick should return httpOnly cookie', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user_1',
      role: 'student',
      email: 'test@batu.edu.eg',
      fullName: 'Test Student'
    });

    const res = await request(app)
      .post('/api/auth/student-quick')
      .send({
        fullName: 'Test Student',
        email: 'test@batu.edu.eg'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'تم تسجيل الدخول بنجاح');
    
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toMatch(/token=.*;/);
    expect(setCookie[0]).toMatch(/HttpOnly/);
  });

  test('POST /api/auth/logout clears token cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send();

    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie[0]).toMatch(/token=;/); // Cleared cookie
  });
});
