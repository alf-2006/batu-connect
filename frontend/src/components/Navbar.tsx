import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../lib/supabase';
import { NotificationItem } from '../lib/types';
import { 
  Video, 
  Shield, 
  User, 
  Bell, 
  Globe, 
  LogOut, 
  Users, 
  LayoutDashboard,
  CheckCircle,
  Clock,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string, meetingId?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate }) => {
  const { user, profiles, loginAs, logout, language, setLanguage, t } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      dbService.getNotifications(user.id).then(setNotifications);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await dbService.markNotificationRead(id);
    if (user) {
      const updated = await dbService.getNotifications(user.id);
      setNotifications(updated);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 md:px-8 py-3.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div 
          onClick={() => onNavigate(user?.role === 'admin' ? 'admin' : 'dashboard')}
          className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-teal-600 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Video className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="font-extrabold text-lg tracking-tight text-white font-display">
                {t('appTitle')}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              نظام التحقق الذكي لمنع تخطي تسجيلات الاجتماعات
            </p>
          </div>
        </div>

        {/* Center Nav Navigation */}
        <div className="hidden md:flex items-center space-x-1 rtl:space-x-reverse bg-slate-850 p-1 rounded-xl border border-slate-800">
          {user?.role === 'admin' ? (
            <>
              <button
                onClick={() => onNavigate('admin')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse transition-colors ${
                  currentTab === 'admin' ? 'bg-brand-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>لوحة التحكم الرئيسية</span>
              </button>
              <button
                onClick={() => onNavigate('admin-members')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse transition-colors ${
                  currentTab === 'admin-members' ? 'bg-brand-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{t('members')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse transition-colors ${
                currentTab === 'dashboard' ? 'bg-brand-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('myMeetings')}</span>
            </button>
          )}
        </div>

        {/* Right Actions: Language Switcher, Notifications, User Switcher */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          
          {/* Language Selector */}
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1 rtl:space-x-reverse transition-colors border border-slate-700"
            title="تغيير اللغة / Change Language"
          >
            <Globe className="w-4 h-4 text-teal-400" />
            <span className="uppercase">{language}</span>
          </button>

          {/* Member Notifications Bell */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifDrawer(!showNotifDrawer)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors relative border border-slate-700"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popup Drawer */}
              {showNotifDrawer && (
                <div className="absolute top-12 left-0 rtl:left-auto rtl:right-0 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-white space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h4 className="text-xs font-bold text-teal-400 flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Bell className="w-3.5 h-3.5" />
                      <span>تنبيهات وتذكيرات الاجتماعات</span>
                    </h4>
                    <span className="text-[10px] text-slate-400">{notifications.length} التنبيهات</span>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">لا توجد إشعارات حالياً</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            handleMarkRead(n.id);
                            onNavigate('watch', n.meeting_id);
                            setShowNotifDrawer(false);
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            n.read
                              ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold mb-1">
                            <span>{n.meeting_title}</span>
                            <span className="text-[10px] opacity-75">
                              {new Date(n.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Profile & Demo Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2.5 rtl:space-x-reverse bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold text-xs">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="text-right rtl:text-right hidden sm:block">
                <div className="text-xs font-bold leading-tight">{user?.full_name || 'زائر'}</div>
                <div className="text-[10px] text-teal-400 font-medium">
                  {user?.role === 'admin' ? t('adminRole') : t('memberRole')}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Quick Account Switcher Menu */}
            {showUserDropdown && (
              <div className="absolute top-12 left-0 rtl:left-auto rtl:right-0 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-white space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 border-b border-slate-800">
                  {t('selectUser')}
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
                  {profiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        loginAs(p.id);
                        setShowUserDropdown(false);
                        onNavigate(p.role === 'admin' ? 'admin' : 'dashboard');
                      }}
                      className={`w-full text-right rtl:text-right p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        user?.id === p.id
                          ? 'bg-brand-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        {p.role === 'admin' ? (
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-teal-400" />
                        )}
                        <div>
                          <div className="font-semibold">{p.full_name}</div>
                          <div className="text-[10px] text-slate-400">{p.email}</div>
                        </div>
                      </div>
                      {user?.id === p.id && <CheckCircle className="w-4 h-4 text-teal-400" />}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                      onNavigate('login');
                    }}
                    className="w-full p-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center justify-center space-x-2 rtl:space-x-reverse transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </nav>
  );
};
