const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_whatsapp_platform_2026';
const prisma = require('../lib/prisma');

let ioInstance = null;

function initSocket(io) {
  ioInstance = io;

  // SECURITY FIX: Add authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user; // Attach user to socket
      next();
    } catch (error) {
      console.error('Socket.io authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id} (User: ${socket.user?.fullName || 'Unknown'})`);

    // SECURITY FIX: Join specific conversation room with ownership verification
    socket.on('join_conversation', async (conversationId) => {
      if (!conversationId) {
        socket.emit('error', { message: 'معرف المحادثة مطلوب' });
        return;
      }

      try {
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });

        if (!conversation) {
          socket.emit('error', { message: 'المحادثة غير موجودة' });
          return;
        }

        // Verify ownership: Students can only join their own conversations, Admins can join any
        if (socket.user.role === 'student' && conversation.studentId !== socket.user.id) {
          socket.emit('error', { message: 'ليس لديك صلاحية للوصول إلى هذه المحادثة' });
          console.log(`[Socket.io] UNAUTHORIZED: User ${socket.user.id} tried to join conversation ${conversationId}`);
          return;
        }

        socket.join(`conversation_${conversationId}`);
        console.log(`[Socket.io] Socket ${socket.id} (${socket.user.fullName}) joined room conversation_${conversationId}`);
        socket.emit('joined_conversation', { conversationId });
      } catch (error) {
        console.error('Error verifying conversation ownership:', error);
        socket.emit('error', { message: 'خطأ في التحقق من الصلاحيات' });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation_${conversationId}`);
        console.log(`[Socket.io] Socket ${socket.id} left room conversation_${conversationId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Emit new message event to student tuned to conversation room
 */
function notifyNewMessage(conversationId, messageData) {
  if (ioInstance) {
    ioInstance.to(`conversation_${conversationId}`).emit('new_message', messageData);
    ioInstance.emit('conversation_updated', { conversationId, messageData });
  }
}

/**
 * Emit WhatsApp connection status updates to Admin listeners
 */
function notifyWhatsAppStatus(statusData) {
  if (ioInstance) {
    ioInstance.emit('whatsapp_status_change', statusData);
  }
}

module.exports = {
  initSocket,
  notifyNewMessage,
  notifyWhatsAppStatus
};
