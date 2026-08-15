import React from 'react';
import { WatchProgress, WatchEvent } from '../lib/types';
import { CheckCircle, ShieldAlert, EyeOff, Play, Pause, Clock } from 'lucide-react';

interface WatchHeatmapProps {
  durationSeconds: number;
  progress: WatchProgress | null;
  events: WatchEvent[];
  memberName?: string;
}

export const WatchHeatmap: React.FC<WatchHeatmapProps> = ({
  durationSeconds,
  progress,
  events,
  memberName,
}) => {
  const duration = durationSeconds || 300;
  const maxWatched = progress?.max_watched_seconds || 0;
  const totalWatched = progress?.total_watched_seconds || 0;

  // Divide video into 50 timeline chunks
  const numChunks = 50;
  const chunkDuration = duration / numChunks;

  // Build heatmap segments
  const chunks = Array.from({ length: numChunks }).map((_, index) => {
    const startTime = index * chunkDuration;
    const endTime = (index + 1) * chunkDuration;

    // Check if this chunk is within the max watched range
    const isWatched = startTime <= maxWatched;

    // Check if there was a seek_blocked event in this timeframe
    const hasBlockedSeek = events.some(
      e => e.event_type === 'seek_blocked' && e.video_timestamp >= startTime && e.video_timestamp <= endTime
    );

    // Check if tab was hidden during this time
    const hasTabHidden = events.some(
      e => e.event_type === 'tab_hidden' && e.video_timestamp >= startTime && e.video_timestamp <= endTime
    );

    return {
      index,
      startTime,
      endTime,
      isWatched,
      hasBlockedSeek,
      hasTabHidden,
    };
  });

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h4 className="text-base font-bold text-teal-400">
            الخريطة الحرارية لدقة المشاهدة {memberName ? `- ${memberName}` : ''}
          </h4>
          <p className="text-xs text-slate-400">
            تحليل النطاقات المشاهدة خطوة بخطوة ومواقع محاولات التخطي ومغادرة الصفحة
          </p>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs">
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
            <span className="text-slate-300">مشاهد معتمد</span>
          </div>
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
            <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
            <span className="text-slate-300">محاولة تخطي</span>
          </div>
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
            <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
            <span className="text-slate-300">مغادرة الشاشة</span>
          </div>
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
            <span className="w-3 h-3 rounded-sm bg-slate-800 inline-block" />
            <span className="text-slate-400">غير مشاهد</span>
          </div>
        </div>
      </div>

      {/* Visual Timeline Segments Bar */}
      <div className="space-y-1.5">
        <div className="flex w-full h-8 rounded-xl overflow-hidden bg-slate-950 p-1 space-x-0.5 rtl:space-x-reverse">
          {chunks.map(chunk => {
            let bgColor = 'bg-slate-800/80';
            if (chunk.hasBlockedSeek) {
              bgColor = 'bg-rose-500 shadow-rose-500/50';
            } else if (chunk.hasTabHidden) {
              bgColor = 'bg-amber-500';
            } else if (chunk.isWatched) {
              bgColor = 'bg-emerald-500';
            }

            return (
              <div
                key={chunk.index}
                className={`h-full flex-1 transition-all duration-200 hover:scale-110 rounded-xs group relative ${bgColor}`}
                title={`من ${formatSecs(chunk.startTime)} إلى ${formatSecs(chunk.endTime)}`}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-xs font-mono text-slate-500 dir-ltr">
          <span>00:00</span>
          <span>{formatSecs(duration / 2)}</span>
          <span>{formatSecs(duration)}</span>
        </div>
      </div>

      {/* Event Logs Timeline Detail */}
      <div className="pt-2">
        <h5 className="text-xs font-semibold text-slate-400 mb-3 flex items-center space-x-1.5 rtl:space-x-reverse">
          <Clock className="w-4 h-4 text-teal-400" />
          <span>سجل أحداث المشاهدة الدقيق (Event Audit Log)</span>
        </h5>

        {events.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">لا توجد أحداث مسجلة لهذا العضو حتى الآن.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
            {events.map((evt, idx) => {
              let icon = <Clock className="w-3.5 h-3.5 text-slate-400" />;
              let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
              let label = evt.event_type;

              if (evt.event_type === 'seek_blocked') {
                icon = <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
                badgeStyle = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
                label = 'تم كتم محاولة التخطي للأمام';
              } else if (evt.event_type === 'tab_hidden') {
                icon = <EyeOff className="w-3.5 h-3.5 text-amber-400" />;
                badgeStyle = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                label = 'مغادرة التبويب / إخفاء الشاشة';
              } else if (evt.event_type === 'completed') {
                icon = <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
                badgeStyle = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
                label = 'استكمال المشاهدة بنجاح 100%';
              } else if (evt.event_type === 'play') {
                icon = <Play className="w-3.5 h-3.5 text-teal-400" />;
                label = 'تشغيل الفيديو';
              } else if (evt.event_type === 'pause') {
                icon = <Pause className="w-3.5 h-3.5 text-slate-400" />;
                label = 'إيقاف مؤقت';
              }

              return (
                <div
                  key={evt.id || idx}
                  className={`flex items-center justify-between p-2 rounded-xl border ${badgeStyle}`}
                >
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    {icon}
                    <span className="font-medium">{label}</span>
                  </div>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse text-[11px] font-mono opacity-80">
                    <span>عند التوقيت: {formatSecs(evt.video_timestamp || 0)}</span>
                    <span>{new Date(evt.created_at).toLocaleTimeString('ar-EG')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
