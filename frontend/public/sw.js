// Service Worker for Platform PWA & Web Push Notifications
const CACHE_NAME = 'academic-platform-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Web Push Notification Listener
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'تنبيه جديد - منصة التواصل الأكاديمي';
    const options = {
      body: data.body || 'وصلك رد جديد على استفسارك الموجه للكادر الأكاديمي.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      dir: 'rtl',
      lang: 'ar',
      data: {
        link: data.link || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error handling Web Push event in Service Worker:', err);
  }
});

// Notification Tap / Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const linkToOpen = event.notification.data?.link || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(linkToOpen);
      }
    })
  );
});
