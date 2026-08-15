import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '../lib/types';
import { dbService } from '../lib/supabase';

export type Language = 'en' | 'ar';

interface AuthContextType {
  user: Profile | null;
  profiles: Profile[];
  language: Language;
  setLanguage: (lang: Language) => void;
  loginAs: (profileId: string) => void;
  logout: () => void;
  refreshProfiles: () => Promise<void>;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    appTitle: 'فانتومز لمتابعة الاجتماعات',
    appSubtitle: 'نظام التحقق من حضور ومشاهدة الاجتماعات 100% بدون تخطي',
    loginTitle: 'تسجيل الدخول للنظام',
    selectUser: 'اختر حسابك للدخول السريع',
    adminRole: 'قائد الفريق (أدمن)',
    memberRole: 'عضو الفريق',
    dashboard: 'لوحة التحكم',
    meetings: 'الاجتماعات',
    members: 'أعضاء الفريق',
    myMeetings: 'اجتماعاتي المكلف بها',
    watch: 'مشاهدة',
    status: 'الحالة',
    completion: 'نسبة الإنجاز',
    notStarted: 'لم يبدأ',
    inProgress: 'قيد المشاهدة',
    completed: 'مكتمل',
    skipAttempts: 'محاولات التخطي الممنوعة',
    lastWatched: 'آخر مشاهدة',
    watchTime: 'وقت المشاهدة الفعلي',
    totalDuration: 'إجمالي مدة الفيديو',
    antiSkipActive: 'نظام منع التخطي مفعل',
    tabSwitchWarning: 'تنبيه: التبديل لمغادرة الصفحة يوقف احتساب الوقت تلقائياً',
    speedNotice: 'تنبيه: تغيير سرعة التشغيل يحسب الوقت الحقيقي المنقضي فقط',
    exportCsv: 'تصدير التقرير (CSV)',
    createMeeting: 'إضافة اجتماع جديد',
    assignedMembers: 'الأعضاء المكلفون',
    videoUrl: 'رابط الفيديو (Google Drive أو مباشر)',
    videoSource: 'مصدر الفيديو',
    sendReminder: 'إرسال تذكير',
    timelineHeatmap: 'الخريطة الحرارية للمشاهدة',
    watchedRange: 'المقاطع المشاهدة',
    skippedRange: 'المقاطع المتخطاة',
    unwatchedRange: 'المقاطع غير المشاهدة',
    logout: 'تسجيل الخروج',
  },
  en: {
    appTitle: 'Phantoms Watch Tracker',
    appSubtitle: 'Verify 100% Team Meeting Video Watch Compliance - No Skipping Allowed',
    loginTitle: 'System Login',
    selectUser: 'Select Account for Instant Login',
    adminRole: 'Team Leader (Admin)',
    memberRole: 'Team Member',
    dashboard: 'Dashboard',
    meetings: 'Meetings',
    members: 'Team Members',
    myMeetings: 'My Assigned Meetings',
    watch: 'Watch',
    status: 'Status',
    completion: 'Completion',
    notStarted: 'Not Started',
    inProgress: 'In Progress',
    completed: 'Completed',
    skipAttempts: 'Blocked Skip Attempts',
    lastWatched: 'Last Watched',
    watchTime: 'Actual Watch Time',
    totalDuration: 'Total Video Duration',
    antiSkipActive: 'Anti-Skip Engine Active',
    tabSwitchWarning: 'Notice: Leaving or hiding this tab pauses watch time tracking.',
    speedNotice: 'Notice: Playback rate adjustments only accumulate real elapsed time.',
    exportCsv: 'Export Report (CSV)',
    createMeeting: 'Add New Meeting',
    assignedMembers: 'Assigned Members',
    videoUrl: 'Video Link (Google Drive / Direct Stream)',
    videoSource: 'Video Source',
    sendReminder: 'Send Reminder',
    timelineHeatmap: 'Watch Timeline Heatmap',
    watchedRange: 'Watched Segments',
    skippedRange: 'Skipped Segments',
    unwatchedRange: 'Unwatched Segments',
    logout: 'Logout',
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [user, setUser] = useState<Profile | null>(null);
  const [language, setLanguage] = useState<Language>('ar');

  const refreshProfiles = async () => {
    const list = await dbService.getProfiles();
    setProfiles(list);
    
    const savedUserId = localStorage.getItem('phantoms_active_user');
    if (savedUserId) {
      const active = list.find(p => p.id === savedUserId);
      if (active) {
        setUser(active);
        return;
      }
    }
    // Default to first profile if available
    if (list.length > 0 && !user) {
      setUser(list[0]);
    }
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  const loginAs = (profileId: string) => {
    const found = profiles.find(p => p.id === profileId);
    if (found) {
      setUser(found);
      localStorage.setItem('phantoms_active_user', found.id);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('phantoms_active_user');
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profiles,
        language,
        setLanguage,
        loginAs,
        logout,
        refreshProfiles,
        t,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
