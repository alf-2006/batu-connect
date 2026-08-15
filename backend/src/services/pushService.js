const webpush = require('web-push');
const prisma = require('../lib/prisma');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BJRLK3DJQtZ_NRfoOzl9hDj1zdDby1WkecCxhIYVg7eSP6OXt-2NO5jq7uG1ilIQgMTXvMaGq92B4WJVDhtH-iI';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'QNUqLz6DxpVIIyBbYaae0REpr8_glMOkNhmoOeHY2gA';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@batu.edu.eg';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.error('Error configuring web-push VAPID:', err);
}

/**
 * Send Web Push notification & save notification record in DB
 */
async function sendNotificationToUser({ userId, title, body, link, type = 'new_reply' }) {
  try {
    // 1. Create in-app Notification record
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        link: link || '/'
      }
    });

    // 2. Fetch all active device push subscriptions for user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      return { notification, pushSentCount: 0 };
    }

    const payload = JSON.stringify({
      title,
      body,
      link: link || '/',
      notificationId: notification.id
    });

    let pushSentCount = 0;

    for (const sub of subscriptions) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushConfig, payload);
        pushSentCount++;
      } catch (err) {
        // If subscription is expired or invalid (404 or 410 Gone), remove it automatically
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`Web push error for sub ${sub.id}:`, err.message);
        }
      }
    }

    return { notification, pushSentCount };
  } catch (error) {
    console.error('Error in sendNotificationToUser:', error);
    return null;
  }
}

module.exports = {
  VAPID_PUBLIC_KEY,
  sendNotificationToUser
};
