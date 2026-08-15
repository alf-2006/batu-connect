import React from 'react';
import { MessageSquare, ShieldCheck, UserCheck, LogIn, Radio } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, onOpenLogin, whatsappStatus }) {
  const getStatusBadge = () => {
    switch (whatsappStatus?.status) {
      case 'connected':
        return (
          <span className="badge badge-olive" title="نظام التواصل متصل ويعمل بشكل متزامن">
            <span className="pulse-dot"></span> متصل بالمنصة
          </span>
        );
      case 'qr_ready':
        return (
          <span className="badge badge-amber" title="جاهز لربط الجلسة في لوحة الأدمن">
            <span className="pulse-dot-amber"></span> رمز الربط جاهز
          </span>
        );
      default:
        return (
          <span className="badge badge-amber">
            <Radio className="w-3.5 h-3.5 animate-spin" /> جاري تهيئة المنصة
          </span>
        );
    }
  };

  return (
    <header className="glass-card mb-6 px-4 py-3 border-b border-[#2e9b9b]/20">
      <div className="flex flex-col gap-3">
        {/* Top Row: Brand + Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#2e9b9b] to-[#40b0b0] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-theme-primary">منصة تواصل قسم IT</h1>
              <p className="text-[10px] text-theme-muted hidden sm:block">تواصل آمن عبر المنصة</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {currentUser ? (
              <div className="hidden md:flex items-center gap-2 bg-[var(--surface-2)] px-2.5 py-1.5 rounded-lg border border-theme text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <div>
                  <div className="font-semibold text-theme-primary text-[11px]">{currentUser.fullName}</div>
                </div>
              </div>
            ) : (
              <button onClick={onOpenLogin} className="btn btn-secondary text-xs py-1.5 px-3">
                <LogIn className="w-3.5 h-3.5" /> دخول
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Navigation Tabs */}
        <div className="flex items-center gap-2 bg-[var(--surface-2)] p-1 rounded-lg border border-theme">
          <button
            onClick={() => setActiveTab('student')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'student'
                ? 'bg-[#2e9b9b] text-white shadow-brand'
                : 'text-theme-secondary hover:text-[#2e9b9b] hover:bg-[var(--surface)]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">بوابة الطلاب</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'admin'
                ? 'bg-[#2e9b9b] text-white shadow-brand'
                : 'text-theme-secondary hover:text-[#2e9b9b] hover:bg-[var(--surface)]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">لوحة الأدمن</span>
          </button>
        </div>
      </div>
    </header>
  );
}
