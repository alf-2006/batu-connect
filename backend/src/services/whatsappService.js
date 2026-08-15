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
// Smart Message Queue & Rate Limiting Engine Config
// -------------------------------------------------------------
const BATCH_LIMIT = 60;                    // Maximum messages per batch
const COOLDOWN_DURATION_MS = 5 * 60 * 1000;  // 5 minutes cooldown after 60 messages
const MIN_DELAY_MS = 2000;                 // Minimum random delay between messages (2s)
const MAX_DELAY_MS = 4000;                 // Maximum random delay between messages (4s)

const messageQueue = [];
let isQueueProcessing = false;
let batchCount = 0;
let isCoolingDown = false;
let cooldownUntil = null;

function logEvent(msg) {
  const timestamp = new Date().toLocaleTimeString('ar-EG');
  const entry = `[${timestamp}] ${msg}`;
  console.log(entry);
  connectionLogs.unshift(entry);
  if (connectionLogs.length > 50) connectionLogs.pop();
}

function getQueueMetrics() {
  return {
    pendingCount: messageQueue.length,
    currentBatchCount: batchCount,
    maxBatchLimit: BATCH_LIMIT,
    isCoolingDown,
    cooldownUntil
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
 * Worker Loop: Processes items in the message queue with rate-limiting and human delays
 */
async function triggerQueueProcessing() {
  if (isQueueProcessing || isCoolingDown) return;
  isQueueProcessing = true;

  while (messageQueue.length > 0) {
    if (connectionStatus !== 'connected' || !sock) {
      logEvent('[طابور ذكي ⏸️] تعذر الإرسال مؤقتاً، في انتظار استقرار اتصال الواتساب...');
      break;
    }

    // Check Batch Limit Threshold
    if (batchCount >= BATCH_LIMIT) {
      isCoolingDown = true;
      cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
      logEvent(`[طابور ذكي ⏸️] تم إرسال ${BATCH_LIMIT} رسالة بنجاح. تفعيل فترة الاستراحة (5 دقائق) لحماية رقم الواتساب من الحظر...`);
      emitStatusUpdate();

      await new Promise((resolve) => setTimeout(resolve, COOLDOWN_DURATION_MS));

      batchCount = 0;
      isCoolingDown = false;
      cooldownUntil = null;
      logEvent('[طابور ذكي ▶️] انتهت فترة الاستراحة (5 دقائق)، جاري استئناف إرسال الرسائل في الطابور...');
      emitStatusUpdate();
    }

    const task = messageQueue.shift();
    if (!task) break;

    // Random delay to simulate human typing behavior (2 to 4 seconds)
    const delay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
    logEvent(`[طابور ذكي ⏳] انتظار (${(delay / 1000).toFixed(1)} ثانية) لمحاكاة السلوك البشري لحماية الرقم...`);
    await new Promise((r) => setTimeout(r, delay));

    try {
      let sentMsg;

      if (task.audioUrl) {
        const fullAudioPath = path.resolve(__dirname, '../../public', task.audioUrl.replace(/^\//, ''));
        if (fs.existsSync(fullAudioPath)) {
          // Convert audio using ffmpeg to standard WhatsApp OGG Opus PTT format
          const targetAudioPath = await convertAudioToOggOpus(fullAudioPath);
          const isConverted = targetAudioPath.endsWith('_converted.ogg');

          let headerWamid = null;
          // Send description text first if available
          if (task.formattedMessageText) {
            try {
              const headerMsg = await sock.sendMessage(task.doctorJid, { text: task.formattedMessageText });
              headerWamid = headerMsg?.key?.id || null;
            } catch (txtErr) {
              console.error('Error sending audio header text:', txtErr);
            }
          }

          // Send audio voice note (ptt)
          sentMsg = await sock.sendMessage(task.doctorJid, {
            audio: fs.readFileSync(targetAudioPath),
            mimetype: isConverted ? 'audio/ogg; codecs=opus' : 'audio/mp4',
            ptt: isConverted
          });

          const audioWamid = sentMsg?.key?.id || `WA_${Date.now()}`;
          sentMsg = { key: { id: headerWamid ? `${headerWamid},${audioWamid}` : audioWamid } };
        } else {
          sentMsg = await sock.sendMessage(task.doctorJid, { text: task.formattedMessageText });
        }
      } else if (task.imageUrl) {
        const fullImgPath = path.resolve(__dirname, '../../public', task.imageUrl.replace(/^\//, ''));
        if (fs.existsSync(fullImgPath)) {
          sentMsg = await sock.sendMessage(task.doctorJid, {
            image: fs.readFileSync(fullImgPath),
            caption: task.formattedMessageText
          });
        } else {
          sentMsg = await sock.sendMessage(task.doctorJid, { text: task.formattedMessageText });
        }
      } else if (task.documentUrl) {
        const fullDocPath = path.resolve(__dirname, '../../public', task.documentUrl.replace(/^\//, ''));
        if (fs.existsSync(fullDocPath)) {
          const ext = path.extname(fullDocPath).toLowerCase();
          let mime = 'application/pdf';
          if (ext === '.docx' || ext === '.doc') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (ext === '.pptx' || ext === '.ppt') mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          else if (ext === '.zip') mime = 'application/zip';
          else if (ext === '.txt') mime = 'text/plain';

          sentMsg = await sock.sendMessage(task.doctorJid, {
            document: fs.readFileSync(fullDocPath),
            mimetype: mime,
            fileName: task.documentName || path.basename(fullDocPath),
            caption: task.formattedMessageText
          });
        } else {
          sentMsg = await sock.sendMessage(task.doctorJid, { text: task.formattedMessageText });
        }
      } else {
        sentMsg = await sock.sendMessage(task.doctorJid, { text: task.formattedMessageText });
      }

      batchCount++;
      const wamid = sentMsg?.key?.id || `WA_${Date.now()}`;
      logEvent(`[طابور ذكي 📤] تم إرسال الرسالة إلى (${task.recipientName}) بنجاح! (${batchCount}/${BATCH_LIMIT} في الدفعة الدائرة). المتبقي في الطابور: ${messageQueue.length}`);
      emitStatusUpdate();
      task.resolve({ success: true, wamid });
    } catch (err) {
      logEvent(`[طابور ذكي ❌] فشل إرسال الرسالة إلى (${task.recipientName}): ${err.message}`);
      task.reject(err);
    }
  }

  isQueueProcessing = false;
}

/**
 * Push outbound message into the Smart Queue
 */
function enqueueWhatsAppMessage(taskData) {
  return new Promise((resolve, reject) => {
    messageQueue.push({
      ...taskData,
      resolve,
      reject
    });
    logEvent(`[طابور ذكي 📥] تمت إضافة رسالة جديدة إلى طابور الإرسال. المتبقي في الطابور: ${messageQueue.length}`);
    emitStatusUpdate();
    triggerQueueProcessing();
  });
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
        triggerQueueProcessing();
        flushPendingLocalMessagesToWhatsApp();
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
    await prisma.webhookEvent.create({
      data: {
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

    // DEDUPLICATION FIX: Prevent processing duplicate incoming WhatsApp messages
    if (msg.key && msg.key.id) {
      const existingMessage = await prisma.message.findFirst({
        where: { whatsappMessageId: msg.key.id }
      });
      if (existingMessage) {
        logEvent(`[تكرار ⚠️] التغاضي عن رسالة الواتساب الواردة المكررة (WAMID: ${msg.key.id})`);
        return;
      }
    }

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

        const queueRes = await enqueueWhatsAppMessage({
          doctorJid,
          formattedMessageText,
          imageUrl: msg.imageUrl,
          audioUrl: msg.audioUrl,
          documentUrl: msg.documentUrl,
          documentName: msg.documentName,
          recipientName: `د. ${conversation.doctor.fullName}`
        });

        const updatedWamid = queueRes?.wamid || msg.whatsappMessageId;

        // Update message status in DB to 'sent'
        const updatedMsg = await prisma.message.update({
          where: { id: msg.id },
          data: {
            status: 'sent',
            whatsappMessageId: updatedWamid
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
    let sentWamid = `LOCAL_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const doctorPhoneRaw = decryptPhoneNumber(doctor.whatsappNumberEnc);

    if (doctorPhoneRaw && sock && connectionStatus === 'connected') {
      try {
        const doctorJid = formatWhatsAppJid(doctorPhoneRaw);
        const gradCap = String.fromCodePoint(0x1F393);
        const replyIcon = String.fromCodePoint(0x21A9, 0xFE0F);

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
> ${questionContent || (imageUrl ? 'مرفق صورة مع الاستفسار' : '')}

${replyIcon} *للرد:* استخدم Reply على هذه الرسالة.`;

        const queueRes = await enqueueWhatsAppMessage({
          doctorJid,
          formattedMessageText,
          imageUrl,
          recipientName: `د. ${doctor.fullName}`
        });
        if (queueRes?.wamid) sentWamid = queueRes.wamid;
      } catch (err) {
        logEvent(`[طابور/خطأ] تعذر المعالجة الفورية، سيتم حفظها محلياً: ${err.message}`);
      }
    } else {
      logEvent(`[محلي] وضع الإرسال لكود المحادثة [${conversation.referenceCode}]`);
    }

    // Record outbound student message in DB
    const studentMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'student',
        content: questionContent || (imageUrl ? 'مرفق صورة' : ''),
        imageUrl: imageUrl,
        whatsappMessageId: sentWamid,
        direction: 'outbound',
        status: (sock && connectionStatus === 'connected') ? 'sent' : 'local_only'
      }
    });

    return studentMsg;

  } catch (error) {
    console.error('Failed to send question to WhatsApp:', error);
    logEvent(`[خطأ] فشل إرسال السؤال عبر الواتساب، سيتم حفظه محلياً: ${error.message}`);
    
    // Resilient fallback: Save message locally so UI never errors out
    return await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'student',
        content: questionContent || '',
        imageUrl: imageUrl,
        whatsappMessageId: `LOCAL_${Date.now()}`,
        direction: 'outbound',
        status: 'local_only'
      }
    });
  }
}

/**
 * Sends Follow-up Student Message (text, image, audio, or document) inside existing conversation (via Smart Queue)
 */
async function sendStudentFollowUpMessageToWhatsApp(conversation, student, doctor, textContent, imageUrl = null, audioUrl = null, documentUrl = null, documentName = null) {
  try {
    const doctorPhoneRaw = decryptPhoneNumber(doctor.whatsappNumberEnc);
    if (!doctorPhoneRaw) throw new Error('رقم الدكتور غير متوفر');
    const doctorJid = formatWhatsAppJid(doctorPhoneRaw);

    const gradCap = String.fromCodePoint(0x1F393);
    const replyIcon = String.fromCodePoint(0x21A9, 0xFE0F);

    const formattedMessageText =
`${gradCap} *منصة التواصل الأكاديمي*

*بيانات الطالب (متابعة)*
> الاسم: ${student.fullName}
> الرقم الأكاديمي: ${student.universityId || 'غير محدد'}

*نص الرسالة*
> ${textContent || (documentUrl ? `مستند: ${documentName || 'ملف'}` : (audioUrl ? 'تسجيل صوتي' : (imageUrl ? 'مرفق صورة' : '')))}

${replyIcon} *للرد:* استخدم Reply على هذه الرسالة.`;

    let sentWamid = `LOCAL_${Date.now()}_${Math.floor(Math.random()*1000)}`;

    if (sock && connectionStatus === 'connected') {
      try {
        const queueRes = await enqueueWhatsAppMessage({
          doctorJid,
          formattedMessageText,
          imageUrl,
          audioUrl,
          documentUrl,
          documentName,
          recipientName: `د. ${doctor.fullName}`
        });
        if (queueRes?.wamid) sentWamid = queueRes.wamid;
      } catch (err) {
        logEvent(`[طابور/خطأ] تعذر المعالجة الفورية للمتابعة: ${err.message}`);
      }
    }

    const studentMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'student',
        content: textContent || (documentUrl ? `مستند: ${documentName}` : (audioUrl ? 'سجل صوتي' : (imageUrl ? 'مرفق صورة' : ''))),
        imageUrl: imageUrl,
        audioUrl: audioUrl,
        documentUrl: documentUrl,
        documentName: documentName,
        whatsappMessageId: sentWamid,
        direction: 'outbound',
        status: (sock && connectionStatus === 'connected') ? 'sent' : 'local_only'
      }
    });

    notifyNewMessage(conversation.id, studentMsg);
    return studentMsg;

  } catch (error) {
    console.error('Failed to send follow-up message:', error);
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
