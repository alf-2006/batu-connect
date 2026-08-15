import React from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, CheckCircle2, Clock, RefreshCw, ChevronLeft, Send } from 'lucide-react';

export default function StudentConversationsModal({
  isOpen,
  onClose,
  conversations = [],
  onSelectConversation,
  onRefresh
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs dir-rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0f766e]/10 text-[#0f766e] dark:text-teal-300 flex items-center justify-center font-bold">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base font-display">
                سجل محادثاتي واستفساراتي
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {conversations.length} محادثة سابقة مع الكادر الأكاديمي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-xl text-slate-500 hover:text-[#0f766e] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="تحديث القائمة"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {conversations.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">لا توجد محادثات سابقة حتى الآن</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                يمكنك بدء تواصل جديد واختيار الدكتور أو العضو المطلوب من دليل الأقسام.
              </p>
            </div>
          ) : (
            conversations.map((c) => {
              const lastMsgText = c.lastMessage
                ? c.lastMessage.content || (c.lastMessage.imageUrl ? '📷 صورة مرفقة' : '')
                : c.subject;

              const lastMsgPrefix = c.lastMessage
                ? c.lastMessage.senderType === 'student'
                  ? 'أنت: '
                  : `د. ${c.doctorName}: `
                : '';

              const displayTime = c.lastMessage
                ? new Date(c.lastMessage.createdAt).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : new Date(c.createdAt).toLocaleDateString('ar-EG');

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectConversation(c.id);
                    onClose();
                  }}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-[#0f766e]/5 hover:border-[#0f766e]/40 transition-all cursor-pointer group flex items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-[#0f766e] transition-colors truncate">
                        د. {c.doctorName}
                      </h4>

                      {c.status === 'answered' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          تم الرد
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                          <Clock className="w-3 h-3 text-amber-500" />
                          قيد الانتظار
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-1 leading-relaxed">
                      <span className="text-[#0f766e] font-bold">{lastMsgPrefix}</span>
                      {lastMsgText}
                    </p>

                    <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
                      <span>{displayTime}</span>
                      <span className="text-[10px] text-[#0f766e] font-bold">{c.doctorDepartment || 'قسم أكاديمي'}</span>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 group-hover:bg-[#0f766e] group-hover:text-white flex items-center justify-center transition-all shrink-0">
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
