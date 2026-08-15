import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  Building2,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Search,
  MessageCircle,
  Bell,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';

const DEPARTMENT_THEMES = {
  teal: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    border: 'border-emerald-500/30 hover:border-emerald-500/60',
    iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    arrowBg: 'bg-emerald-600 text-white hover:bg-emerald-700',
    glow: 'group-hover:shadow-emerald-500/20'
  },
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    border: 'border-blue-500/30 hover:border-blue-500/60',
    iconBg: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
    arrowBg: 'bg-blue-600 text-white hover:bg-blue-700',
    glow: 'group-hover:shadow-blue-500/20'
  },
  orange: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
    arrowBg: 'bg-amber-600 text-white hover:bg-amber-700',
    glow: 'group-hover:shadow-amber-500/20'
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    border: 'border-purple-500/30 hover:border-purple-500/60',
    iconBg: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
    arrowBg: 'bg-purple-600 text-white hover:bg-purple-700',
    glow: 'group-hover:shadow-purple-500/20'
  }
};

export default function DepartmentHub({ onSelectDepartment, currentUser, onOpenConversations }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/departments');
        const data = await res.json();
        if (res.ok) {
          setDepartments(data);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'graduation-cap':
        return <GraduationCap className="w-8 h-8" />;
      case 'users':
        return <Users className="w-8 h-8" />;
      case 'building':
        return <Building2 className="w-8 h-8" />;
      case 'shield':
        return <ShieldCheck className="w-8 h-8" />;
      default:
        return <GraduationCap className="w-8 h-8" />;
    }
  };

  const filteredDepartments = departments.filter(
    (d) =>
      d.nameAr.includes(searchQuery) ||
      (d.nameEn && d.nameEn.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 dir-rtl max-w-6xl mx-auto px-4 py-6">
      {/* Welcome Banner */}
      <div className="text-center space-y-3 py-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0f766e]/10 border border-[#0f766e]/30 text-[#0f766e] dark:text-teal-300 text-xs font-bold shadow-xs">
          <Sparkles className="w-4 h-4 text-[#0f766e]" />
          منصة التواصل الأكاديمي • جامعة برج العرب التكنولوجية
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">
          مرحباً بك في منصة التواصل الأكاديمي
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium max-w-xl mx-auto">
          اختر الجهة التي تريد إدارة استفساراتك وتواصلك المباشر معها
        </p>

        {/* Quick Search Input */}
        <div className="pt-4 max-w-md mx-auto relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن قسم أو جهة أكاديمية..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pr-11 pl-4 text-xs sm:text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none focus:border-[#0f766e] transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Grid of Department Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse border border-slate-300/40 dark:border-slate-700/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredDepartments.map((dept) => {
            const theme = DEPARTMENT_THEMES[dept.colorToken] || DEPARTMENT_THEMES.teal;

            return (
              <div
                key={dept.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDepartment(dept.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectDepartment(dept.key);
                }}
                className={`group relative p-6 rounded-3xl ${theme.bg} border ${theme.border} shadow-sm hover:shadow-xl ${theme.glow} transition-all duration-300 flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0f766e]`}
              >
                {/* Top Row: Icon & Counter Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl ${theme.iconBg} flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 duration-300`}
                  >
                    {getIconComponent(dept.icon)}
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${theme.badge}`}>
                    {dept.memberCount} عضو
                  </span>
                </div>

                {/* Body Content */}
                <div className="space-y-2 mb-6">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-display">
                    {dept.nameAr}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    {dept.key === 'doctors' && 'الرسائل الموجهة لأعضاء هيئة التدريس'}
                    {dept.key === 'ta' && 'الرسائل الموجهة للمعيدين والمساعدين'}
                    {dept.key === 'student_affairs' && 'الرسائل المتعلقة بشؤون الطلاب والخدمات'}
                    {dept.key === 'admin_staff' && 'الرسائل الموجهة لإدارة المنصة والإداريين'}
                  </p>
                </div>

                {/* Footer: Forward Arrow Button */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-900/5 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:translate-x-[-4px] transition-transform">
                    دخول القسم
                  </span>
                  <div
                    className={`w-9 h-9 rounded-full ${theme.arrowBg} flex items-center justify-center shadow-md transition-transform group-hover:scale-110`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
