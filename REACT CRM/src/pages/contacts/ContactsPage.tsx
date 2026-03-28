import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useDebounce } from '../../hooks/useDebounce';
import { Contact, ContactList } from '../../types';
import {
  Users, Plus, Search, Upload, Download, Trash2,
  Phone, Mail, Tag, List, CheckCircle, XCircle,
  Loader2, Filter, MoreVertical, ShieldOff, ShieldCheck
} from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import AddContactModal from '../../components/AddContactModal';

// ==============================
// صفحة جهات الاتصال
// ==============================
const ContactsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'contacts' | 'lists'>('contacts');
  const [search, setSearch] = useState('');
  const [optInFilter, setOptInFilter] = useState<'' | 'true' | 'false'>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [page, setPage] = useState(1);
  const [importFile, setImportFile] = useState<File | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  // Reset to page 1 on new search
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  // جلب جهات الاتصال
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts', debouncedSearch, optInFilter, page],
    queryFn: async () => {
      const { data } = await api.get('/contacts', {
        params: { search: debouncedSearch || undefined, opt_in: optInFilter || undefined, page }
      });
      return data;
    },
  });

  // جلب القوائم
  const { data: listsData } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: async () => {
      const { data } = await api.get('/contact-lists');
      return data.contact_lists as ContactList[];
    },
  });

  // حذف جهة اتصال
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('تم الحذف.');
    },
    onError: () => toast.error('فشل الحذف.'),
  });

  // تبديل الحظر
  const blacklistMutation = useMutation({
    mutationFn: ({ id, blacklisted }: { id: number; blacklisted: boolean }) =>
      api.put(`/contacts/${id}`, { is_blacklisted: blacklisted }),
    onSuccess: (_, { blacklisted }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(blacklisted ? 'تم إضافة الرقم لقائمة الحظر' : 'تم رفع الحظر عن الرقم');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  // إلغاء الاشتراك
  const optOutMutation = useMutation({
    mutationFn: (id: number) => api.put(`/contacts/${id}/opt-out`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('تم إلغاء الاشتراك.');
    },
  });

  // استيراد CSV
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post('/contacts/import/csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`تم استيراد ${res.data.imported} جهة اتصال.`);
      setImportFile(null);
    },
    onError: () => toast.error('فشل الاستيراد.'),
  });

  // تصدير CSV
  const handleExport = async () => {
    try {
      const response = await api.get('/contacts/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contacts.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('فشل التصدير.');
    }
  };

  const contacts: Contact[] = contactsData?.contacts ?? [];
  const meta = contactsData?.meta;
  const lists: ContactList[] = listsData ?? [];

  return (
    <div className="space-y-8 font-cairo animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">جهات الاتصال</h1>
          <p className="text-slate-500 mt-1 font-medium">إدارة قوائم الأرقام لحملات واتساب التسويقية.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* استيراد */}
          <label className="h-10 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-all">
            <Upload size={16} />
            استيراد CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImportFile(file);
                  importMutation.mutate(file);
                }
              }}
            />
          </label>

          {/* تصدير */}
          <button
            onClick={handleExport}
            className="h-10 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Download size={16} />
            تصدير CSV
          </button>

          {/* إضافة */}
          <button
            onClick={() => setShowAddModal(true)}
            className="h-10 px-5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            إضافة جهة اتصال
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="flex gap-8 px-10 border-b border-slate-50">
          {(['contacts', 'lists'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'py-5 text-sm font-black border-b-4 transition-all',
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              {tab === 'contacts' ? (
                <span className="flex items-center gap-2"><Users size={16} /> جهات الاتصال ({meta?.total ?? 0})</span>
              ) : (
                <span className="flex items-center gap-2"><List size={16} /> القوائم ({lists.length})</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'contacts' ? (
            <>
              {/* أدوات الفلترة */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="بحث بالاسم أو الهاتف أو البريد..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10 pr-9 pl-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <select
                  value={optInFilter}
                  onChange={(e) => setOptInFilter(e.target.value as any)}
                  className="h-10 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                >
                  <option value="">الكل</option>
                  <option value="true">مشتركون ✅</option>
                  <option value="false">غير مشتركين</option>
                </select>
              </div>

              {/* الجدول */}
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-indigo-600 h-8 w-8" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users size={32} className="text-slate-200" />
                  </div>
                  <p className="font-black text-slate-600 text-lg">لا توجد جهات اتصال</p>
                  <p className="text-slate-400 mt-1 text-sm">أضف جهة اتصال جديدة أو استورد ملف CSV.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider">الاسم</th>
                        <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider">الهاتف</th>
                        <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">البريد</th>
                        <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">التاقات</th>
                        <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider">الحالة</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {contacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{contact.name}</td>
                          <td className="p-4">
                            <span className="flex items-center gap-1.5 text-slate-600 font-mono">
                              <Phone size={13} className="text-slate-400" />
                              {contact.phone}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 hidden md:table-cell">
                            {contact.email ? (
                              <span className="flex items-center gap-1.5">
                                <Mail size={13} className="text-slate-400" />
                                {contact.email}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            {contact.tags && contact.tags.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {contact.tags.map((tag) => (
                                  <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : '—'}
                          </td>
                          <td className="p-4">
                            {contact.is_blacklisted ? (
                              <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold flex items-center gap-1 w-fit">
                                <XCircle size={12} /> محظور
                              </span>
                            ) : contact.opt_in ? (
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold flex items-center gap-1 w-fit">
                                <CheckCircle size={12} /> مشترك
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold w-fit block">
                                غير مشترك
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 justify-end">
                              {contact.opt_in && !contact.opt_out && (
                                <button
                                  onClick={() => optOutMutation.mutate(contact.id)}
                                  className="text-xs text-amber-600 hover:text-amber-800 font-bold px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                                >
                                  إلغاء اشتراك
                                </button>
                              )}
                              <button
                                title={contact.is_blacklisted ? 'رفع الحظر' : 'إضافة للحظر'}
                                onClick={() => blacklistMutation.mutate({ id: contact.id, blacklisted: !contact.is_blacklisted })}
                                className={`p-1.5 rounded-lg transition-colors ${contact.is_blacklisted ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                              >
                                {contact.is_blacklisted ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('حذف هذه الجهة؟'))
                                    deleteMutation.mutate(contact.id);
                                }}
                                className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-slate-500 font-medium">
                    عرض {contacts.length} من {meta.total} جهة اتصال
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                      className="h-9 px-4 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50 transition-all"
                    >
                      السابق
                    </button>
                    <span className="h-9 px-4 flex items-center text-sm font-bold text-slate-600">
                      {page} / {meta.last_page}
                    </span>
                    <button
                      disabled={page >= meta.last_page}
                      onClick={() => setPage(p => p + 1)}
                      className="h-9 px-4 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50 transition-all"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // تبويب القوائم
            <ContactListsTab lists={lists} queryClient={queryClient} />
          )}
        </div>
      </div>

      {/* مودال إضافة جهة اتصال */}
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

// ==============================
// تبويب القوائم
// ==============================
const ContactListsTab: React.FC<{ lists: ContactList[]; queryClient: any }> = ({ lists, queryClient }) => {
  const [showCreate, setShowCreate] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/contact-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('تم حذف القائمة.');
    },
  });

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowCreate(true)}
          className="h-10 px-5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          قائمة جديدة
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <List size={32} className="text-slate-200" />
          </div>
          <p className="font-black text-slate-600 text-lg">لا توجد قوائم</p>
          <p className="text-slate-400 mt-1 text-sm">أنشئ قوائم لتنظيم جهات الاتصال وإطلاق الحملات.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <div key={list.id} className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                  <List size={22} className="text-indigo-600" />
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('حذف هذه القائمة؟'))
                      deleteMutation.mutate(list.id);
                  }}
                  className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <h3 className="font-black text-slate-800 mb-1">{list.name}</h3>
              {list.description && (
                <p className="text-slate-400 text-sm mb-3 line-clamp-2">{list.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                <Users size={14} />
                <span>{list.count ?? 0} جهة اتصال</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateListModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
};


// ==============================
// مودال إنشاء قائمة
// ==============================
const CreateListModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/contact-lists', form);
      toast.success('تم إنشاء القائمة.');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'فشل الإنشاء.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <h2 className="text-xl font-black text-slate-800 mb-6">قائمة جديدة</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اسم القائمة *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              placeholder="مثال: عملاء محتملون"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الوصف</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm resize-none"
              placeholder="وصف اختياري..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-sm">إلغاء</button>
            <button type="submit" disabled={loading} className="flex-1 h-11 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              إنشاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactsPage;
