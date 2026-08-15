import React from 'react';
import { MessageSquare, ShieldCheck, Zap, Lock, CheckCheck, Smartphone } from 'lucide-react';

export default function HeroGraphic() {
  return (
    <div className="whatsapp-hero-graphic relative flex items-center justify-center">
      {/* Outer Glowing Radial Circles */}
      <div className="absolute w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl animate-pulse-slow"></div>
      <div className="absolute w-60 h-60 rounded-full bg-teal-500/10 blur-2xl"></div>

      {/* Main Central Phone / Hub Illustration Card */}
      <div className="glass-card p-6 w-full max-w-sm relative z-10 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
        {/* Header Strip */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-xs">Academic Platform Bridge</div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> متصل بالمنصة
              </div>
            </div>
          </div>
          <span className="badge badge-code text-[10px]">REQ-1042</span>
        </div>

        {/* Question Bubble Preview */}
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
            <div className="text-[10px] text-emerald-400 font-bold mb-1">
              الطالب: أحمد علي • (202410882)
            </div>
            <div className="text-gray-200">
              دكتورنا، هل يمكن توضيح موعد تسليم مشروع التخرج لبرمجيات النظام؟
            </div>
          </div>

          {/* Doctor Reply Bubble */}
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 mr-4 text-emerald-100">
            <div className="text-[10px] text-emerald-300 font-bold mb-1 flex items-center justify-between">
              <span>د. محمد أحمد (عبر المنصة)</span>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              أهلاً بك، التسليم سيكون يوم الخميس القادم الساعة 12 ظهراً بإذن الله
            </div>
          </div>
        </div>

        {/* Security Badge Strip */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <Lock className="w-3.5 h-3.5" /> AES-256-GCM
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Socket.io
          </span>
        </div>
      </div>

      {/* Floating Badge 1: Top Right */}
      <div className="chat-card-floating top-2 -right-4 bg-slate-900/90 border border-emerald-500/40 text-xs animate-float z-20">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="font-bold text-white text-[11px]">رقم الدكتور محمي</div>
            <div className="text-[9px] text-gray-400">لا يظهر في الفرونت إند إطلاقاً</div>
          </div>
        </div>
      </div>

      {/* Floating Badge 2: Bottom Left */}
      <div className="chat-card-floating bottom-2 -left-4 bg-slate-900/90 border border-cyan-500/40 text-xs animate-float z-20" style={{ animationDelay: '2s' }}>
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="font-bold text-white text-[11px]">رد مباشر عبر المنصة</div>
            <div className="text-[9px] text-gray-400">دون الحاجة لواجهة جديدة للمدرس</div>
          </div>
        </div>
      </div>
    </div>
  );
}
