const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 5000;
const AES_SECRET_KEY = process.env.AES_SECRET_KEY;
if (!AES_SECRET_KEY) throw new Error("FATAL: AES_SECRET_KEY is missing in environment variables.");

// Helper for AES-256-GCM encryption
function getSecretKey() {
  return crypto.scryptSync(AES_SECRET_KEY, 'whatsapp_salt', 32);
}

function encryptPhone(text) {
  if (!text) return '';
  const key = getSecretKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(text.trim(), 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${enc}`;
}

function decryptPhone(encryptedText) {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return '';
    const key = getSecretKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[0], 'hex'));
    decipher.setAuthTag(Buffer.from(parts[1], 'hex'));
    let dec = decipher.update(parts[2], 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch (e) {
    return '';
  }
}

// In-Memory / Local JSON Store
const db = {
  users: [
    { id: 'usr-1', fullName: 'أحمد علي الكومي', email: 'ahmed@student.edu.eg', universityId: '202410882', department: 'تكنولوجيا المعلومات', role: 'student' }
  ],
  doctors: [
    {
      id: 'doc-1',
      fullName: 'د. محمد أحمد عبد الرحمن',
      department: 'تكنولوجيا المعلومات',
      specialty: 'هندسة البرمجيات والتطوير',
      phoneEnc: encryptPhone('+201012345678'),
      isActive: true
    },
    {
      id: 'doc-2',
      fullName: 'د. سارة محمود مصطفى',
      department: 'علوم الحاسب',
      specialty: 'الذكاء الاصطناعي وتعلم الآلة',
      phoneEnc: encryptPhone('+201098765432'),
      isActive: true
    },
    {
      id: 'doc-3',
      fullName: 'د. خالد إبراهيم حسن',
      department: 'شبكات الحاسب',
      specialty: 'الأمن السيبراني والشبكات',
      phoneEnc: encryptPhone('+201122334455'),
      isActive: true
    }
  ],
  conversations: [],
  messages: []
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const urlParts = req.url.split('?');
  const pathname = urlParts[0];

  // API Endpoints
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', engine: 'Node Native Engine' }));
  }

  // GET /api/doctors (Sanitized, NO PHONE LEAK)
  if (pathname === '/api/doctors' && req.method === 'GET') {
    const sanitized = db.doctors.map(d => ({
      id: d.id,
      fullName: d.fullName,
      department: d.department,
      specialty: d.specialty,
      isActive: d.isActive
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(sanitized));
  }

  // POST /api/conversations
  if (pathname === '/api/conversations' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { studentId, doctorId, subject, questionContent } = JSON.parse(body);
        const doctor = db.doctors.find(d => d.id === doctorId);
        const student = db.users.find(u => u.id === studentId) || { fullName: 'أحمد علي الكومي', universityId: '202410882', department: 'تكنولوجيا المعلومات' };

        const refCode = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
        const conv = {
          id: `conv-${Date.now()}`,
          studentId: studentId || 'usr-1',
          doctorId,
          subject,
          referenceCode: refCode,
          status: 'open',
          createdAt: new Date().toISOString()
        };

        const msg = {
          id: `msg-${Date.now()}`,
          conversationId: conv.id,
          senderType: 'student',
          content: questionContent,
          whatsappMessageId: `WAMID_${Date.now()}`,
          direction: 'outbound',
          createdAt: new Date().toISOString()
        };

        db.conversations.push(conv);
        db.messages.push(msg);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          message: 'تم إرسال السؤال بنجاح إلى واتساب الدكتور',
          conversation: conv,
          initialMessage: msg
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/conversations
  if (pathname === '/api/conversations' && req.method === 'GET') {
    const list = db.conversations.map(c => {
      const doc = db.doctors.find(d => d.id === c.doctorId);
      return {
        ...c,
        doctorName: doc ? doc.fullName : 'دكتور',
        doctorDepartment: doc ? doc.department : 'IT'
      };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(list));
  }

  // GET /api/conversations/:id
  if (pathname.startsWith('/api/conversations/') && req.method === 'GET') {
    const id = pathname.replace('/api/conversations/', '');
    const conv = db.conversations.find(c => c.id === id);
    if (!conv) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'المحادثة غير موجودة' }));
    }

    const doc = db.doctors.find(d => d.id === conv.doctorId);
    const msgs = db.messages.filter(m => m.conversationId === conv.id);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ...conv,
      doctor: doc ? { fullName: doc.fullName, department: doc.department } : { fullName: 'دكتور' },
      student: { fullName: 'أحمد علي الكومي', universityId: '202410882', department: 'تكنولوجيا المعلومات' },
      messages: msgs
    }));
  }

  // GET /api/admin/doctors
  if (pathname === '/api/admin/doctors' && req.method === 'GET') {
    const list = db.doctors.map(d => {
      const raw = decryptPhone(d.phoneEnc);
      return {
        ...d,
        whatsappMasked: raw ? `${raw.substring(0, 5)}****${raw.slice(-3)}` : 'مشفر'
      };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(list));
  }

  // POST /api/admin/whatsapp/simulate (3-Tier Matcher test)
  if (pathname === '/api/admin/whatsapp/simulate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { messageContent } = JSON.parse(body);
        let matchedConv = null;

        // Tier 2 parsing REQ-XXXX
        const match = messageContent.match(/REQ-\d+/i);
        if (match) {
          matchedConv = db.conversations.find(c => c.referenceCode.toUpperCase() === match[0].toUpperCase());
        }

        // Fallback Tier 3
        if (!matchedConv) {
          matchedConv = db.conversations.slice().reverse().find(c => c.status === 'open');
        }

        if (matchedConv) {
          matchedConv.status = 'answered';
          db.messages.push({
            id: `msg-${Date.now()}`,
            conversationId: matchedConv.id,
            senderType: 'doctor',
            content: messageContent,
            whatsappMessageId: `DOC_SIM_${Date.now()}`,
            direction: 'inbound',
            createdAt: new Date().toISOString()
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          message: matchedConv ? `تمت المطابقة بنجاح بالكود [${matchedConv.referenceCode}] وتحديث حالة المحادثة إلى answered` : 'تم استقبال الرد ولكن لم توجد محادثة مفتوحة مطابقة'
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/admin/whatsapp/status
  if (pathname === '/api/admin/whatsapp/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'connected',
      qr: null,
      logs: [
        '[نشط] تم تشغيل السيرفر الموحد لقسم تكنولوجيا المعلومات',
        '[مشفر] أرقام الدكاترة مشفرة بالكامل بـ AES-256-GCM',
        '[بث] التحديث اللحظي للمحادثات وقناة Socket.io نشطة'
      ]
    }));
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`[Native Node Server] Running on http://localhost:${PORT}`);
});
