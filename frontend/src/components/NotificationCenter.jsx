import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, MessageCircle, ExternalLink, ShieldCheck, Sparkles, X, Volume2 } from 'lucide-react';
import { subscribeToWebPush } from '../services/notificationService';

export default function NotificationCenter({
  userId,
  userType = 'student',
  onSelectConversation
}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState('unknown'); // 'granted' | 'default' | 'denied' | 'submitting'
  const dropdownRef = useRef(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  // Fetch user notifications list
  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/push/list?userId=${userId}`);
      const data = await res.json();
      if (res.ok && data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications list:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  // Handle Outside Click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enable Push Notification Button Handler
  const handleEnablePush = async () => {
    setPushStatus('submitting');
    const result = await subscribeToWebPush(userId, userType);
    if (result.success) {
      setPushStatus('granted');
    } else {
      setPushStatus(Notification.permission);
      alert(result.reason || 'تعذر تفعيل الإشعارات');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/push/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Mark single read & open conversation link
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      fetch(`/api/push/read/${notif.id}`, { method: 'PATCH' }).catch(() => {});
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    setIsOpen(false);

    if (onSelectConversation && notif.link) {
      // Parse conversation ID if in link or open list
      onSelectConversation();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="p-2 rounded-xl surface-card border-theme text-theme-primary hover:border-[#0f766e]/40 transition-all relative flex items-center justify-center shadow-xs"
        title="الإشعارات والتنبيهات"
      >
        <Bell className="w-4 h-4 text-[#0f766e] dark:text-teal-300" />
        {unreadCount > 0 && (
          <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center absolute -top-1 -right-1 shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden dir-rtl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0f766e]" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm font-display">
                الإشعارات والتنبيهات
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20">
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-[#0f766e] hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* Web Push Prompt Banner inside Notification Dropdown */}
          {pushStatus !== 'granted' && (
            <div className="p-3 bg-[#0f766e]/10 border-b border-[#0f766e]/20 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#0f766e] dark:text-teal-300 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" />
                  تفعيل إشعارات الهاتف والـ Push
                </div>
                <div className="text-[10.5px] text-slate-500 font-medium">
                  استلم تنبيهات الردود فوراً على هاتف حتى عند إغلاق التاب
                </div>
              </div>

              <button
                onClick={handleEnablePush}
                disabled={pushStatus === 'submitting'}
                className="px-3 py-1.5 rounded-xl bg-[#0f766e] hover:bg-[#0f766e]/90 text-white font-extrabold text-[11px] shadow-xs shrink-0 transition-all"
              >
                {pushStatus === 'submitting' ? 'جاري التفعيل...' : 'تفعيل الآن'}
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                <div className="font-bold text-slate-600 dark:text-slate-400 text-xs">لا توجد إشعارات حتى الآن</div>
                <p className="text-[11px] text-slate-400">ستظهر هنا ردود الدكاترة وتنبيهات المنصة الفورية.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex items-start gap-3 ${
                    !notif.isRead ? 'bg-[#0f766e]/5 dark:bg-[#0f766e]/10' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#0f766e]/10 text-[#0f766e] dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageCircle className="w-4 h-4" />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-xs truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(notif.createdAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                  </div>

                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#0f766e] shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
