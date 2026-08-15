/**
 * Web Push & Notification Service for PWA
 */

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register Service Worker
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      return reg;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  }
  return null;
}

/**
 * Subscribe to Web Push Notifications
 */
export async function subscribeToWebPush(userId, userType = 'student') {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'المتصفح لا يدعم إشعارات الـ Push' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'تم رفض إذن الإشعارات من المتصفح' };
    }

    // Play subtle test sound to unlock web audio autoplay
    playNotificationChime();

    const reg = await registerServiceWorker();
    if (!reg) return { success: false, reason: 'تعذر تسجيل خادم الخدمة' };

    // Fetch VAPID key from backend
    const vapidRes = await fetch('/api/push/vapid-key');
    const { publicKey } = await vapidRes.json();

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    // Send subscription to backend
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userType,
        subscription: sub
      })
    });

    if (res.ok) {
      return { success: true };
    } else {
      return { success: false, reason: 'فشل حفظ الاشتراك بالسيرفر' };
    }
  } catch (err) {
    console.error('Error subscribing to push:', err);
    return { success: false, reason: err.message };
  }
}

/**
 * Unsubscribe on Logout
 */
export async function unsubscribeFromWebPush(userId) {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
      }
    } catch (err) {
      console.error('Error unsubscribing:', err);
    }
  }
}

/**
 * Play subtle, elegant Notification Chime using Web Audio Synthesizer
 * (No external mp3 assets required)
 */
export function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Autoplay blocked or not allowed yet
  }
}
