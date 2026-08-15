import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import DoctorCard from './components/DoctorCard';
import QuestionModal from './components/QuestionModal';
import ConversationView from './components/ConversationView';
import AdminPanel from './components/AdminPanel';
import ThemeToggle from './components/ThemeToggle';
import DepartmentHub from './components/DepartmentHub';
import DepartmentDirectory from './components/DepartmentDirectory';
import StudentConversationsModal from './components/StudentConversationsModal';
import PwaInstallBanner from './components/PwaInstallBanner';
import NotificationCenter from './components/NotificationCenter';
import { registerServiceWorker, unsubscribeFromWebPush, playNotificationChime } from './services/notificationService';
import { UserCheck, MessageSquarePlus, RefreshCw, Sparkles, Search, MessageCircle, Code, Cpu, Shield, LogIn, LogOut, Loader2, Home } from 'lucide-react';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'admin'
  const [studentSubView, setStudentSubView] = useState('hub'); // 'hub' | 'directory'
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Doctors state
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorsError, setDoctorsError] = useState(false);

  // Student Conversations
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [showConversationsModal, setShowConversationsModal] = useState(false);

  // Question Modal
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // WhatsApp Status
  const [whatsappStatus, setWhatsappStatus] = useState({ status: 'connecting', qr: null, logs: [] });

  // Check logged in student and register PWA Service Worker
  useEffect(() => {
    registerServiceWorker();
    const savedUser = localStorage.getItem('studentUser');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        setShowLanding(false);
      } catch (e) {
        localStorage.removeItem('studentUser');
      }
    }
  }, []);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json'
    };
  };

  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      setDoctorsError(false);
      const res = await fetch('/api/doctors');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDoctors(data);
    } catch (err) {
      console.error(err);
      setDoctorsError(true);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchConversations = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/conversations?studentId=${currentUser.id}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/status', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) setWhatsappStatus(data);
    } catch (e) {}
  };

  useEffect(() => {
    if (!showLanding) {
      fetchDoctors();
      fetchWhatsAppStatus();
      const interval = setInterval(fetchWhatsAppStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [showLanding]);

  useEffect(() => {
    if (activeTab === 'student' && !showLanding) {
      fetchDoctors();
    }
  }, [activeTab, showLanding]);

  useEffect(() => {
    if (currentUser && !showLanding) {
      fetchConversations();
    }
  }, [currentUser, showLanding]);

  const handleLogin = async (email, password) => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'حدث خطأ أثناء تسجيل الدخول');
        return;
      }

      // حفظ المستخدم
      localStorage.setItem('studentUser', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setShowLanding(false);
      setShowLoginModal(false);
    } catch (err) {
      setLoginError('تعذّر الاتصال بالخادم');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (studentData) => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'حدث خطأ أثناء إنشاء الحساب');
        return;
      }

      localStorage.setItem('studentUser', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setShowLanding(false);
      setShowLoginModal(false);
    } catch (err) {
      setLoginError('تعذّر الاتصال بالخادم');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (currentUser?.id) {
      unsubscribeFromWebPush(currentUser.id);
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    setCurrentUser(null);
    localStorage.removeItem('studentUser');
    setShowLanding(true);
    setActiveTab('student');
  };

  const handleGetStarted = () => {
    if (currentUser) {
      setShowLanding(false);
    } else {
      setShowLoginModal(true);
    }
  };

  const categories = [
    { id: 'all', label: 'كافة التخصصات', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'it', label: 'تكنولوجيا المعلومات', icon: <Code className="w-3.5 h-3.5" /> },
    { id: 'cs', label: 'علوم الحاسب والذكاء الاصطناعي', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'networks', label: 'الأمن السيبراني والشبكات', icon: <Shield className="w-3.5 h-3.5" /> }
  ];

  const filteredDoctors = doctors.filter(doc => {
    const docDept = doc.department || '';
    const docSpec = doc.specialty || '';
    const docName = doc.fullName || '';

    const matchesSearch =
      docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docDept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docSpec.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === 'it') return matchesSearch && (docDept.includes('تكنولوجيا') || docDept.includes('برمجيات'));
    if (selectedCategory === 'cs') return matchesSearch && (docDept.includes('علوم') || docDept.includes('ذكاء'));
    if (selectedCategory === 'networks') return matchesSearch && (docDept.includes('شبكات') || docDept.includes('أمن'));

    return matchesSearch;
  });

  // صفحة تسجيل الدخول المخصصة
  if (showLoginModal) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onRegister={handleRegister}
        onBack={() => {
          setShowLoginModal(false);
          setLoginError('');
        }}
        error={loginError}
        loading={loginLoading}
      />
    );
  }

  // Show Landing Page if not logged in or explicitly showing
  if (showLanding) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <LandingPage onGetStarted={handleGetStarted} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-theme-primary">
      {/* PWA App Install Banner */}
      <PwaInstallBanner />

      {/* Sticky Full-Width Top Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-glass)] backdrop-blur-xl border-b border-theme transition-all mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2e9b9b] to-[#22696a] flex items-center justify-center shadow-brand">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-theme-primary">منصة التواصل الأكاديمي</h1>
              <p className="text-[11px] text-theme-muted">جامعة برج العرب التكنولوجية</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && activeTab === 'student' && (
              <>
                <button
                  onClick={() => {
                    fetchConversations();
                    setShowConversationsModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0f766e]/10 text-[#0f766e] dark:text-teal-300 border border-[#0f766e]/30 text-xs font-bold hover:bg-[#0f766e]/20 transition-all flex items-center gap-1.5 relative shadow-xs"
                >
                  <MessageCircle className="w-4 h-4 text-[#0f766e]" />
                  <span>محادثاتي</span>
                  {conversations.some((c) => c.status === 'answered') && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute -top-1 -right-1 animate-pulse" />
                  )}
                </button>

                <NotificationCenter userId={currentUser.id} userType="student" />
              </>
            )}

            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl surface-card border-theme">
                <UserCheck className="w-4 h-4 text-[#2e9b9b]" />
                <span className="text-xs text-theme-primary font-bold">{currentUser.fullName}</span>
              </div>
            )}

            <ThemeToggle />

            <button
              onClick={() => setActiveTab(activeTab === 'student' ? 'admin' : 'student')}
              className="px-3.5 py-1.5 rounded-xl surface-card border-theme text-xs text-theme-primary font-semibold hover:border-[#2e9b9b]/50 transition-all"
            >
              {activeTab === 'student' ? 'لوحة التحكم' : 'واجهة الطلاب'}
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl surface-card border-theme hover:border-rose-500/40 text-theme-secondary hover:text-rose-500 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">

        {/* Student View */}
        {activeTab === 'student' && (
          <main className="space-y-6">
            {selectedConversationId ? (
              <ConversationView
                conversationId={selectedConversationId}
                onBack={() => {
                  setSelectedConversationId(null);
                  fetchConversations();
                }}
              />
            ) : studentSubView === 'hub' ? (
              <DepartmentHub
                onSelectDepartment={(deptKey) => {
                  setSelectedCategory(deptKey);
                  setStudentSubView('directory');
                }}
                currentUser={currentUser}
                onOpenConversations={() => {
                  setStudentSubView('directory');
                }}
              />
            ) : (
              <DepartmentDirectory
                initialDepartmentKey={selectedCategory || 'doctors'}
                onBackToHub={() => setStudentSubView('hub')}
                currentUser={currentUser}
                onLogout={handleLogout}
                onOpenConversation={(convId) => {
                  setSelectedConversationId(convId);
                }}
                onOpenQuestionModal={async (staffMember) => {
                  if (!currentUser) {
                    setShowLoginModal(true);
                    return;
                  }

                  try {
                    const res = await fetch('/api/conversations', {
                      method: 'POST',
                      headers: getAuthHeaders(),
                      body: JSON.stringify({
                        studentId: currentUser.id,
                        doctorId: staffMember.id,
                        subject: `استفسار مع ${staffMember.fullName}`,
                        questionContent: ''
                      })
                    });
                    const data = await res.json();
                    if (res.ok && data.conversation) {
                      await fetchConversations();
                      setSelectedConversationId(data.conversation.id);
                    } else {
                      alert(data.error || 'تعذر فتح المحادثة');
                    }
                  } catch (err) {
                    console.error('Error opening chat:', err);
                    alert('حدث خطأ أثناء فتح الشات التفاعلي');
                  }
                }}
              />
            )}
          </main>
        )}

        {/* Admin Panel */}
        {activeTab === 'admin' && (
          <AdminPanel
            whatsappStatus={whatsappStatus}
            onRefreshStatus={fetchWhatsAppStatus}
            onDoctorAdded={fetchDoctors}
          />
        )}
      </div>

      {/* Sleek Minimalist Footer */}
      <footer className="mt-12 py-4 text-center text-xs text-theme-muted border-t border-theme/40">
        <p className="font-medium">AES-256 Encryption • جامعة برج العرب التكنولوجية • منصة التواصل الأكاديمي © 2026</p>
      </footer>

      {/* Question Modal */}
      {selectedDoctor && currentUser && (
        <QuestionModal
          doctor={selectedDoctor}
          student={currentUser}
          isOpen={showQuestionModal}
          onClose={() => {
            setShowQuestionModal(false);
            setSelectedDoctor(null);
          }}
          onSuccess={(conv) => {
            fetchConversations();
            setSelectedConversationId(conv.id);
          }}
        />
      )}
      {/* Student Conversations List Modal */}
      <StudentConversationsModal
        isOpen={showConversationsModal}
        onClose={() => setShowConversationsModal(false)}
        conversations={conversations}
        onRefresh={fetchConversations}
        onSelectConversation={(convId) => {
          setSelectedConversationId(convId);
        }}
      />
    </div>
  );
}
