import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Plus,
  Search,
  Check,
  X,
  Edit3,
  Trash2,
  Lock,
  Mail,
  User,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck
} from 'lucide-react';

const AVAILABLE_PERMISSIONS = [
  { key: 'manage_whatsapp', label: 'ربط سيرفر التواصل والـ QR', desc: 'التحكم في ربط رقم الواتساب وفك الاقتران' },
  { key: 'manage_doctors', label: 'إدارة أرقام وبيانات الدكاترة', desc: 'إضافة وتعديل وحذف الدكاترة المعتمدين' },
  { key: 'simulator', label: 'محاكي الردود والاختبار المباشر', desc: 'تجربة إرسال واستلام الرسائل التفاعلية' },
  { key: 'view_chats', label: 'سجل المحادثات العام', desc: 'عرض وقراءة كافة استفسارات الطلاب' },
  { key: 'diagnostics', label: 'سجل تشخيص الأخطاء للمطور', desc: 'مراقبة حالة الخادم والرام وأكواد الأخطاء' }
];

export default function AdminManagementTab({ currentAdminId }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedAdminId, setSelectedAdminId] = useState(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete Confirmation State
  const [deletingAdmin, setDeletingAdmin] = useState(null);

  const getAuthToken = () => localStorage.getItem('studentToken') || localStorage.getItem('adminToken');

  const fetchSubAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      const res = await fetch('/api/admin/sub-admins', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل جلب قائمة المشرفين');
      setAdmins(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedAdminId(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setSelectedPermissions(['manage_doctors', 'view_chats']);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (adm) => {
    setModalMode('edit');
    setSelectedAdminId(adm.id);
    setFullName(adm.fullName);
    setEmail(adm.email);
    setPassword('');
    setConfirmPassword('');
    setSelectedPermissions(adm.permissions || []);
    setFormError(null);
    setShowModal(true);
  };

  const togglePermission = (key) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim()) {
      setFormError('الاسم البرمجي والبريد الإلكتروني حقول مطلوبة');
      return;
    }

    if (modalMode === 'create') {
      if (!password) {
        setFormError('كلمة المرور مطلوبة لإنشاء حساب المشرف');
        return;
      }
      if (password.length < 6) {
        setFormError('كلمة المرور يجب أن لا تقل عن 6 أحرف');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('كلمتا المرور غير متطابقتين');
        return;
      }
    } else {
      if (password && password.length < 6) {
        setFormError('كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف');
        return;
      }
      if (password && password !== confirmPassword) {
        setFormError('كلمتا المرور غير متطابقتين');
        return;
      }
    }

    try {
      setSubmitting(true);
      const token = getAuthToken();
      const url = modalMode === 'create' ? '/api/admin/sub-admins' : `/api/admin/sub-admins/${selectedAdminId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        permissions: selectedPermissions
      };

      if (password) payload.password = password;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ بيانات المشرف');

      setSuccessMessage(data.message || 'تم حفظ بيانات المشرف بنجاح');
      setShowModal(false);
      fetchSubAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (adm) => {
    if (adm.isSuperAdmin) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/sub-admins/${adm.id}/status`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير حالة المشرف');
      fetchSubAdmins();
    } catch (err) {
      alert(`خطأ: ${err.message}`);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/sub-admins/${deletingAdmin.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف المشرف');

      setSuccessMessage('تم حذف حساب المشرف نهائياً');
      setDeletingAdmin(null);
      fetchSubAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert(`خطأ: ${err.message}`);
    }
  };

  const filteredAdmins = admins.filter(
    (a) =>
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAdmins = admins.length;
  const activeSubAdmins = admins.filter((a) => a.isActive && !a.isSuperAdmin).length;
  const superAdminCount = admins.filter((a) => a.isSuperAdmin).length;

  return (
    <div className="space-y-6 dir-rtl">
      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4 shrink-0 text-emerald-500" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          {error}
        </div>
      )}

      {/* Top Header Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30 shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#0f766e]" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base font-display">
              إدارة المشرفين وتخصيص الصلاحيات
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              إنشاء حسابات المشرفين وتحديد الصلاحيات الدقيقة وحظر الوصول التلقائي
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-xl bg-[#0f766e] hover:bg-[#0f766e]/90 text-white font-bold text-xs shadow-md shadow-[#0f766e]/20 transition-all flex items-center gap-2 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          إضافة مشرف جديد
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">إجمالي المشرفين بالمنظومة</span>
            <h4 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{totalAdmins} مشرف</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">المشرفين الفرعيين النشطين</span>
            <h4 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{activeSubAdmins} نشط</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">مدير النظام الرئيسي</span>
            <h4 className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">{superAdminCount} Super Admin</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Admins Directory Table */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0f766e]" />
            <h4 className="font-bold text-slate-900 dark:text-white text-base">سجل المشرفين وصلاحيات الحسابات</h4>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو البريد..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-8 pl-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0f766e]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs font-bold">جاري تحميل قائمة المشرفين والصلاحيات...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">المشرف والبريد</th>
                  <th className="p-3 text-center">نوع الحساب</th>
                  <th className="p-3">الصلاحيات الممنوحة</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredAdmins.length > 0 ? (
                  filteredAdmins.map((adm) => {
                    const isSelf = adm.id === currentAdminId;

                    return (
                      <tr key={adm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{adm.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono dir-ltr text-right">{adm.email}</div>
                        </td>
                        <td className="p-3 text-center">
                          {adm.isSuperAdmin ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                              Super Admin (كامل الصلاحيات)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400">
                              مشرف فرعي (Sub-Admin)
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {adm.isSuperAdmin ? (
                            <span className="text-slate-500 font-bold text-[11px]">يصل لكافة التابات والمسارات تلقائياً</span>
                          ) : adm.permissions && adm.permissions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {adm.permissions.map((pKey) => {
                                const matched = AVAILABLE_PERMISSIONS.find((ap) => ap.key === pKey);
                                return (
                                  <span
                                    key={pKey}
                                    className="px-2 py-0.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[#0f766e] dark:text-teal-300 text-[10.5px] font-bold"
                                  >
                                    {matched ? matched.label : pKey}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-rose-500 font-bold text-[11px]">لا توجد صلاحيات محددة</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(adm)}
                            disabled={adm.isSuperAdmin || isSelf}
                            className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border transition-all inline-flex items-center gap-1 ${
                              adm.isActive
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                            } ${adm.isSuperAdmin || isSelf ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={adm.isSuperAdmin ? 'لا يمكن تعطيل المدير الرئيسي' : adm.isActive ? 'انقر لتعطيل الحساب' : 'انقر لتفعيل الحساب'}
                          >
                            {adm.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            {adm.isActive ? 'حساب نشط' : 'حساب معطل'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!adm.isSuperAdmin && (
                              <button
                                onClick={() => openEditModal(adm)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#0f766e] border border-slate-200 dark:border-slate-700 transition-all"
                                title="تعديل الصلاحيات والحساب"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            {!adm.isSuperAdmin && !isSelf && (
                              <button
                                onClick={() => setDeletingAdmin(adm)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-500/10 border border-slate-200 dark:border-slate-700 transition-all"
                                title="حذف الحساب نهائياً"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500 font-bold">
                      لا يوجد مشرفين مطابقين لمعايير البحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Admin Modal */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/75 overflow-y-auto dir-rtl">
            <div className="w-full max-w-lg p-6 relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl my-auto">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0f766e]" />
                  {modalMode === 'create' ? 'إضافة مشرف جديد وتخصيص صلاحياته' : 'تعديل بيانات وحساب المشرف'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveAdmin} className="space-y-4 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block text-slate-900 dark:text-white font-bold mb-1">
                    اسم المشرف الكامل <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مهندس أحمد الإداري"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-9 pl-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0f766e]"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-slate-900 dark:text-white font-bold mb-1">
                    البريد الإلكتروني الرسمي <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin.ahmed@ctu.edu.eg"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-9 pl-3 text-xs text-slate-900 dark:text-white font-mono dir-ltr text-right focus:outline-none focus:border-[#0f766e]"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-900 dark:text-white font-bold mb-1">
                      كلمة المرور {modalMode === 'create' ? <span className="text-rose-500">*</span> : '(اختياري)'}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required={modalMode === 'create'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={modalMode === 'create' ? '******' : 'اتركه فارغاً للإبقاء'}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-9 pl-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0f766e]"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-900 dark:text-white font-bold mb-1">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <input
                        type="password"
                        required={Boolean(password)}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="أعد كتابة الباسورد"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-9 pl-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0f766e]"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Granular Permissions Selection */}
                <div>
                  <label className="block text-slate-900 dark:text-white font-bold mb-2">
                    تخصيص الصلاحيات الممنوحة للمشرف:
                  </label>
                  <div className="space-y-2 max-h-52 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                    {AVAILABLE_PERMISSIONS.map((item) => {
                      const isChecked = selectedPermissions.includes(item.key);
                      return (
                        <div
                          key={item.key}
                          onClick={() => togglePermission(item.key)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                            isChecked
                              ? 'bg-teal-500/10 border-teal-500/40 text-slate-900 dark:text-white'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-[#0f766e] focus:ring-[#0f766e]"
                          />
                          <div>
                            <div className="font-bold text-xs">{item.label}</div>
                            <div className="text-[10.5px] text-slate-500">{item.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-[#0f766e] hover:bg-[#0f766e]/90 text-white font-bold shadow-md shadow-[#0f766e]/20"
                  >
                    {submitting ? 'جاري الحفظ...' : modalMode === 'create' ? 'إنشاء حساب المشرف' : 'حفظ التعديلات'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {deletingAdmin &&
        createPortal(
          <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/75 overflow-y-auto dir-rtl">
            <div className="w-full max-w-sm p-6 relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                تأكيد حذف حساب المشرف
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                هل أنت تأكد من رغبتك في حذف حساب المشرف ({deletingAdmin.fullName}) نهائياً من النظام؟
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setDeletingAdmin(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteAdmin}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20"
                >
                  نعم، تأكيد الحذف
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
