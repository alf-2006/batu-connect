const express = require('express');
const prisma = require('../lib/prisma');
const { VAPID_PUBLIC_KEY } = require('../services/pushService');

const router = express.Router();

/**
 * GET /api/push/vapid-key
 * Returns public VAPID key for client PWA subscription
 */
router.get('/vapid-key', (req, res) => {
  return res.json({ publicKey: VAPID_PUBLIC_KEY });
});

/**
 * POST /api/push/subscribe
 * Save device Web Push subscription
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { userId, userType = 'student', subscription } = req.body;

    if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'بيانات الاشتراك غير اكتمال' });
    }

    const saved = await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscription.endpoint
        }
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userType
      },
      create: {
        userId,
        userType,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    });

    return res.json({ message: 'تم حفظ اشتراك الإشعارات بنجاح', id: saved.id });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return res.status(500).json({ error: 'فشل تفعيل إشعارات الهاتف' });
  }
});

/**
 * DELETE /api/push/subscribe
 * Remove subscription on user logout
 */
router.delete('/subscribe', async (req, res) => {
  try {
    const { userId, endpoint } = req.body;

    if (userId && endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { userId, endpoint }
      });
    }

    return res.json({ message: 'تم إلغاء اشتراك الإشعارات' });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return res.status(500).json({ error: 'فشل إلغاء الاشتراك' });
  }
});

/**
 * GET /api/notifications
 * Fetch user's in-app notifications
 */
router.get('/list', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.json([]);
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'تعذر جلب قائمة الإشعارات' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
router.patch('/read/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    return res.json({ message: 'تمت القراءة' });
  } catch (error) {
    return res.status(500).json({ error: 'فشل التعديل' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for user
 */
router.patch('/read-all', async (req, res) => {
  try {
    const { userId } = req.body;
    if (userId) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });
    }
    return res.json({ message: 'تم تعليم الكل كمقروء' });
  } catch (error) {
    return res.status(500).json({ error: 'فشل التعديل' });
  }
});

module.exports = router;
