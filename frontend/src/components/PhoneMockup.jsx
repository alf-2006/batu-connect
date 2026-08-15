import React from 'react';
import { ArrowRight, Calendar, CheckCheck, Paperclip, Send } from 'lucide-react';

/**
 * PhoneMockup — Real UI presentation matching the actual Platform Conversation View
 */
export default function PhoneMockup({ className = '' }) {
  return (
    <div className={`relative mx-auto ${className}`}>
      {/* Soft background glow */}
      <div className="absolute -inset-8 bg-[#2e9b9b]/15 blur-3xl rounded-full pointer-events-none" />

      {/* Phone Body Frame */}
      <div className="relative w-[300px] sm:w-[325px] rounded-[44px] bg-[#1a232f] p-2.5 shadow-[0_30px_70px_-20px_rgba(15,42,42,0.45)] ring-1 ring-black/10">
        {/* Phone Screen Container */}
        <div className="relative rounded-[34px] overflow-hidden bg-[#f8fafc] dark:bg-slate-900 border border-slate-200/50 flex flex-col font-sans dir-rtl">
          
          {/* Dynamic Island / Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-26 h-5 bg-[#1a232f] rounded-full z-30" />

          {/* Status Bar */}
          <div className="relative z-20 flex items-center justify-between px-5 pt-3 pb-1 text-[10px] font-semibold text-slate-700 bg-white border-b border-slate-100">
            <span className="dir-ltr font-mono">11:42</span>
            <div className="flex items-center gap-1.5">
              {/* Cellular Signal */}
              <svg viewBox="0 0 18 12" className="w-3.5 h-2.5 fill-slate-700">
                <rect x="0" y="8" width="3" height="4" rx="1" />
                <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
                <rect x="10" y="3" width="3" height="9" rx="1" />
                <rect x="15" y="0" width="3" height="12" rx="1" opacity="0.35" />
              </svg>
              {/* Wifi */}
              <svg viewBox="0 0 16 12" className="w-3.5 h-2.5 fill-slate-700">
                <path d="M8 11.2l2.1-2.6a3.3 3.3 0 00-4.2 0L8 11.2z" />
                <path d="M8 6.2c1.4 0 2.7.5 3.7 1.4l1.3-1.6A7.7 7.7 0 008 4a7.7 7.7 0 00-5 1.9l1.3 1.6A5.6 5.6 0 018 6.2z" />
              </svg>
              {/* Battery */}
              <svg viewBox="0 0 26 12" className="w-5 h-2.5">
                <rect x="0.5" y="0.5" width="22" height="11" rx="3" className="fill-none stroke-slate-700" strokeWidth="1" opacity="0.6" />
                <rect x="2" y="2" width="19" height="8" rx="2" className="fill-slate-700" />
              </svg>
            </div>
          </div>

          {/* Real Platform Doctor Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-slate-200/80 shadow-xs z-10">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#0f766e] flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
                  م
                </div>
              </div>
              <div className="text-right">
                <h4 className="text-[12px] font-bold text-slate-900 leading-tight">د. محمد أحمد عبد الرحمن</h4>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Messages Stream Container matching Platform styling */}
          <div
            className="p-3 space-y-3 min-h-[310px] max-h-[330px] overflow-hidden flex flex-col justify-start bg-slate-50 relative"
            style={{
              backgroundImage: 'radial-gradient(rgba(15,42,42,0.035) 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          >
            {/* Date Divider Pill */}
            <div className="flex justify-center my-1">
              <span className="px-3 py-1 rounded-full bg-white/90 border border-slate-200/80 text-slate-500 text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <Calendar className="w-3 h-3 text-[#0f766e]" />
                اليوم • 5 أغسطس 2026
              </span>
            </div>

            {/* Student Message (Left Aligned) */}
            <div className="flex flex-col items-end ml-0 mr-auto max-w-[85%]">
              <div className="bg-[#0f766e] text-white px-3 py-2 rounded-2xl rounded-tl-xs shadow-sm text-right">
                <p className="text-[11.5px] leading-relaxed font-medium">
                  السلام عليكم دكتور، هل حضرتك هتكون متواجد بكرة بالمكتب؟
                </p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[9.5px] text-teal-100/90 font-mono">
                  <span className="dir-ltr">10:15 ص</span>
                  <CheckCheck className="w-3 h-3 text-teal-200" />
                </div>
              </div>
            </div>

            {/* Doctor Response Message (Right Aligned) */}
            <div className="flex flex-col items-start mr-0 ml-auto max-w-[88%]">
              <div className="bg-white text-slate-800 border border-slate-200/90 px-3.5 py-2.5 rounded-2xl rounded-tr-xs shadow-xs text-right">
                <p className="text-[11.5px] leading-relaxed font-medium text-slate-800">
                  وعليكم السلام، أه موجود بإذن الله غداً، تعالي علي مكتب 404 الساعة 11 صباحاً
                </p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[9.5px] text-slate-400 font-mono">
                  <span className="dir-ltr">10:18 ص</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real Platform Capsule Input Bar */}
          <div className="p-2.5 bg-white border-t border-slate-200/80 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1.5 shadow-xs">
              {/* Send Button CTA */}
              <div className="w-7 h-7 rounded-full bg-[#0f766e] text-white flex items-center justify-center shadow-xs shrink-0">
                <Send className="w-3.5 h-3.5 transform rotate-180" />
              </div>
              {/* Placeholder text */}
              <span className="flex-1 text-[11px] text-slate-400 text-right font-medium">
                اكتب رسالتك للدكتور...
              </span>
              {/* Attachment Icon */}
              <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
