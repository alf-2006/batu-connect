import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck, QrCode, PlusCircle, MessageCircle, Play, RefreshCw, Lock, Radio, CheckCircle, Smartphone,
  Edit3, Trash2, ToggleLeft, ToggleRight, FileSpreadsheet, UploadCloud, DownloadCloud, XCircle, FileText,
  Terminal, AlertTriangle, Bug, Code, Copy, Search, ShieldAlert, Cpu, Activity, Users
} from 'lucide-react';
import AdminManagementTab from './admin/AdminManagementTab';

export default function AdminPanel({ whatsappStatus, onRefreshStatus, onDoctorAdded }) {
  const [activeSubTab, setActiveSubTab] = useState('whatsapp'); // 'whatsapp', 'doctors', 'conversations', 'simulator', 'diagnostics', 'sub_admins'

  // Logged-in Admin Profile & Permissions
  const [adminProfile, setAdminProfile] = useState(null);

  const fetchAdminProfile = async () => {
    try {
      const res = await fetch('/api/admin/me', {
        headers: getAdminHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAdminProfile(data);
      }
    } catch (e) {
      console.error('Fetch admin profile error:', e);
    }
  };

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const hasPermission = (key) => {
    if (!adminProfile) return true;
    if (adminProfile.isSuperAdmin) return true;
    return Array.isArray(adminProfile.permissions) && adminProfile.permissions.includes(key);
  };

  // Developer Diagnostics State
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagSearch, setDiagSearch] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);

  const fetchDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const res = await fetch('/api/admin/system/diagnostics', {
        headers: getAdminHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch (err) {
      console.error('Fetch diagnostics error:', err);
    } finally {
      setDiagLoading(false);
    }
  };
  
  // Doctors state
  const [doctors, setDoctors] = useState([]);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocDept, setNewDocDept] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocCourses, setNewDocCourses] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('01212345678');
  const [docLoading, setDocLoading] = useState(false);

  // Conversations state
  const [conversations, setConversations] = useState([]);

  // Simulator state - SECURITY FIX: Added missing state variables
  const [simPhone, setSimPhone] = useState('01212345678');
  const [simContent, setSimContent] = useState('هذا رد تجريبي من الدكتور على السؤال');
  const [simQuotedId, setSimQuotedId] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simMessage, setSimMessage] = useState('');

  // Test sending state
  const [testDoctorPhone, setTestDoctorPhone] = useState('01212345678');
  const [testStudentName, setTestStudentName] = useState('أحمد علي الكومي (طالب تجريبي)');
  const [testSubject, setTestSubject] = useState('استفسار حول ميعاد المحاضرة والقاعة');
  const [testQuestion, setTestQuestion] = useState('دكتور، هل حضرتك هتكون متواجد بكرة في المكتب؟');
  const [testStudentLoading, setTestStudentLoading] = useState(false);
  const [testStudentMessage, setTestStudentMessage] = useState('');

  // Disconnect / Switch Number state
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  // Edit Doctor state
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false);
  const [editDocName, setEditDocName] = useState('');
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocDept, setEditDocDept] = useState('');
  const [editDocSpecialty, setEditDocSpecialty] = useState('');
  const [editDocCourses, setEditDocCourses] = useState('');
  const [editDocPhone, setEditDocPhone] = useState('');
  const [editAvatarBase64, setEditAvatarBase64] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Import Doctors state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const getAdminHeaders = () => {
    const token = localStorage.getItem('studentToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchAdminDoctors = async () => {
    try {
      const res = await fetch('/api/admin/doctors', {
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (res.ok) setDoctors(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendStudentTest = async (e) => {
    e.preventDefault();
    if (!testDoctorPhone.trim()) {
      alert('يرجى كتابة رقم هاتف الواتساب المستهدف للإرسال');
      return;
    }
    setTestStudentLoading(true);
    setTestStudentMessage('');
    try {
      const res = await fetch('/api/admin/whatsapp/send-student-test', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          doctorPhone: testDoctorPhone.trim(),
          studentName: testStudentName,
          subject: testSubject,
          questionContent: testQuestion
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال السؤال التجريبي');
      setTestStudentMessage(`✅ ${data.message} [كود المحادثة: ${data.referenceCode}]`);
      fetchAdminConversations();
    } catch (err) {
      setTestStudentMessage(`❌ ${err.message}`);
    } finally {
      setTestStudentLoading(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm('هل أنت تأكيد من رغبتك في تبديل رقم الواتساب المربوط بالمنصة؟ سيتم تسجيل الخروج وتوليد رمز QR جديد لربط رقم هاتف جديد.')) {
      return;
    }

    try {
      setDisconnectLoading(true);
      const res = await fetch('/api/admin/whatsapp/disconnect', {
        method: 'POST',
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل قطع الاتصال بالواتساب');
      onRefreshStatus();
    } catch (err) {
      alert(err.message || 'حدث خطأ أثناء تبديل الرقم');
    } finally {
      setDisconnectLoading(false);
    }
  };

  const fetchAdminConversations = async () => {
    try {
      const res = await fetch('/api/admin/conversations', {
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (res.ok) setConversations(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAdminDoctors();
    fetchAdminConversations();
  }, []);

  // Action: Toggle Active Status
  const handleToggleActiveDoctor = async (docId) => {
    try {
      const res = await fetch(`/api/admin/doctors/${docId}/toggle-active`, {
        method: 'PATCH',
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير حالة الحساب');
      fetchAdminDoctors();
      onDoctorAdded?.();
    } catch (err) {
      alert(err.message);
    }
  };

  // Action: Delete Doctor
  const handleDeleteDoctor = async (doc) => {
    if (!window.confirm(`هل أنت تأكيد من حذف الدكتور (${doc.fullName}) بشكل نهائي؟ سيتم حذف جميع الرسائل والمحادثات المرتبطة به.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/doctors/${doc.id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الدكتور');
      alert(data.message);
      fetchAdminDoctors();
      onDoctorAdded?.();
    } catch (err) {
      alert(err.message);
    }
  };

  // Action: Open Edit Modal
  const openEditModal = (doc) => {
    setEditingDoctor(doc);
    setEditDocName(doc.fullName || '');
    setEditDocTitle(doc.title || '');
    setEditDocDept(doc.department || '');
    setEditDocSpecialty(doc.specialty || '');
    setEditDocCourses(doc.courses || '');
    setEditDocPhone('');
    setEditAvatarBase64(null);
    setEditAvatarPreview(doc.avatarUrl || null);
    setShowEditDoctorModal(true);
  };

  const handleEditAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير، يرجى اختيار صورة أقل من 5 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setEditAvatarBase64(evt.target.result);
      setEditAvatarPreview(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  };

  // Action: Submit Edit Doctor
  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/doctors/${editingDoctor.id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          fullName: editDocName,
          title: editDocTitle,
          department: editDocDept,
          specialty: editDocSpecialty,
          courses: editDocCourses,
          whatsappNumber: editDocPhone || undefined,
          avatarBase64: editAvatarBase64
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تعديل البيانات');
      alert(data.message);
      setShowEditDoctorModal(false);
      fetchAdminDoctors();
      onDoctorAdded?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Action: Export Excel CSV
  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('studentToken');
      const res = await fetch('/api/admin/doctors/export', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('فشل تصدير بيانات Excel');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doctors_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(err.message);
    }
  };

  // Action: Import Excel / CSV
  const handleImportExcel = async (e) => {
    e.preventDefault();
    if (!importCsvText.trim()) {
      alert('يرجى تقديم بيانات CSV أو Excel للاستيراد');
      return;
    }
    setImportLoading(true);
    try {
      const res = await fetch('/api/admin/doctors/import', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ csvText: importCsvText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل استيراد البيانات');
      alert(data.message);
      setShowImportModal(false);
      setImportCsvText('');
      fetchAdminDoctors();
      onDoctorAdded?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const [avatarBase64, setAvatarBase64] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير، يرجى اختيار صورة أقل من 5 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAvatarBase64(evt.target.result);
      setAvatarPreview(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  };

  const clearAvatar = () => {
    setAvatarBase64(null);
    setAvatarPreview(null);
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setDocLoading(true);
    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          fullName: newDocName,
          title: newDocTitle,
          department: newDocDept,
          specialty: newDocSpecialty,
          courses: newDocCourses,
          whatsappNumber: newDocPhone,
          avatarBase64: avatarBase64
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة الدكتور');

      alert('تمت إضافة الدكتور بنجاح وتشفير رقم الهاتف!');
      setShowAddDoctorModal(false);
      setNewDocName('');
      setNewDocTitle('');
      setNewDocDept('');
      setNewDocSpecialty('');
      setNewDocCourses('');
      setNewDocPhone('');
      clearAvatar();
      fetchAdminDoctors();
      onDoctorAdded?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setDocLoading(false);
    }
  };

  const handleSimulateReply = async (e) => {
    e.preventDefault();
    setSimLoading(true);
    setSimMessage('');
    try {
      const res = await fetch('/api/admin/whatsapp/simulate', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          doctorPhone: simPhone,
          messageContent: simContent,
          quotedMessageId: simQuotedId || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت محاكاة الرد');
      setSimMessage(data.message);
      fetchAdminConversations();
    } catch (err) {
      setSimMessage(err.message);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-theme pb-3 flex-wrap">
        {hasPermission('manage_whatsapp') && (
          <button
            onClick={() => setActiveSubTab('whatsapp')}
            className={`btn ${activeSubTab === 'whatsapp' ? 'btn-primary' : 'btn-secondary'} text-xs py-2 px-4`}
          >
            <QrCode className="w-4 h-4" /> ربط سيرفر التواصل
          </button>
        )}

        {hasPermission('manage_doctors') && (
          <button
            onClick={() => setActiveSubTab('doctors')}
            className={`btn ${activeSubTab === 'doctors' ? 'btn-primary' : 'btn-secondary'} text-xs py-2 px-4`}
          >
            <ShieldCheck className="w-4 h-4" /> إدارة أرقام الدكاترة المشفرة
          </button>
        )}

        {hasPermission('simulator') && (
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`btn ${activeSubTab === 'simulator' ? 'btn-primary' : 'btn-secondary'} text-xs py-2 px-4`}
          >
            <Play className="w-4 h-4" /> محاكي الردود للاختبار المباشر
          </button>
        )}

        {hasPermission('view_chats') && (
          <button
            onClick={() => setActiveSubTab('conversations')}
            className={`btn ${activeSubTab === 'conversations' ? 'btn-primary' : 'btn-secondary'} text-xs py-2 px-4`}
          >
            <MessageCircle className="w-4 h-4" /> سجل المحادثات العام ({conversations.length})
          </button>
        )}

        {hasPermission('diagnostics') && (
          <button
            onClick={() => { setActiveSubTab('diagnostics'); fetchDiagnostics(); }}
            className={`btn ${activeSubTab === 'diagnostics' ? 'btn-primary' : 'btn-secondary'} text-xs py-2 px-4`}
          >
            <Terminal className="w-4 h-4" /> سجل الأخطاء والتشخيص
          </button>
        )}

        {adminProfile?.isSuperAdmin && (
          <button
            onClick={() => setActiveSubTab('sub_admins')}
            className={`btn ${activeSubTab === 'sub_admins' ? 'btn-primary font-extrabold shadow-md' : 'btn-secondary'} text-xs py-2 px-4`}
          >
            <Users className="w-4 h-4 text-amber-500" /> إدارة المشرفين والصلاحيات
          </button>
        )}
      </div>

      {/* Tab 1: WhatsApp Setup & QR */}
      {activeSubTab === 'whatsapp' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Box */}
          <div className="glass-card p-6 border border-[#2e9b9b]/30 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-[#2e9b9b]" />
              <h3 className="font-bold text-theme-primary text-lg">ربط سيرفر التواصل الموحد</h3>
            </div>

            {whatsappStatus?.status === 'connected' ? (
              <div className="my-6 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 w-full">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                <h4 className="font-bold text-lg text-theme-primary">جلسة التواصل نشطة ومصادق عليها!</h4>
                <p className="text-xs text-theme-secondary mt-2">
                  رقم الأتمتة جاهز لاستقبال وإرسال جميع أسئلة الطلاب وردود الدكاترة.
                </p>
              </div>
            ) : whatsappStatus?.qr ? (
              <div className="my-4 p-4 bg-white rounded-2xl shadow-xl border-4 border-[#2e9b9b]">
                <img src={whatsappStatus.qr} alt="QR Code" className="w-64 h-64 mx-auto" />
                <p className="text-slate-900 text-xs font-bold mt-2">
                  افتح التطبيق المرتبط ← الأجهزة المرتبطة ← امسح الرمز
                </p>
              </div>
            ) : (
              <div className="my-12 text-theme-muted text-sm">
                <RefreshCw className="w-8 h-8 text-[#2e9b9b] animate-spin mx-auto mb-3" />
                جاري الاتصال وسحب رمز QR الجديد...
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              <button onClick={onRefreshStatus} className="btn btn-secondary text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> تحديث حالة الاتصال
              </button>
              <button
                onClick={handleDisconnectWhatsApp}
                disabled={disconnectLoading}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${disconnectLoading ? 'animate-spin' : ''}`} />
                {disconnectLoading ? 'جاري الفصل...' : 'تبديل الرقم / ربط رقم جديد'}
              </button>
            </div>
          </div>

          {/* Logs Terminal Box */}
          <div className="glass-card p-6 border border-theme flex flex-col">
            <h3 className="font-bold text-theme-primary mb-3 text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#2e9b9b] animate-pulse" /> سجل أحداث السيرفر و Baileys (Logs)
            </h3>
            <div className="bg-[#0b1220] p-4 rounded-xl font-mono text-[11px] text-emerald-400/90 h-[300px] overflow-y-auto border border-[#2e9b9b]/20 space-y-1.5 dir-ltr text-left">
              {whatsappStatus?.logs && whatsappStatus.logs.length > 0 ? (
                whatsappStatus.logs.map((log, idx) => <div key={idx}>{log}</div>)
              ) : (
                <div className="text-gray-500 italic">No logs available yet...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Manage Doctors & Encryption */}
      {activeSubTab === 'doctors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-theme-primary text-lg">قائمة أرقام الدكاترة المشفرة (AES-256)</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleExportExcel} className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5" title="تصدير إلى ملفت Excel">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> تصدير إلى Excel
              </button>
              <button onClick={() => setShowImportModal(true)} className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5" title="استيراد دفعة دكاترة عبر CSV / Excel">
                <UploadCloud className="w-4 h-4 text-[#2e9b9b]" /> استيراد من Excel
              </button>
              <button onClick={() => setShowAddDoctorModal(true)} className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" /> إضافة دكتور جديد
              </button>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[var(--surface-2)] text-theme-muted border-b border-theme">
                <tr>
                  <th className="p-3">اسم الدكتور</th>
                  <th className="p-3">القسم والتخصص</th>
                  <th className="p-3">رقم الهاتف (الرأي العام)</th>
                  <th className="p-3">حالة التشفير</th>
                  <th className="p-3">حالة التفعيل</th>
                  <th className="p-3 text-center">الإجراءات والتحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="p-3 font-semibold text-theme-primary">
                      <div className="flex items-center gap-2">
                        {doc.fullName}
                        {doc.title && <span className="badge badge-amber text-[9px] py-0.2 px-1.5">{doc.title}</span>}
                      </div>
                    </td>
                    <td className="p-3 text-theme-secondary">
                      {[doc.department, doc.specialty].filter(Boolean).join(' • ') || 'غير محدد'}
                    </td>
                    <td className="p-3 font-mono text-[#2e9b9b] font-bold">{doc.whatsappMasked}</td>
                    <td className="p-3">
                      <span className="badge badge-olive text-[10px] inline-flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-500" /> AES-256-GCM
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleActiveDoctor(doc.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 ${
                          doc.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                        }`}
                        title={doc.isActive ? 'انقر لإلغاء التفعيل' : 'انقر لتفعيل الدكتور'}
                      >
                        {doc.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {doc.isActive ? 'مفعل' : 'غير مفعل'}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(doc)}
                          className="p-1.5 rounded-lg surface-card text-theme-secondary hover:text-[#2e9b9b] border border-theme hover:border-[#2e9b9b]/50 transition-all"
                          title="تعديل بيانات الدكتور"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(doc)}
                          className="p-1.5 rounded-lg surface-card text-rose-500 hover:bg-rose-500/10 border border-theme hover:border-rose-500/40 transition-all"
                          title="حذف الدكتور نهائياً"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Interactive WhatsApp Simulator */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-6">
          {/* Test Message Sending */}
          <div className="glass-card p-6 border border-[#2e9b9b]/40 shadow-xl rounded-2xl">
            <div className="mb-6 border-b border-theme pb-4">
              <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                <Play className="w-5 h-5 text-[#2e9b9b]" /> محاكي إرسال رسالة طالب للواتساب مباشرة
              </h3>
              <p className="text-xs text-theme-muted mt-1">
                أدخل أي رقم هاتف واتساب ترغب في تجربة الإرسال إليه واكتب نص الرسالة ليصل فوراً إلى الواتساب.
              </p>
            </div>

            {testStudentMessage && (
              <div className={`mb-4 p-3 rounded-xl border text-xs font-bold ${
                testStudentMessage.includes('بنجاح')
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              }`}>
                {testStudentMessage}
              </div>
            )}

            <form onSubmit={handleSendStudentTest} className="space-y-4">
              {/* Custom Doctor Phone Input */}
              <div>
                <label className="input-label font-bold text-theme-primary mb-1 block">
                  رقم هاتف الدكتور / الواتساب المستقبل <span className="text-rose-500 font-extrabold">*</span>
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    className="input-field rounded-r-xl rounded-l-none border-l-0 font-mono font-bold text-right text-xs"
                    value={testDoctorPhone}
                    onChange={(e) => setTestDoctorPhone(e.target.value)}
                    placeholder="01212345678"
                  />
                  <span className="px-3 py-2.5 bg-[var(--surface-2)] text-theme-primary font-bold text-xs border border-theme rounded-l-xl flex items-center gap-1 shrink-0 dir-ltr">
                    +20
                  </span>
                </div>
                <p className="text-[11px] text-theme-muted mt-1">
                  اكتب رقمك عادي مثل: <code className="text-[#2e9b9b] font-mono">01212345678</code> وسيتم الإرسال إليه فوراً بفورمات +20 تلقائياً!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="input-label font-medium">اسم الطالب (اختياري)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={testStudentName}
                    onChange={(e) => setTestStudentName(e.target.value)}
                    placeholder="أحمد علي الكومي"
                  />
                </div>
                <div>
                  <label className="input-label font-medium">موضوع الرسالة (اختياري)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                    placeholder="استفسار أكاديمي"
                  />
                </div>
              </div>

              <div>
                <label className="input-label font-bold text-theme-primary">
                  نص السؤال المرسل للدكتور عبر الواتساب <span className="text-rose-500 font-extrabold">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  className="input-field resize-none"
                  value={testQuestion}
                  onChange={(e) => setTestQuestion(e.target.value)}
                  placeholder="اكتب الاستفسار المرسل للدكتور..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={testStudentLoading}
                className="btn btn-primary w-full font-bold py-3 text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#2e9b9b]/20"
              >
                <Smartphone className="w-4 h-4" />
                {testStudentLoading ? 'جاري الإرسال إلى رقم الواتساب المكتوب...' : 'إرسال السؤال إلى واتساب الرقم المكتوب الآن'}
              </button>
            </form>
          </div>

          {/* SECURITY FIX: Simulator Reply Section (was broken before) */}
          <div className="glass-card p-6 border border-amber-500/40 shadow-xl rounded-2xl">
            <div className="mb-6 border-b border-theme pb-4">
              <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-amber-500" /> محاكي رد دكتور (Simulate Reply)
              </h3>
              <p className="text-xs text-theme-muted mt-1">
                محاكاة رد من دكتور بدون استخدام واتساب حقيقي - للاختبار السريع
              </p>
            </div>

            {simMessage && (
              <div className={`mb-4 p-3 rounded-xl border text-xs font-bold ${
                simMessage.includes('بنجاح')
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              }`}>
                {simMessage}
              </div>
            )}

            <form onSubmit={handleSimulateReply} className="space-y-4">
              <div>
                <label className="input-label font-bold text-theme-primary">
                  رقم هاتف الدكتور <span className="text-rose-500 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="input-field font-mono"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  placeholder="01212345678"
                />
              </div>

              <div>
                <label className="input-label font-bold text-theme-primary">
                  نص رد الدكتور <span className="text-rose-500 font-extrabold">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  className="input-field resize-none"
                  value={simContent}
                  onChange={(e) => setSimContent(e.target.value)}
                  placeholder="اكتب رد الدكتور التجريبي..."
                ></textarea>
              </div>

              <div>
                <label className="input-label font-medium">
                  Quoted Message ID (اختياري - للرد على رسالة معينة)
                </label>
                <input
                  type="text"
                  className="input-field font-mono text-xs"
                  value={simQuotedId}
                  onChange={(e) => setSimQuotedId(e.target.value)}
                  placeholder="WA_1234567890"
                />
              </div>

              <button
                type="submit"
                disabled={simLoading}
                className="btn btn-secondary w-full font-bold py-3 text-xs flex items-center justify-center gap-2"
              >
                {simLoading ? 'جاري المحاكاة...' : 'إرسال الرد التجريبي'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: Global Conversations Audit */}
      {activeSubTab === 'conversations' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 bg-[var(--surface-2)] border-b border-theme font-bold text-theme-primary text-sm">
            مراقبة كافة المحادثات عبر المنصة
          </div>
          <table className="w-full text-right text-xs">
            <thead className="bg-[var(--surface-2)] text-theme-muted border-b border-theme">
              <tr>
                <th className="p-3">الكود المرجعي</th>
                <th className="p-3">الطالب (الاسم والمعرف)</th>
                <th className="p-3">الدكتور المستهدف</th>
                <th className="p-3">الموضوع</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">تاريخ السؤال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {conversations.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--surface-2)]">
                  <td className="p-3 font-mono text-[#2e9b9b] font-bold">{c.referenceCode}</td>
                  <td className="p-3 text-theme-primary">
                    {c.studentName} <span className="text-theme-muted">({c.studentId})</span>
                  </td>
                  <td className="p-3 text-[#2e9b9b]">{c.doctorName}</td>
                  <td className="p-3 text-theme-secondary">{c.subject}</td>
                  <td className="p-3">
                    {c.status === 'answered' ? (
                      <span className="badge badge-olive text-[10px]">مُجاب عنه</span>
                    ) : (
                      <span className="badge badge-amber text-[10px]">مفتوح</span>
                    )}
                  </td>
                  <td className="p-3 text-theme-muted">
                    {new Date(c.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Developer System Error Diagnostics */}
      {activeSubTab === 'diagnostics' && (
        <div className="space-y-6">
          {/* Top Bar Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base font-display">تشخيصات النظام وسجل الأخطاء للمطور</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">تتبع مباشر لأكواد الأخطاء وحالة الخادم والواتساب</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchDiagnostics}
                disabled={diagLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-[0.98]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${diagLoading ? 'animate-spin' : ''}`} />
                تحديث التقرير
              </button>

              <button
                onClick={() => {
                  if (!diagnostics) return;
                  const report = `[تقرير تشخيص النظام - ${new Date().toLocaleString('ar-EG')}]\n` +
                    `حالة الواتساب: ${diagnostics.whatsapp.status}\n` +
                    `ذاكرة الخادم: ${diagnostics.server.memoryHeapUsedMB} MB / ${diagnostics.server.memoryHeapTotalMB} MB\n` +
                    `زمن التشغيل: ${diagnostics.server.uptimeSeconds} ثانية\n` +
                    `إصدار نود: ${diagnostics.server.nodeVersion}\n` +
                    `آخر السجلات:\n` +
                    (diagnostics.whatsapp.logs || []).slice(0, 10).join('\n');
                  navigator.clipboard.writeText(report);
                  setCopiedReport(true);
                  setTimeout(() => setCopiedReport(false), 2000);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#0f766e] hover:bg-[#0f766e]/90 text-white font-bold text-xs shadow-md shadow-[#0f766e]/20 transition-all flex items-center gap-2 active:scale-[0.98]"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedReport ? 'تم نسخ التقرير!' : 'نسخ التقرير للمطور'}
              </button>
            </div>
          </div>

          {/* System Health Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">حالة اتصال الواتساب</span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {diagnostics?.whatsapp?.status === 'connected' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold"><CheckCircle className="w-4 h-4" /> متصل بنجاح</span>
                  ) : diagnostics?.whatsapp?.status === 'qr_ready' ? (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-bold"><QrCode className="w-4 h-4" /> في انتظار المسح</span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-bold"><XCircle className="w-4 h-4" /> غير متصل</span>
                  )}
                </h4>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">ذاكرة الخادم (RAM)</span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-mono dir-ltr">
                  {diagnostics?.server?.memoryHeapUsedMB || '0'} MB / {diagnostics?.server?.memoryHeapTotalMB || '0'} MB
                </h4>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">مدة تشغيل الخادم</span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                  {diagnostics?.server?.uptimeSeconds ? `${Math.floor(diagnostics.server.uptimeSeconds / 60)} دقيقة` : '0 دقيقة'}
                </h4>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">إصدار المحرك (Node)</span>
                <h4 className="text-sm font-extrabold text-[#0f766e] dark:text-teal-400 font-mono">
                  {diagnostics?.server?.nodeVersion || 'v24.x'}
                </h4>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                <Code className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* System Error Code Catalog Directory */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h4 className="font-bold text-slate-900 dark:text-white text-base">دليل كود الأخطاء البرمجية للمطور (Error Catalogue)</h4>
              </div>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={diagSearch}
                  onChange={(e) => setDiagSearch(e.target.value)}
                  placeholder="ابحث عن كود الخطأ أو السبب..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-8 pl-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0f766e]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">كود الخطأ</th>
                    <th className="p-3">اسم الخطأ</th>
                    <th className="p-3">الخطورة</th>
                    <th className="p-3">السبب المحتمل</th>
                    <th className="p-3">الحل المقترح للمطور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {(diagnostics?.errorCatalog || [])
                    .filter(item => 
                      !diagSearch || 
                      item.code.toLowerCase().includes(diagSearch.toLowerCase()) || 
                      item.title.includes(diagSearch) || 
                      item.cause.includes(diagSearch)
                    )
                    .map((item) => (
                      <tr key={item.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {item.code} ({item.numericCode})
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {item.title}
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono font-normal">{item.titleEn}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                            item.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20' :
                            item.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                            'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          }`}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xs">{item.cause}</td>
                        <td className="p-3 text-[#0f766e] dark:text-teal-300 font-medium leading-relaxed max-w-xs">{item.solution}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time System Logs Terminal View */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-[#0f766e] dark:text-teal-400" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">سجل أحداث سيرفر التواصل المباشر (Live System Logs)</h4>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-bold">
                {diagnostics?.whatsapp?.logs?.length || 0} سجل مخزّن
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl font-mono text-[11.5px] text-slate-200 space-y-1.5 max-h-72 overflow-y-auto border border-slate-900 shadow-inner">
              {diagnostics?.whatsapp?.logs && diagnostics.whatsapp.logs.length > 0 ? (
                diagnostics.whatsapp.logs.map((log, index) => (
                  <div
                    key={index}
                    className={`py-0.5 ${
                      log.includes('خطأ') || log.includes('فشل') || log.includes('انقطع')
                        ? 'text-rose-400 font-semibold'
                        : log.includes('تم') || log.includes('بنجاح')
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-center py-4">لا توجد سجلات بالنظام حتى الآن</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Admin Account & Permissions Management (Super Admin Exclusive) */}
      {activeSubTab === 'sub_admins' && adminProfile?.isSuperAdmin && (
        <AdminManagementTab currentAdminId={adminProfile?.id} />
      )}

      {/* Modal Edit Doctor via Portal */}
      {showEditDoctorModal && editingDoctor && createPortal(
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/75 overflow-y-auto">
          <div className="w-full max-w-md p-6 relative surface-card border-theme rounded-2xl shadow-2xl my-auto">
            <h3 className="text-base font-bold text-theme-primary mb-4 flex items-center gap-2 pb-3 border-b border-theme">
              <Edit3 className="w-5 h-5 text-[#2e9b9b]" /> تعديل بيانات الدكتور ({editingDoctor.fullName})
            </h3>
            <form onSubmit={handleUpdateDoctor} className="space-y-3.5 text-xs">
              {/* Avatar Upload Field */}
              <div className="flex items-center gap-4 py-2 px-3 rounded-xl bg-[var(--surface-2)] border border-theme">
                <div className="relative shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 border-[#2e9b9b] shadow-md">
                  {editAvatarPreview ? (
                    <img src={editAvatarPreview} alt="معاينة الصورة" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#2e9b9b] to-[#22696a] flex items-center justify-center text-white text-base font-extrabold shadow-sm">
                      {editDocName ? editDocName.charAt(0) : 'د'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-theme-primary font-bold mb-1">تعديل الصورة الشخصية</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditAvatarSelect}
                    className="text-[11px] text-theme-secondary file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#2e9b9b]/15 file:text-[#2e9b9b] hover:file:bg-[#2e9b9b]/25 cursor-pointer"
                  />
                </div>
              </div>

              {/* Required Name */}
              <div>
                <label className="block text-theme-primary font-bold mb-1">
                  الاسم الكامل للدكتور <span className="text-rose-500 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  placeholder="د. أحمد محمود"
                />
              </div>

              {/* Optional Phone Update */}
              <div>
                <label className="block text-theme-primary font-bold mb-1">
                  رقم الواتساب الجديد (اتركه فارغاً للحفاظ على الرقم الحالي)
                </label>
                <input
                  type="text"
                  className="input-field dir-ltr text-left font-mono"
                  value={editDocPhone}
                  onChange={(e) => setEditDocPhone(e.target.value)}
                  placeholder="اتركه فارغاً إذا لم ترغب في التغيير"
                />
              </div>

              {/* Title / Role */}
              <div>
                <label className="block text-theme-secondary font-medium mb-1">المسمى الوظيفي</label>
                <input
                  type="text"
                  className="input-field"
                  value={editDocTitle}
                  onChange={(e) => setEditDocTitle(e.target.value)}
                  placeholder="عميد الكلية / وكيل الكلية / رئيس قسم"
                />
              </div>

              {/* Department & Specialty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-theme-secondary font-medium mb-1">القسم</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editDocDept}
                    onChange={(e) => setEditDocDept(e.target.value)}
                    placeholder="تكنولوجيا المعلومات"
                  />
                </div>
                <div>
                  <label className="block text-theme-secondary font-medium mb-1">التخصص</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editDocSpecialty}
                    onChange={(e) => setEditDocSpecialty(e.target.value)}
                    placeholder="هندسة البرمجيات"
                  />
                </div>
              </div>

              {/* Courses */}
              <div>
                <label className="block text-theme-secondary font-medium mb-1">المواد الدراسية</label>
                <input
                  type="text"
                  className="input-field"
                  value={editDocCourses}
                  onChange={(e) => setEditDocCourses(e.target.value)}
                  placeholder="مفصولة بفواصل، مثال: مشروع التخرج، خوارزميات"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditDoctorModal(false)}
                  className="px-4 py-2 rounded-xl surface-card text-theme-secondary hover:text-theme-primary border border-theme text-xs font-semibold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn btn-primary py-2 px-5 font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  {editLoading ? 'جاري التعديل...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Import Doctors via Excel / CSV Portal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/75 overflow-y-auto">
          <div className="w-full max-w-lg p-6 relative surface-card border-theme rounded-2xl shadow-2xl my-auto">
            <h3 className="text-base font-bold text-theme-primary mb-4 flex items-center gap-2 pb-3 border-b border-theme">
              <UploadCloud className="w-5 h-5 text-[#2e9b9b]" /> استيراد دفعة دكاترة من ملفات Excel / CSV
            </h3>
            
            <div className="p-3 rounded-xl bg-[#2e9b9b]/10 border border-[#2e9b9b]/30 mb-4 text-xs space-y-1.5 text-theme-secondary">
              <p className="font-bold text-[#2e9b9b]">طريقة التنسيق المطلوبة لكل سطر (CSV Format):</p>
              <p className="font-mono text-[11px] bg-[var(--surface-2)] p-2 rounded-lg text-theme-primary border border-theme">
                الاسم الكامل, رقم الهاتف, القسم, التخصص, المسمى الوظيفي, المواد
              </p>
              <p className="text-[11px] text-theme-muted">
                مثال: <code className="text-[#2e9b9b]">د. أحمد علي, 01012345678, تكنولوجيا المعلومات, شبكات, رئيس قسم, خوارزميات</code>
              </p>
            </div>

            <form onSubmit={handleImportExcel} className="space-y-4 text-xs">
              <div>
                <label className="block text-theme-primary font-bold mb-1">
                  لصق أسطر بيانات CSV / Excel هنا <span className="text-rose-500 font-extrabold">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  className="input-field font-mono text-xs resize-none"
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder={`د. محمد أحمد, 01012345678, تكنولوجيا المعلومات, برمجيات\nد. سارة محمود, 01098765432, علوم الحاسب, ذكاء اصطناعي`}
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl surface-card text-theme-secondary border border-theme text-xs font-semibold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={importLoading}
                  className="btn btn-primary py-2 px-5 font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <UploadCloud className="w-4 h-4" />
                  {importLoading ? 'جاري التشفير والاستيراد...' : 'بدء الاستيراد وتشفير الأرقام'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showAddDoctorModal && createPortal(
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/75 overflow-y-auto">
          <div className="w-full max-w-md p-6 relative surface-card border-theme rounded-2xl shadow-2xl my-auto">
            <h3 className="text-base font-bold text-theme-primary mb-4 flex items-center gap-2 pb-3 border-b border-theme">
              <PlusCircle className="w-5 h-5 text-[#2e9b9b]" /> إضافة دكتور جديد وتخصيص البيانات
            </h3>
            <form onSubmit={handleAddDoctor} className="space-y-3.5 text-xs">
              {/* Avatar Upload Field */}
              <div className="flex items-center gap-4 py-2 px-3 rounded-xl bg-[var(--surface-2)] border border-theme">
                <div className="relative shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 border-[#2e9b9b] shadow-md">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="معاينة الصورة" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#2e9b9b] to-[#22696a] flex items-center justify-center text-white text-base font-extrabold shadow-sm">
                      {newDocName ? newDocName.charAt(0) : 'د'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-theme-primary font-bold mb-1">صورة الدكتور (اختياري)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="text-[11px] text-theme-secondary file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#2e9b9b]/15 file:text-[#2e9b9b] hover:file:bg-[#2e9b9b]/25 cursor-pointer"
                  />
                </div>
              </div>

              {/* Required Name */}
              <div>
                <label className="block text-theme-primary font-bold mb-1">
                  الاسم الكامل للدكتور <span className="text-rose-500 font-extrabold">* (إجباري)</span>
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="د. أحمد محمود"
                />
              </div>

              {/* Required Phone */}
              <div>
                <label className="block text-theme-primary font-bold mb-1">
                  رقم الواتساب الحقيقي <span className="text-rose-500 font-extrabold">* (إجباري - مشفر بـ AES-256)</span>
                </label>
                <input
                  type="text"
                  required
                  className="input-field dir-ltr text-left"
                  value={newDocPhone}
                  onChange={(e) => setNewDocPhone(e.target.value)}
                  placeholder="+201012345678"
                />
              </div>

              {/* Optional Title/Role */}
              <div>
                <label className="block text-theme-secondary font-medium mb-1">الدور / المسمى الوظيفي (اختياري)</label>
                <input
                  type="text"
                  className="input-field"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="مثال: عميد الكلية، وكيل الكلية، رئيس قسم..."
                />
              </div>

              {/* Optional Department & Specialty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-theme-secondary font-medium mb-1">القسم (اختياري)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newDocDept}
                    onChange={(e) => setNewDocDept(e.target.value)}
                    placeholder="تكنولوجيا المعلومات"
                  />
                </div>
                <div>
                  <label className="block text-theme-secondary font-medium mb-1">التخصص (اختياري)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newDocSpecialty}
                    onChange={(e) => setNewDocSpecialty(e.target.value)}
                    placeholder="هندسة البرمجيات"
                  />
                </div>
              </div>

              {/* Optional Courses */}
              <div>
                <label className="block text-theme-secondary font-medium mb-1">المواد الدراسية (اختياري)</label>
                <input
                  type="text"
                  className="input-field"
                  value={newDocCourses}
                  onChange={(e) => setNewDocCourses(e.target.value)}
                  placeholder="مفصولة بفواصل، مثال: مشروع التخرج، الشبكات"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 rounded-xl surface-card text-theme-secondary hover:text-theme-primary border border-theme text-xs font-semibold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={docLoading}
                  className="btn btn-primary py-2 px-5 font-bold shadow-md shadow-[#2e9b9b]/25 transition-all flex items-center gap-1.5"
                >
                  {docLoading ? 'جاري الحفظ...' : 'حفظ الدكتور'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
