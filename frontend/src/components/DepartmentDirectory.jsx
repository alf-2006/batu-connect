import React, { useState, useEffect } from 'react';
import {
  Home,
  GraduationCap,
  Users,
  Building2,
  ShieldCheck,
  MessageCircle,
  Settings,
  LogOut,
  Search,
  Filter,
  ArrowRight,
  Send,
  CheckCircle,
  Clock,
  Mail,
  User,
  Sparkles,
  BookOpen,
  Menu,
  X
} from 'lucide-react';

export default function DepartmentDirectory({
  initialDepartmentKey = 'doctors',
  onBackToHub,
  onOpenQuestionModal,
  onOpenConversation,
  currentUser,
  onLogout
}) {
  const [activeDeptKey, setActiveDeptKey] = useState(initialDepartmentKey);
  const [departments, setDepartments] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch active departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/departments');
        const data = await res.json();
        if (res.ok) setDepartments(data);
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch staff members by department key & search
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (activeDeptKey !== 'all') params.append('departmentKey', activeDeptKey);
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (currentUser?.id) params.append('studentId', currentUser.id);

        const res = await fetch(`/api/doctors?${params.toString()}`);
        const data = await res.json();
        if (res.ok) setStaffMembers(data);
      } catch (err) {
        console.error('Error fetching staff members:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [activeDeptKey, debouncedSearch, currentUser?.id]);

  const currentDept = departments.find((d) => d.key === activeDeptKey) || {
    nameAr: activeDeptKey === 'all' ? 'جميع الأقسام' : 'الدكاترة',
    memberCount: staffMembers.length
  };

  const navItems = [
    { key: 'hub', label: 'الرئيسية', icon: <Home className="w-4 h-4" /> },
    { key: 'doctors', label: 'الدكاترة', icon: <GraduationCap className="w-4 h-4" /> },
    { key: 'ta', label: 'المعيدين', icon: <Users className="w-4 h-4" /> },
    { key: 'student_affairs', label: 'شؤون الطلبة', icon: <Building2 className="w-4 h-4" /> },
    { key: 'admin_staff', label: 'الإدارة', icon: <ShieldCheck className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex dir-rtl">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-5 space-y-6">
          {/* Logo Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-[#0f766e] text-white flex items-center justify-center font-extrabold shadow-md shadow-[#0f766e]/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 dark:text-white font-display">منصة التواصل الأكاديمي</div>
              <div className="text-[10px] text-slate-500 font-medium">جامعة برج العرب التكنولوجية</div>
            </div>
          </div>

          {/* Department Nav Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.key === 'hub' ? false : activeDeptKey === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => {
                    if (item.key === 'hub') {
                      onBackToHub();
                    } else {
                      setActiveDeptKey(item.key);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#0f766e]/10 text-[#0f766e] dark:text-teal-300 border border-[#0f766e]/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {currentUser && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0f766e]/20 text-[#0f766e] dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-500 truncate">{currentUser.email}</div>
              </div>
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          )}
        </div>
      </aside>

      {/* Main Directory Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Control Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 md:hidden hover:bg-slate-200 transition-all"
              title="القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              onClick={onBackToHub}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              العودة لجميع الأقسام
            </button>

            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-display">
                {currentDept.nameAr}
              </h2>
              <span className="text-xs text-slate-500 font-medium">{staffMembers.length} عضو متاح للتواصل</span>
            </div>
          </div>

          {/* Mobile-Only Quick Department Filter Chips (Hidden on desktop to avoid repetition with sidebar) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full md:hidden">
            {navItems
              .filter((i) => i.key !== 'hub')
              .map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveDeptKey(item.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    activeDeptKey === item.key
                      ? 'bg-[#0f766e] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
          </div>
        </header>

        {/* Directory Content & Search Bar */}
        <div className="p-4 sm:p-6 space-y-6 flex-1">
          {/* Search & Filter Controls */}
          <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن عضو بالكادر بالاسم أو التخصص..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-10 pl-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0f766e]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-200"
              >
                إلغاء التصفية
              </button>
            )}
          </div>

          {/* Members List Cards */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : staffMembers.length > 0 ? (
            <div className="space-y-4">
              {staffMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-4 flex-wrap"
                >
                  {/* Left Info Column */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.fullName}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-[#0f766e]/30 shadow-xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0f766e] to-teal-800 text-white flex items-center justify-center shadow-xs">
                          <User className="w-7 h-7 text-white/90" />
                        </div>
                      )}
                      <span
                        className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute -bottom-0.5 -right-0.5 shadow-xs"
                        title="نشط الآن"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {member.fullName}
                        </h3>
                        {member.title && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                            {member.title}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                        <span>{member.department}</span>
                        {member.specialty && <span>• {member.specialty}</span>}
                      </div>

                      {member.unreadCount > 0 && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold">
                          <Mail className="w-3 h-3 text-emerald-500" />
                          يوجد رد جديد من الدكتور
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action Button Column */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    {member.conversationId ? (
                      <button
                        onClick={() => onOpenConversation(member.conversationId)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4 text-[#0f766e]" />
                        عرض الرسائل والمحادثة
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenQuestionModal(member)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0f766e] hover:bg-[#0f766e]/90 text-white font-bold text-xs shadow-md shadow-[#0f766e]/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        إرسال استفسار جديد
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <User className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">لا توجد نتائج مطابقة لبحثك</h3>
              <p className="text-xs text-slate-500">تأكد من كتابة الاسم أو التخصص بشكل صحيح أو جرب تغيير القسم المختار.</p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex dir-rtl md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsMobileDrawerOpen(false)} />
          <aside className="relative w-72 bg-white dark:bg-slate-900 h-full p-5 space-y-6 flex flex-col justify-between shadow-2xl z-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-[#0f766e]" />
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">الأقسام والخدمات</span>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = item.key === 'hub' ? false : activeDeptKey === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        if (item.key === 'hub') {
                          onBackToHub();
                        } else {
                          setActiveDeptKey(item.key);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#0f766e]/10 text-[#0f766e] dark:text-teal-300 border border-[#0f766e]/30'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
