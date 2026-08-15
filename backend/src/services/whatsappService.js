const { decryptPhoneNumber, normalizePhoneNumber, formatWhatsAppJid } = require('./cryptoService');
const { notifyNewMessage, notifyWhatsAppStatus } = require('./socketService');
const prisma = require('../lib/prisma');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

let sock = null;
let qrCodeDataUrl = null;
let connectionStatus = 'disconnected'; // 'connecting', 'connected', 'disconnected', 'qr_ready'
let connectionLogs = [];
let ffmpegAvailable = false;

// -------------------------------------------------------------
// Database-Backed Smart Message Queue & Rate Limiting Engine Config
// -------------------------------------------------------------
const MAX_RETRIES = 5;

// -------------------------------------------------------------
// Database-Backed Smart Message Queue & Rate Limiting Engine Config
// -------------------------------------------------------------
const RATE_LIMIT_PER_DOCTOR = 10;           // Max messages per doctor per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000;    // 1 minute window
const MIN_DELAY_MS = 2000;                 // Minimum delay (2s)
const MAX_DELAY_MS = 4000;                 // Maximum delay (4s)

const doctorRateLimits = new Map();
let isQueueProcessing = false;
let pendingQueueCount = 0;
let queuePollingInterval = null;

function logEvent(msg) {
  const timestamp = new Date().toLocaleTimeString('ar-EG');
  const entry = `[${timestamp}] ${msg}`;
  console.log(entry);
  connectionLogs.unshift(entry);
  if (connectionLogs.length > 50) connectionLogs.pop();
}

function getQueueMetrics() {
  return {
    pendingCount: pendingQueueCount,
    rateLimitPerMinute: RATE_LIMIT_PER_DOCTOR,
    isCoolingDown: false,
    cooldownUntil: null
  };
}

function emitStatusUpdate() {
  notifyWhatsAppStatus({
    status: connectionStatus,
    qr: qrCodeDataUrl,
    logs: connectionLogs,
    queue: getQueueMetrics()
  });
}

const { exec } = require('child_process');

/**
 * Check if ffmpeg is available on the system
 */
function checkFFmpegAvailability() {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (error) => {
      if (error) {
        logEvent('[تحذير] ffmpeg غير مثبت - لن يتم دعم تحويل الملفات الصوتية إلى OGG');
        resolve(false);
      } else {
        logEvent('[تم] ffmpeg متاح - سيتم تحويل الملفات الصوتية تلقائياً');
        resolve(true);
      }
    });
  });
}

function convertAudioToOggOpus(inputPath) {
  return new Promise((resolve) => {
    // If ffmpeg is not available, return original file
    if (!ffmpegAvailable) {
      logEvent(`[تنبيه الصوت] ffmpeg غير متاح، سيتم إرسال الملف الأصلي`);
      return resolve(inputPath);
    }

    const ext = path.extname(inputPath).toLowerCase();
    if (ext === '.ogg' || ext === '.opus') {
      return resolve(inputPath);
    }
    const outputPath = inputPath.replace(/\.[^/.]+$/, '') + '_converted.ogg';
    const cmd = `ffmpeg -y -i "${inputPath}" -c:a libopus -b:a 32k -ar 48000 -ac 1 "${outputPath}"`;
    exec(cmd, (error) => {
      if (!error && fs.existsSync(outputPath)) {
        logEvent(`[ترميز الصوت] تم إعادة ترميز التسجيل إلى Opus OGG متوافق مع الواتساب`);
        resolve(outputPath);
      } else {
        logEvent(`[تنبيه الصوت] تعذر التحويل عبر ffmpeg، سيتم الإرسال بالنمط التكيّفي`);
        resolve(inputPath);
      }
    });
  });
}

/**
 * Worker Loop: Processes items in the DB queue with atomic claims, backoff, and rate-limiting
 */
async function processDatabaseQueue() {
  if (isQueueProcessing) return;
  isQueueProcessing = true;

  try {
    if (connectionStatus !== 'connected' || !sock) {
      isQueueProcessing = false;
      return;
    }

    pendingQueueCount = await prisma.message.count({ 
      where: { 
        status: 'queued',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } }
        ]
      } 
    });

    if (pendingQueueCount === 0) {
      isQueueProcessing = false;
      return;
    }

    // Find the next eligible message
    const nextMsg = await prisma.message.findFirst({
      where: { 
        status: 'queued',
        direction: 'outbound',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    if (!nextMsg) {
      isQueueProcessing = false;
      return;
    }

    // Atomic Claim: Try to update status from 'queued' to 'processing'
    const claimResult = await prisma.message.updateMany({
      where: { id: nextMsg.id, status: 'queued' },
      data: { status: 'processing' }
    });

    if (claimResult.count === 0) {
      // Someone else claimed it, or it was modified
      isQueueProcessing = false;
      return;
    }

    // Re-fetch the claimed message with full relations
    const taskMsg = await prisma.message.findUnique({
      where: { id: nextMsg.id },
      include: {
        conversation: {
          include: { doctor: true, student: true }
        }
      }
    });

    if (!taskMsg || !taskMsg.conversation || !taskMsg.conversation.doctor) {
      if (taskMsg) await prisma.message.update({ where: { id: taskMsg.id }, data: { status: 'failed', lastErrorCode: 'MISSING_RELATIONS' } });
      isQueueProcessing = false;
      return;
    }

    const doctorPhoneRaw = decryptPhoneNumber(taskMsg.conversation.doctor.whatsappNumberEnc);
    if (!doctorPhoneRaw) {
      await prisma.message.update({ where: { id: taskMsg.id }, data: { status: 'failed', lastErrorCode: 'DECRYPT_FAILED' } });
      isQueueProcessing = false;
      return;
    }

    const doctorJid = formatWhatsAppJid(doctorPhoneRaw);

    const now = Date.now();
    let doctorLimits = doctorRateLimits.get(doctorJid) || [];
    doctorLimits = doctorLimits.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    
    // Check limits (we will count 1 for normal, 2 for composite if text wasn't sent)
    const cost = (taskMsg.audioUrl && !taskMsg.headerWamid) ? 2 : 1;
    
    if (doctorLimits.length + cost > RATE_LIMIT_PER_DOCTOR) {
      doctorRateLimits.set(doctorJid, doctorLimits);
      // Revert to queued, delay a bit
      await prisma.message.update({ 
        where: { id: taskMsg.id }, 
        data: { status: 'queued', nextRetryAt: new Date(Date.now() + 5000) } 
      });
      isQueueProcessing = false;
      return;
    }

    const student = taskMsg.conversation.student;
    const gradCap = String.fromCodePoint(0x1F393);
    const replyIcon = String.fromCodePoint(0x21A9, 0xFE0F);
    
    const isFollowUp = (await prisma.message.count({ where: { conversationId: taskMsg.conversationId, senderType: 'student' } })) > 1;
    
    let formattedMessageText = `${gradCap} *منصة التواصل الأكاديمي*

*بيانات الطالب${isFollowUp ? ' (متابعة)' : ''}*
> الاسم: ${student.fullName}
> رقم واتساب: ${student.phone || student.whatsappNumber || 'غير مسجل'}
> الرقم الأكاديمي: ${student.universityId || 'غير محدد'}
${!isFollowUp ? `> التخصص: ${student.department || 'غير محدد'}\n> السنة الدراسية: ${student.academicYear || 'غير محدد'}` : ''}

*نص الرسالة*
> ${taskMsg.content || (taskMsg.documentUrl ? `مستند: ${taskMsg.documentName}` : (taskMsg.audioUrl ? 'تسجيل صوتي' : (taskMsg.imageUrl ? 'مرفق صورة' : '')))}

${replyIcon} *للرد:* استخدم Reply على هذه الرسالة.`;

    const delay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
    logEvent(`[طابور ⏳] انتظار (${(delay / 1000).toFixed(1)}ث) لمحاكاة السلوك البشري...`);
    await new Promise((r) => setTimeout(r, delay));

    let sentMsg;
    let newHeaderWamid = taskMsg.headerWamid;
    let apiCalls = 0;

    try {
      if (taskMsg.audioUrl) {
        const fullAudioPath = path.resolve(__dirname, '../../public', taskMsg.audioUrl.replace(/^\//, ''));
        if (fs.existsSync(fullAudioPath)) {
          const targetAudioPath = await convertAudioToOggOpus(fullAudioPath);
          const isConverted = targetAudioPath.endsWith('_converted.ogg');
          
          if (formattedMessageText && !newHeaderWamid) {
            const headerMsg = await sock.sendMessage(doctorJid, { text: formattedMessageText });
            newHeaderWamid = headerMsg?.key?.id || null;
            apiCalls++;
            // Save the headerWamid so we don't repeat this step if the audio fails
            await prisma.message.update({
              where: { id: taskMsg.id },
              data: { headerWamid: newHeaderWamid }
            });
          }
          
          sentMsg = await sock.sendMessage(doctorJid, {
            audio: fs.readFileSync(targetAudioPath),
            mimetype: isConverted ? 'audio/ogg; codecs=opus' : 'audio/mp4',
            ptt: isConverted
          });
          apiCalls++;
          
          const audioWamid = sentMsg?.key?.id || `WA_${Date.now()}`;
          sentMsg = { key: { id: newHeaderWamid ? `${newHeaderWamid},${audioWamid}` : audioWamid } };
        } else {
          sentMsg = await sock.sendMessage(doctorJid, { text: formattedMessageText });
          apiCalls++;
        }
      } else if (taskMsg.imageUrl) {
        const fullImgPath = path.resolve(__dirname, '../../public', taskMsg.imageUrl.replace(/^\//, ''));
        if (fs.existsSync(fullImgPath)) {
          sentMsg = await sock.sendMessage(doctorJid, {
            image: fs.readFileSync(fullImgPath),
            caption: formattedMessageText
          });
          apiCalls++;
        } else {
          sentMsg = await sock.sendMessage(doctorJid, { text: formattedMessageText });
          apiCalls++;
        }
      } else if (taskMsg.documentUrl) {
        const fullDocPath = path.resolve(__dirname, '../../public', taskMsg.documentUrl.replace(/^\//, ''));
        if (fs.existsSync(fullDocPath)) {
          const ext = path.extname(fullDocPath).toLowerCase();
          let mime = 'application/pdf';
          if (ext === '.docx' || ext === '.doc') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (ext === '.zip') mime = 'application/zip';
          else if (ext === '.txt') mime = 'text/plain';
  
          sentMsg = await sock.sendMessage(doctorJid, {
            document: fs.readFileSync(fullDocPath),
            mimetype: mime,
            fileName: taskMsg.documentName || path.basename(fullDocPath),
            caption: formattedMessageText
          });
          apiCalls++;
        } else {
          sentMsg = await sock.sendMessage(doctorJid, { text: formattedMessageText });
          apiCalls++;
        }
      } else {
        sentMsg = await sock.sendMessage(doctorJid, { text: formattedMessageText });
        apiCalls++;
      }
  
      const wamid = sentMsg?.key?.id || `WA_${Date.now()}`;
  
      await prisma.message.update({
        where: { id: taskMsg.id },
        data: { status: 'sent', whatsappMessageId: wamid, lastErrorCode: null }
      });
  
      // Register all calls against rate limit
      for (let i = 0; i < apiCalls; i++) {
        doctorLimits.push(Date.now());
      }
      doctorRateLimits.set(doctorJid, doctorLimits);
      pendingQueueCount--;
  
      logEvent(`[طابور 📤] تم إرسال الرسالة إلى (${taskMsg.conversation.doctor.fullName}). المتبقي: ${pendingQueueCount}`);
      emitStatusUpdate();

    } catch (err) {
      console.error('Error sending message:', err);
      const statusCode = err?.output?.statusCode || 500;
      const isTemporary = [429, 408, 425, 500, 502, 503, 504].includes(statusCode) || err.message.includes('timeout') || err.message.includes('disconnect');
      
      let nextState = 'failed';
      let nextRetryAt = null;
      let newRetryCount = taskMsg.retryCount;
      
      if (isTemporary && taskMsg.retryCount < MAX_RETRIES) {
        newRetryCount++;
        nextState = 'queued';
        
        // Parse Retry-After if available, otherwise exponential backoff + jitter
        let delayMs = Math.pow(2, newRetryCount) * 1000 + Math.random() * 1000;
        if (err?.output?.headers && err.output.headers['retry-after']) {
          const retryAfter = err.output.headers['retry-after'];
          if (!isNaN(retryAfter)) {
            delayMs = parseInt(retryAfter) * 1000;
          } else {
            const date = new Date(retryAfter);
            if (!isNaN(date.getTime())) delayMs = Math.max(1000, date.getTime() - Date.now());
          }
        }
        nextRetryAt = new Date(Date.now() + delayMs);
        logEvent(`[طابور 🔄] فشل إرسال (كود: ${statusCode}). سيتم إعادة المحاولة (${newRetryCount}/${MAX_RETRIES}) في ${Math.floor(delayMs/1000)} ثانية.`);
      } else {
        logEvent(`[طابور ❌] فشل إرسال رسالة بشكل دائم أو استنفاد المحاولات (كود: ${statusCode}): ${err.message}`);
      }

      await prisma.message.update({
        where: { id: taskMsg.id },
        data: { 
          status: nextState, 
          retryCount: newRetryCount,
          nextRetryAt: nextRetryAt,
          lastErrorCode: String(statusCode),
          lastErrorAt: new Date()
        }
      });
    }
  } catch (outerErr) {
    console.error('Queue Processing Error:', outerErr);
  }

  isQueueProcessing = false;
  
  // Continuously process if there are more
  if (pendingQueueCount > 0) {
    setTimeout(processDatabaseQueue, 1000);
  }
}

/**
 * Initializes Baileys WhatsApp Connection
 */
async function initWhatsApp() {
  try {
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import('@whiskeysockets/baileys');
    const pino = require('pino');
    
    // Close existing socket listeners if any
    if (sock && sock.ev) {
      try {
        sock.ev.removeAllListeners();
      } catch (e) {}
    }

    logEvent('جاري تشغيل محرك واتساب Baileys وطابور الرسائل الذكي...');
    if (queuePollingInterval) { clearInterval(queuePollingInterval); queuePollingInterval = null; }
    connectionStatus = 'connecting';
    ffmpegAvailable = await checkFFmpegAvailability();
    const authDir = path.join(__dirname, '../../baileys_auth_info');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
      browser: ['IT Dept WhatsApp Bridge', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        logEvent('تم توليد رمز QR جديد لربط الواتساب');
        connectionStatus = 'qr_ready';
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qr);
        } catch (e) {
          qrCodeDataUrl = null;
        }
        emitStatusUpdate();
      }

      if (connection === 'open') {
        logEvent('[تم الاتصال] تم الاتصال برقم واتساب الأتمتة بنجاح!');
        connectionStatus = 'connected';
        qrCodeDataUrl = null;
        emitStatusUpdate();
        // Trigger queue & automatically flush all pending offline messages to WhatsApp!
        processDatabaseQueue();
        flushPendingLocalMessagesToWhatsApp();
        if (!queuePollingInterval) { queuePollingInterval = setInterval(processDatabaseQueue, 3000); }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOutCode = DisconnectReason?.loggedOut || 401;
        const shouldReconnect = statusCode !== loggedOutCode;
        logEvent(`[انقطع الاتصال] انقطع الاتصال برقم واتساب (السبب: ${statusCode || 'غير محدد'}). إعادة الاتصال: ${shouldReconnect}`);
        connectionStatus = 'disconnected';
        qrCodeDataUrl = null;
        emitStatusUpdate();

        if (shouldReconnect) {
          setTimeout(() => {
            initWhatsApp().catch((err) => console.error('Baileys reconnect error:', err));
          }, 5000);
        }
      }
    });

    // Handle incoming WhatsApp messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        await handleIncomingWhatsAppMessage(msg);
      }
    });

  } catch (error) {
    logEvent(`[خطأ] خطأ أثناء تشغيل محرك Baileys: ${error.message}`);
    connectionStatus = 'disconnected';
    emitStatusUpdate();
  }
}

/**
 * High-Level 3-Tier Smart Reply Matching Engine
 */
async function handleIncomingWhatsAppMessage(msg) {
  try {
    const wamid = msg.key?.id || null;
    
    // DEDUPLICATION FIX: Use WebhookEvent unique constraint
    if (wamid) {
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { whatsappMessageId: wamid }
      });
      if (existingEvent) {
        logEvent(`[تكرار ⚠️] التغاضي عن رسالة الواتساب الواردة المكررة (WAMID: ${wamid})`);
        return;
      }
    }

    await prisma.webhookEvent.create({
      data: {
        whatsappMessageId: wamid,
        rawPayload: JSON.stringify(msg),
        processed: false
      }
    });

    const realMsg =
      msg.message?.ephemeralMessage?.message ||
      msg.message?.viewOnceMessage?.message ||
      msg.message?.viewOnceMessageV2?.message ||
      msg.message?.documentWithCaptionMessage?.message ||
      msg.message;

    if (!realMsg) return;

    const senderJid = msg.key.remoteJid || '';
    const participantJid = msg.key.participant || senderJid;
    const senderNumberClean = participantJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
    const senderNormalized = normalizePhoneNumber(senderNumberClean);

    let imageUrl = null;
    if (realMsg.imageMessage) {
      try {
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        const filename = `doctor_img_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
        const uploadsDir = path.join(__dirname, '../../public/uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        imageUrl = `/uploads/${filename}`;
        logEvent(`[صورة جديدة 🖼️] تم استلام صورة من الدكتور وتحفيظها: ${imageUrl}`);
      } catch (imgErr) {
        console.error('Error downloading doctor image from WhatsApp:', imgErr);
      }
    }

    let audioUrl = null;
    if (realMsg.audioMessage) {
      try {
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        const filename = `doctor_audio_${Date.now()}_${Math.floor(Math.random() * 10000)}.mp3`;
        const audioDir = path.join(__dirname, '../../public/uploads/audio');
        if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
        fs.writeFileSync(path.join(audioDir, filename), buffer);
        audioUrl = `/uploads/audio/${filename}`;
        logEvent(`[سجل صوتي 🎙️] تم استلام سجل صوتي من الدكتور وتحفيظه بنجاح: ${audioUrl}`);
      } catch (audErr) {
        console.error('Error downloading doctor audio from WhatsApp:', audErr);
      }
    }

    let documentUrl = null;
    let documentName = null;
    if (realMsg.documentMessage) {
      try {
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        const rawFileName = realMsg.documentMessage.fileName || `doc_${Date.now()}.pdf`;
        const safeFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const docDir = path.join(__dirname, '../../public/uploads/documents');
        if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });
        const savedPath = path.join(docDir, `doctor_${Date.now()}_${safeFileName}`);
        fs.writeFileSync(savedPath, buffer);
        documentUrl = `/uploads/documents/${path.basename(savedPath)}`;
        documentName = rawFileName;
        logEvent(`[مستند جديد 📄] تم استلام مستند من الدكتور وتحفيظه بنجاح: ${documentUrl}`);
      } catch (docErr) {
        console.error('Error downloading doctor document from WhatsApp:', docErr);
      }
    }

    const messageContent =
      realMsg.conversation ||
      realMsg.extendedTextMessage?.text ||
      realMsg.imageMessage?.caption ||
      realMsg.documentMessage?.caption ||
      (documentUrl ? `مستند مرفق من الدكتور: ${documentName}` : (audioUrl ? 'سجل صوتي مرسل من الدكتور 🎙️' : (imageUrl ? 'صورة مرسلة من الدكتور' : '')));

    if (!messageContent.trim() && !imageUrl && !audioUrl && !documentUrl) return;

    const quotedStanzaId =
      realMsg.extendedTextMessage?.contextInfo?.stanzaId ||
      realMsg.imageMessage?.contextInfo?.stanzaId ||
      realMsg.audioMessage?.contextInfo?.stanzaId ||
      realMsg.documentMessage?.contextInfo?.stanzaId ||
      null;

    logEvent(`[رسالة واردة] رسالة واردة من (${senderJid}): "${messageContent.substring(0, 40)}..."`);

    let targetConversation = null;
    let matchedDoctor = null;

    // Tier 1: Match by Context / Quoted Message ID
    if (quotedStanzaId) {
      logEvent(`[المستوى 1] البحث عبر Quoted Message ID (${quotedStanzaId})`);
      const originalMessage = await prisma.message.findFirst({
        where: {
          whatsappMessageId: {
            contains: quotedStanzaId
          }
        },
        include: { conversation: { include: { doctor: true } } }
      });
      if (originalMessage && originalMessage.conversation) {
        targetConversation = originalMessage.conversation;
        matchedDoctor = targetConversation.doctor;
        logEvent(`[تم العثور] تم العثور على المحادثة بالمستوى 1 (الكود: ${targetConversation.referenceCode}) للدكتور د. ${matchedDoctor?.fullName}`);
      }
    }

    // Tier 2: Match by Reference Code in Text (supports REQ-XXXX, TEST-XXXX, Hex, etc.)
    if (!targetConversation) {
      const match = messageContent.match(/(?:REQ|TEST)-[A-Z0-9]+/i);
      if (match) {
        const refCode = match[0].toUpperCase();
        logEvent(`[المستوى 2] البحث عن الرمز المرجعي في النص (${refCode})`);
        targetConversation = await prisma.conversation.findFirst({
          where: { referenceCode: refCode },
          include: { doctor: true }
        });
        if (targetConversation) {
          matchedDoctor = targetConversation.doctor;
          logEvent(`[تم العثور] تم العثور على المحادثة بالمستوى 2 (الكود: ${targetConversation.referenceCode}) للدكتور د. ${matchedDoctor?.fullName}`);
        }
      }
    }

    // Tier 3: Match by Doctor Phone Number ONLY - No dangerous fallback
    if (!targetConversation) {
      logEvent(`[المستوى 3] البحث بمطابقة رقم الهاتف`);
      const allDoctors = await prisma.doctor.findMany({
        where: { isActive: true }
      });

      for (const doc of allDoctors) {
        const rawDecrypted = decryptPhoneNumber(doc.whatsappNumberEnc);
        const docNormalized = normalizePhoneNumber(rawDecrypted);

        if (docNormalized && docNormalized === senderNormalized) {
          matchedDoctor = doc;
          break;
        }
      }

      if (matchedDoctor) {
        // First try to find open conversation for this specific doctor
        targetConversation = await prisma.conversation.findFirst({
          where: { doctorId: matchedDoctor.id, status: 'open' },
          orderBy: { createdAt: 'desc' },
          include: { doctor: true }
        });

        // If no open conversation, find ANY conversation for this specific doctor
        if (!targetConversation) {
          targetConversation = await prisma.conversation.findFirst({
            where: { doctorId: matchedDoctor.id },
            orderBy: { createdAt: 'desc' },
            include: { doctor: true }
          });
        }

        if (targetConversation) {
          logEvent(`[تم العثور] تم العثور على المحادثة بالمستوى 3 (الكود: ${targetConversation.referenceCode}) للدكتور د. ${matchedDoctor?.fullName}`);
        }
      }
    }

    if (!targetConversation) {
      logEvent(`[تنبيه] لم يتم العثور على محادثة قائمة مطابقة للرسالة الواردة من (${senderJid})`);
      return;
    }

    // Save doctor message to DB
    const newDocMessage = await prisma.message.create({
      data: {
        conversationId: targetConversation.id,
        senderType: 'doctor',
        content: messageContent,
        imageUrl: imageUrl,
        audioUrl: audioUrl,
        whatsappMessageId: msg.key.id,
        direction: 'inbound',
        status: 'delivered'
      }
    });

    // Update conversation status to 'answered'
    await prisma.conversation.update({
      where: { id: targetConversation.id },
      data: { status: 'answered' }
    });

    logEvent(`[حفظ] تم حفظ رد الدكتور وتحديث المحادثة [${targetConversation.referenceCode}] إلى 'answered'`);

    notifyNewMessage(targetConversation.id, {
      ...newDocMessage,
      conversationStatus: 'answered'
    });

    try {
      const { sendNotificationToUser } = require('./pushService');
      sendNotificationToUser({
        userId: targetConversation.studentId,
        title: `وصلك رد جديد من د. ${matchedDoctor?.fullName || 'عضو الكادر'}`,
        body: messageContent || (imageUrl ? '📷 صورة مرفقة' : (audioUrl ? '🎵 صوت مرفق' : 'استجابة جديدة')),
        link: '/'
      }).catch((e) => console.error('Push send failed:', e.message));
    } catch (pushErr) {
      console.error('Push import error:', pushErr.message);
    }

  } catch (err) {
    console.error('Error handling incoming WhatsApp message:', err);
    logEvent(`[خطأ] خطأ أثناء معالجة رسالة الواتساب: ${err.message}`);
  }
}

/**
 * Automatically Flushes / Sends all pending local messages ('local_only') to WhatsApp
 * when connection is established!
 */
async function flushPendingLocalMessagesToWhatsApp() {
  try {
    const pendingMessages = await prisma.message.findMany({
      where: {
        status: 'local_only',
        senderType: 'student'
      },
      include: {
        conversation: {
          include: {
            student: true,
            doctor: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (pendingMessages.length === 0) return;

    logEvent(`[تزامن تلقائي ⚡] تم العثور على ${pendingMessages.length} رسائل محلية في الانتظار، جاري تحويلها وتمريرها تلقائياً إلى واتساب الدكاترة...`);

    const gradCap = String.fromCodePoint(0x1F393);
    const replyIcon = String.fromCodePoint(0x21A9, 0xFE0F);

    for (const msg of pendingMessages) {
      try {
        const { conversation } = msg;
        if (!conversation || !conversation.doctor) continue;

        const doctorPhoneRaw = decryptPhoneNumber(conversation.doctor.whatsappNumberEnc);
        if (!doctorPhoneRaw) continue;

        const doctorJid = formatWhatsAppJid(doctorPhoneRaw);
        const student = conversation.student;

        const studentPhone = student.phone || student.whatsappNumber || student.phoneNum || 'غير مسجل';
        const academicNum = student.universityId || 'غير محدد';
        const studentDept = student.department || 'تكنولوجيا المعلومات';
        const studentYear = student.academicYear || student.year || 'الثانية';

        const formattedMessageText =
`${gradCap} *منصة التواصل الأكاديمي*

*بيانات الطالب*
> الاسم: ${student.fullName}
> رقم واتساب: ${studentPhone}
> الرقم الأكاديمي: ${academicNum}
> التخصص: ${studentDept}
> السنة الدراسية: ${studentYear}

*نص الرسالة*
> ${msg.content || (msg.imageUrl ? 'مرفق صورة مع الاستفسار' : (msg.audioUrl ? 'تسجيل صوتي' : ''))}

${replyIcon} *للرد:* استخدم Reply على هذه الرسالة.`;

        const updatedMsg = await prisma.message.update({
          where: { id: msg.id },
          data: {
            status: 'queued'
          }
        });

        // Notify socket listeners so UI updates live from #596 to double checkmarks!
        notifyNewMessage(conversation.id, updatedMsg);

        logEvent(`[تزامن تلقائي ✉️] تم تمرير الرسالة لكود المحادثة [${conversation.referenceCode}] إلى الواتساب وتحديث حالتها إلى sent!`);
      } catch (err) {
        logEvent(`[تزامن تلقائي ⚠️] خطأ أثناء تمرير الرسالة (${msg.id}): ${err.message}`);
      }
    }

  } catch (error) {
    console.error('Error flushing pending local messages:', error);
    logEvent(`[تزامن تلقائي ❌] خطأ أثناء التزامن التلقائي: ${error.message}`);
  }
}

/**
 * Sends Student Initial Question to Doctor WhatsApp Number (via Smart Queue)
 */
async function sendStudentQuestionToWhatsApp(conversation, student, doctor, questionContent, imageUrl = null) {
  try {
    const isConnected = (sock && connectionStatus === 'connected');
    const msgStatus = isConnected ? 'queued' : 'local_only';
    
    if (!isConnected) {
      logEvent(`[محلي] وضع الإرسال لكود المحادثة [${conversation.referenceCode}]`);
    }

    const studentMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'student',
        content: questionContent || (imageUrl ? 'مرفق صورة' : ''),
        imageUrl: imageUrl,
        whatsappMessageId: `LOCAL_${Date.now()}`,
        direction: 'outbound',
        status: msgStatus
      }
    });

    if (msgStatus === 'queued') {
      setTimeout(processDatabaseQueue, 100);
    }
    
    return studentMsg;
  } catch (error) {
    console.error('Failed to send question:', error);
    throw error;
  }
}


/**
 * Sends Follow-up Student Message (text, image, audio, or document) inside existing conversation (via Smart Queue)
 */
async function sendStudentFollowUpMessageToWhatsApp(conversation, student, doctor, textContent, imageUrl = null, audioUrl = null, documentUrl = null, documentName = null) {
  try {
    const isConnected = (sock && connectionStatus === 'connected');
    const msgStatus = isConnected ? 'queued' : 'local_only';

    const studentMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'student',
        content: textContent || (documentUrl ? `مستند: ${documentName}` : (audioUrl ? 'سجل صوتي' : (imageUrl ? 'مرفق صورة' : ''))),
        imageUrl: imageUrl,
        audioUrl: audioUrl,
        documentUrl: documentUrl,
        documentName: documentName,
        whatsappMessageId: `LOCAL_${Date.now()}`,
        direction: 'outbound',
        status: msgStatus
      }
    });

    notifyNewMessage(conversation.id, studentMsg);
    
    if (msgStatus === 'queued') {
      setTimeout(processDatabaseQueue, 100);
    }
    
    return studentMsg;
  } catch (error) {
    console.error('Failed to send follow up:', error);
    throw error;
  }
}

/**
 * Simulator function for Admin Testing
 */
async function simulateDoctorReply({ doctorPhone, messageContent, quotedMessageId }) {
  const cleanPhone = doctorPhone.replace(/[^0-9]/g, '');
  const simulatedMsgPayload = {
    key: {
      remoteJid: `${cleanPhone}@s.whatsapp.net`,
      fromMe: false,
      id: `SIM_${Date.now()}`
    },
    message: {
      extendedTextMessage: {
        text: messageContent,
        contextInfo: quotedMessageId ? { stanzaId: quotedMessageId } : {}
      }
    }
  };

  logEvent(`[اختبار المحاكاة] استقبال رد تجريبي من الدكتور (${cleanPhone})...`);
  await handleIncomingWhatsAppMessage(simulatedMsgPayload);
}

/**
 * Disconnects & logs out current WhatsApp session and deletes credentials folder,
 * then re-initializes Baileys to generate a brand new QR Code for another phone number.
 */
async function disconnectWhatsAppSession() {
  try {
    logEvent('[قطع الاتصال] جاري إلغاء الجلسة الحالية وحذف بيانات الاعتماد لربط رقم جديد...');
    
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {}
      try {
        sock.end(new Error('Session disconnected by admin'));
      } catch (e) {}
      sock = null;
    }

    const authFolder = path.resolve(__dirname, '../../baileys_auth_info');
    if (fs.existsSync(authFolder)) {
      try {
        fs.rmSync(authFolder, { recursive: true, force: true });
        logEvent('[حذف الاعتماد] تم حذف مجلد الجلسة baileys_auth_info بنجاح');
      } catch (err) {
        logEvent(`[تنبيه] تعذر حذف بعض ملفات الجلسة: ${err.message}`);
      }
    }

    connectionStatus = 'connecting';
    qrCodeDataUrl = null;
    emitStatusUpdate();

    // Re-initialize fresh session after short delay
    setTimeout(() => {
      initWhatsApp();
    }, 1500);

    return { success: true, message: 'تم قطع الجلسة بنجاح وجاري إعداد رمز QR جديد' };
  } catch (err) {
    console.error('Error disconnecting WhatsApp session:', err);
    throw err;
  }
}

function getWhatsAppStatus() {
  return {
    status: connectionStatus,
    qr: qrCodeDataUrl,
    logs: connectionLogs,
    queue: getQueueMetrics()
  };
}

module.exports = {
  initWhatsApp,
  sendStudentQuestionToWhatsApp,
  sendStudentFollowUpMessageToWhatsApp,
  handleIncomingWhatsAppMessage,
  simulateDoctorReply,
  disconnectWhatsAppSession,
  getWhatsAppStatus,
  flushPendingLocalMessagesToWhatsApp
};
