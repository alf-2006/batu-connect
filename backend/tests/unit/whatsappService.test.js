const { mockDeep } = require('jest-mock-extended');

const mockPrisma = mockDeep();
jest.mock('../../src/lib/prisma', () => mockPrisma);

// Must mock pushService before importing whatsappService to avoid missing secrets error
jest.mock('../../src/services/pushService', () => ({
  sendNotificationToUser: jest.fn().mockResolvedValue({})
}));

// Set env vars
process.env.AES_SECRET_KEY = 'test_aes_key_1234567890123456789012';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345678901234567890';

const { sendStudentQuestionToWhatsApp, getWhatsAppStatus } = require('../../src/services/whatsappService');

describe('WhatsApp Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should queue message if status is connected', async () => {
    const conv = { id: 'conv_1', referenceCode: 'REF123' };
    const student = { id: 's_1' };
    const doctor = { id: 'd_1' };

    mockPrisma.message.create.mockResolvedValue({
      id: 'msg_1',
      status: 'local_only',
      content: 'test question'
    });

    const result = await sendStudentQuestionToWhatsApp(conv, student, doctor, 'test question');
    
    expect(mockPrisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: 'test question',
        direction: 'outbound'
      })
    });
    
    expect(result.id).toBe('msg_1');
  });

  test('getWhatsAppStatus returns expected structure', () => {
    const status = getWhatsAppStatus();
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('queue');
    expect(status.queue).toHaveProperty('pendingCount');
  });
});
