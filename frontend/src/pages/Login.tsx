import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Video, Shield, User, Lock, Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (role: 'admin' | 'member') => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { profiles, loginAs, t, language, setLanguage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const adminProfiles = profiles.filter(p => p.role === 'admin');
  const memberProfiles = profiles.filter(p => p.role === 'member');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = profiles.find(p => p.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      loginAs(found.id);
      onLoginSuccess(found.role);
    } else if (profiles.length > 0) {
      loginAs(profiles[0].id);
      onLoginSuccess(profiles[0].role);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Toggle in Top Corner */}
      <div className="absolute top-6 right-6 rtl:right-auto rtl:left-6">
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold uppercase hover:border-slate-700 transition-colors"
        >
          {language === 'ar' ? 'English' : 'عربي'}
        </button>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        
        {/* Header Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-teal-600 to-teal-400 flex items-center justify-center shadow-2xl shadow-teal-500/30">
            <Video className="w-8 h-8 text-slate-950" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight font-display text-white">
              {t('appTitle')}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        {/* Quick Demo Access Switcher Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          
          <div className="space-y-3">
            <label className="text-xs font-bold text-teal-400 block tracking-wide uppercase">
              الدخول السريع بحسابات العرض (Demo Preset Login)
            </label>

            {/* Admin Demo Button */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center space-x-1 rtl:space-x-reverse">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>حساب قائد الفريق (Admin)</span>
              </span>
              {adminProfiles.map(admin => (
                <button
                  key={admin.id}
                  onClick={() => {
                    loginAs(admin.id);
                    onLoginSuccess('admin');
                  }}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-slate-850 to-slate-800 hover:from-amber-500/20 hover:to-amber-500/10 border border-slate-700/80 hover:border-amber-500/40 flex items-center justify-between text-right rtl:text-right group transition-all"
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm">
                      {admin.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {admin.full_name}
                      </div>
                      <div className="text-xs text-slate-400">{admin.email}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300">
                    دخول الأدمن
                  </span>
                </button>
              ))}
            </div>

            {/* Member Demo Buttons */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center space-x-1 rtl:space-x-reverse">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>حسابات أعضاء الفريق (Members)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {memberProfiles.map(mem => (
                  <button
                    key={mem.id}
                    onClick={() => {
                      loginAs(mem.id);
                      onLoginSuccess('member');
                    }}
                    className="p-3 rounded-2xl bg-slate-850 hover:bg-teal-500/20 border border-slate-700/80 hover:border-teal-500/40 text-right rtl:text-right group transition-all"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                      {mem.full_name}
                    </div>
                    <div className="text-[10px] text-slate-400">{mem.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-semibold uppercase">
              أو ادخل ببريدك الإلكتروني
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute top-3.5 right-3.5 rtl:right-3.5 rtl:left-auto" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@phantoms.dev"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-10 rtl:pr-10 rtl:pl-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">كلمة السر</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute top-3.5 right-3.5 rtl:right-3.5 rtl:left-auto" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-10 rtl:pr-10 rtl:pl-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-brand-teal-500 hover:bg-brand-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/25 transition-all text-sm"
            >
              تسجيل الدخول
            </button>
          </form>

        </div>

        {/* Feature Badges Footer */}
        <div className="flex justify-center items-center space-x-4 rtl:space-x-reverse text-xs text-slate-400">
          <span className="flex items-center space-x-1 rtl:space-x-reverse">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>منع التخطي 100%</span>
          </span>
          <span className="flex items-center space-x-1 rtl:space-x-reverse">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>تتبع تبويب الشاشة</span>
          </span>
          <span className="flex items-center space-x-1 rtl:space-x-reverse">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>سجل خريطة حرارية</span>
          </span>
        </div>

      </div>
    </div>
  );
};
