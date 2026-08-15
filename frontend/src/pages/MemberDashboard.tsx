import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../lib/supabase';
import { Meeting, WatchProgress } from '../lib/types';
import { 
  Video, 
  Play, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  Calendar,
  AlertCircle,
  TrendingUp,
  FileText
} from 'lucide-react';

interface MemberDashboardProps {
  onSelectMeeting: (meetingId: string) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ onSelectMeeting }) => {
  const { user, t } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      
      const allMeetings = await dbService.getMeetings();
      // Filter meetings assigned to current user
      const assigned = allMeetings.filter(m => 
        !m.assigned_member_ids || m.assigned_member_ids.length === 0 || m.assigned_member_ids.includes(user.id)
      );

      const userProgressList = await dbService.getWatchProgress(undefined, user.id);
      const pMap: Record<string, WatchProgress> = {};
      userProgressList.forEach(p => {
        pMap[p.meeting_id] = p;
      });

      setMeetings(assigned);
      setProgressMap(pMap);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const totalAssigned = meetings.length;
  const completedCount = meetings.filter(m => progressMap[m.id]?.status === 'completed').length;
  const overallPercent = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 text-white">
      
      {/* Header Stat Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full text-teal-400 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>فريق Phantoms - نظام متابعة مشاهدة الاجتماعات 100%</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display">
              مرحباً بك، {user?.full_name}
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-xl">
              تأكد من مشاهدة كافة تسجيلات الاجتماعات الفنية كاملة دون تخطي لاستكمال نسبة حضور الفريق المطلوبة.
            </p>
          </div>

          {/* Stat Badges Grid */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <div className="text-center px-4">
              <span className="text-xs text-slate-400 block mb-1">الاجتماعات المكلف بها</span>
              <span className="text-2xl font-extrabold text-white">{totalAssigned}</span>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div className="text-center px-4">
              <span className="text-xs text-slate-400 block mb-1">المستكملة بنجاح</span>
              <span className="text-2xl font-extrabold text-emerald-400">{completedCount}</span>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div className="text-center px-4">
              <span className="text-xs text-slate-400 block mb-1">إجمالي التزام الفريق</span>
              <span className="text-2xl font-extrabold text-teal-300 font-mono">{overallPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Meetings List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-teal-400 flex items-center space-x-2 rtl:space-x-reverse">
            <Video className="w-5 h-5" />
            <span>قائمة الاجتماعات المكلف بمشاهدتها ({meetings.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800">
            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs text-slate-400">جاري تحميل الاجتماعات والسجلات...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 space-y-2">
            <CheckCircle className="w-12 h-12 text-teal-400 mx-auto opacity-80" />
            <p className="font-semibold text-sm">لا توجد اجتماعات جديدة مكلف بها حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.map(meeting => {
              const prog = progressMap[meeting.id];
              const effDuration = meeting.duration_seconds || 300;
              const totalWatched = prog?.total_watched_seconds || 0;
              const percent = Math.min(100, Math.round((totalWatched / effDuration) * 100));

              // Color coding rules: Red (<40%), Yellow (40-94%), Green (>=95%)
              let barColor = 'bg-rose-500';
              let badgeColor = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
              let badgeLabel = 'لم يبدأ';

              if (prog?.status === 'completed' || percent >= 95) {
                barColor = 'bg-emerald-500';
                badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
                badgeLabel = 'مكتمل (100%)';
              } else if (percent >= 40) {
                barColor = 'bg-amber-500';
                badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                badgeLabel = 'قيد المشاهدة';
              } else if (percent > 0) {
                barColor = 'bg-rose-500';
                badgeColor = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
                badgeLabel = 'بدأت للتو';
              }

              return (
                <div
                  key={meeting.id}
                  className="bg-slate-900 border border-slate-800 hover:border-teal-500/40 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center space-x-1 rtl:space-x-reverse">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{meeting.meeting_date}</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-1">
                        {meeting.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {meeting.description || 'لا يوجد وصف مضاف لهذا الاجتماع.'}
                      </p>
                    </div>
                  </div>

                  {/* Progress Stats Section */}
                  <div className="space-y-4 pt-3 border-t border-slate-800">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">نسبة مشاهدتك</span>
                        <span className={`font-mono font-bold ${percent >= 95 ? 'text-emerald-400' : percent >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {percent}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                      <div>
                        <span className="text-slate-500 block">الوقت المنجز:</span>
                        <span className="font-mono font-semibold text-slate-300">
                          {Math.floor(totalWatched / 60)}د / {Math.floor(effDuration / 60)}د
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">محاولات التخطي:</span>
                        <span className="font-semibold text-rose-400">
                          {prog?.skip_attempts || 0} محاولة
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectMeeting(meeting.id)}
                      className="w-full py-3 bg-brand-teal-500 hover:bg-brand-teal-600 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 rtl:space-x-reverse transition-colors text-xs shadow-lg shadow-teal-500/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{prog?.status === 'completed' ? 'إعادة مشاهدة الفيديو' : 'متابعة المشاهدة الآن'}</span>
                    </button>
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
