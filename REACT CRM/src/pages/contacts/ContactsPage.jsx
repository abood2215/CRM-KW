import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Users, Plus, Search, Upload, Download, Trash2,
  Phone, Mail, List, CheckCircle, XCircle,
  Loader2, ShieldOff, ShieldCheck, ShieldAlert, X, FolderPlus
} from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import AddContactModal from '../../components/AddContactModal';

const ContactsPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('contacts');
  const [search, setSearch] = useState('');
  const [optInFilter, setOptInFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => { setPage(1); }, [debouncedSearch, activeTab]);

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts', debouncedSearch, optInFilter, page],
    queryFn: async () => {
      const { data } = await api.get('/contacts', {
        params: { search: debouncedSearch || undefined, opt_in: optInFilter || undefined, page }
      });
      return data;
    },
    enabled: activeTab === 'contacts',
  });

  const { data: blacklistedData, isLoading: loadingBlacklisted } = useQuery({
    queryKey: ['contacts-blacklisted', debouncedSearch, page],
    queryFn: async () => {
      const { data } = await api.get('/contacts', {
        params: { is_blacklisted: true, search: debouncedSearch || undefined, page }
      });
      return data;
    },
    enabled: activeTab === 'blacklisted',
  });

  const { data: listsData } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: async () => {
      const { data } = await api.get('/contact-lists');
      return data.contact_lists;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('تم الحذف.');
    },
    onError: () => toast.error('فشل الحذف.'),
  });

  const blacklistMutation = useMutation({
    mutationFn: ({ id, blacklisted }) =>
      api.put(`/contacts/${id}`, { is_blacklisted: blacklisted }),
    onSuccess: (_, { blacklisted }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(blacklisted ? 'تم إضافة الرقم لقائمة الحظر' : 'تم رفع الحظر عن الرقم');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const optOutMutation = useMutation({
    mutationFn: (id) => api.put(`/contacts/${id}/opt-out`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('تم إلغاء الاشتراك.');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete('/contacts'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      setShowDeleteAllModal(false);
      toast.success(`تم حذف ${res.data.deleted} جهة اتصال.`);
    },
    onError: () => toast.error('فشل الحذف.'),
  });

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

  const contacts = contactsData?.contacts ?? [];
  const meta = contactsData?.meta;
  const lists = listsData ?? [];

  return (
    <div className="space-y-8 font-cairo animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">جهات الاتصال</h1>
          <p className="text-slate-500 mt-1 font-medium">إدارة قوائم الأرقام لحملات واتساب التسويقية.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="h-10 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-all"
          >
            <Upload size={16} />
            استيراد CSV
          </button>
          <button
            onClick={handleExport}
            className="h-10 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Download size={16} />
            تصدير CSV
          </button>
          {(contactsData?.meta?.total ?? 0) > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="h-10 px-4 border border-rose-200 rounded-xl text-rose-600 font-bold text-sm flex items-center gap-2 hover:bg-rose-50 transition-all"
            >
              <Trash2 size={16} />
              مسح الكل
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="h-10 px-5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            إضافة جهة اتصال
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="flex gap-8 px-10 border-b border-slate-50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('contacts')}
            className={cn('py-5 text-sm font-black border-b-4 transition-all whitespace-nowrap', activeTab === 'contacts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600')}
          >
            <span className="flex items-center gap-2"><Users size={16} /> جهات الاتصال ({contactsData?.meta?.total ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('blacklisted')}
            className={cn('py-5 text-sm font-black border-b-4 transition-all whitespace-nowrap', activeTab === 'blacklisted' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600')}
          >
            <span className="flex items-center gap-2"><ShieldAlert size={16} /> المحظورون ({blacklistedData?.meta?.total ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('lists')}
            className={cn('py-5 text-sm font-black border-b-4 transition-all whitespace-nowrap', activeTab === 'lists' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600')}
          >
            <span className="flex items-center gap-2"><List size={16} /> القوائم ({lists.length})</span>
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'blacklisted' ? (
            <BlacklistedTab
              contacts={blacklistedData?.contacts ?? []}
              meta={blacklistedData?.meta}
              isLoading={loadingBlacklisted}
              search={search}
              setSearch={setSearch}
              page={page}
              setPage={setPage}
              blacklistMutation={blacklistMutation}
              deleteMutation={deleteMutation}
            />
          ) : activeTab === 'contacts' ? (
            <>
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
                  onChange={(e) => setOptInFilter(e.target.value)}
                  className="h-10 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                >
                  <option value="">الكل</option>
                  <option value="true">مشتركون ✅</option>
                  <option value="false">غير مشتركين</option>
                </select>
              </div>

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
            <ContactListsTab lists={lists} queryClient={queryClient} />
          )}
        </div>
      </div>

      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            setShowAddModal(false);
          }}
        />
      )}

      {showImportModal && (
        <ImportCSVModal
          lists={lists}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
            setShowImportModal(false);
          }}
        />
      )}

      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-rose-600" />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">مسح جميع جهات الاتصال؟</h2>
            <p className="text-slate-500 text-sm font-medium mb-1">
              سيتم حذف <span className="font-black text-rose-600">{contactsData?.meta?.total?.toLocaleString() ?? ''}</span> جهة اتصال بشكل نهائي.
            </p>
            <p className="text-slate-400 text-xs mb-8">هذا الإجراء لا يمكن التراجع عنه.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                disabled={deleteAllMutation.isPending}
                className="flex-1 h-11 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteAllMutation.mutate()}
                disabled={deleteAllMutation.isPending}
                className="flex-1 h-11 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleteAllMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                مسح الكل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BlacklistedTab = ({ contacts, meta, isLoading, search, setSearch, page, setPage, blacklistMutation, deleteMutation }) => (
  <div>
    <div className="relative max-w-sm mb-6">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type="text"
        placeholder="بحث في المحظورين..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-10 pr-9 pl-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
      />
    </div>

    {isLoading ? (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-rose-500 h-8 w-8" />
      </div>
    ) : contacts.length === 0 ? (
      <div className="text-center py-20">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} className="text-rose-200" />
        </div>
        <p className="font-black text-slate-600 text-lg">لا يوجد أرقام محظورة</p>
        <p className="text-slate-400 mt-1 text-sm">الأرقام التي تحظرها لن تتلقى حملاتك التسويقية.</p>
      </div>
    ) : (
      <>
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold">
            <ShieldAlert size={12} /> {meta?.total ?? contacts.length} رقم محظور
          </span>
          <span className="text-xs text-slate-400">— هؤلاء لن يتلقوا أي حملة تسويقية</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-rose-100">
          <table className="w-full text-sm">
            <thead className="bg-rose-50/60 border-b border-rose-100">
              <tr>
                <th className="text-right p-4 font-black text-rose-400 text-xs uppercase tracking-wider">الاسم</th>
                <th className="text-right p-4 font-black text-rose-400 text-xs uppercase tracking-wider">الهاتف</th>
                <th className="text-right p-4 font-black text-rose-400 text-xs uppercase tracking-wider hidden md:table-cell">البريد</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-rose-50/30 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{contact.name}</td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 text-slate-600 font-mono">
                      <Phone size={13} className="text-slate-400" />
                      {contact.phone}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 hidden md:table-cell">{contact.email || '—'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => blacklistMutation.mutate({ id: contact.id, blacklisted: false })}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200"
                      >
                        <ShieldCheck size={13} /> رفع الحظر
                      </button>
                      <button
                        onClick={() => { if (window.confirm('حذف هذه الجهة؟')) deleteMutation.mutate(contact.id); }}
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

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-slate-500 font-medium">
              عرض {contacts.length} من {meta.total} رقم محظور
            </p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-9 px-4 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50">السابق</button>
              <span className="h-9 px-4 flex items-center text-sm font-bold text-slate-600">{page} / {meta.last_page}</span>
              <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)} className="h-9 px-4 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50">التالي</button>
            </div>
          </div>
        )}
      </>
    )}
  </div>
);

const ContactListsTab = ({ lists, queryClient }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [viewList, setViewList] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/contact-lists/${id}`),
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
            <div
              key={list.id}
              onClick={() => setViewList(list)}
              className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                  <List size={22} className="text-indigo-600" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                  <Users size={14} />
                  <span>{list.count ?? 0} جهة اتصال</span>
                </div>
                <span className="text-xs text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">عرض ←</span>
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

      {viewList && (
        <ListContactsModal list={viewList} onClose={() => setViewList(null)} />
      )}
    </div>
  );
};

const CreateListModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/contact-lists', form);
      toast.success('تم إنشاء القائمة.');
      onSuccess();
    } catch (err) {
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

const ListContactsModal = ({ list, onClose }) => {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contact-list-contacts', list.id],
    queryFn: async () => {
      const { data } = await api.get(`/contact-lists/${list.id}`);
      return data.contact_list?.contacts ?? data.contacts ?? [];
    },
  });

  const filtered = (data ?? []).filter((c) =>
    !search || c.name?.includes(search) || c.phone?.includes(search)
  );

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800">{list.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5 font-medium">{list.count ?? 0} جهة اتصال</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="px-8 py-4 border-b border-slate-50 shrink-0">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الرقم..."
              className="w-full h-10 pr-9 pl-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-2">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-indigo-600 h-7 w-7" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users size={28} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-bold text-sm">لا توجد جهات اتصال</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-right py-3 px-4 font-black text-slate-400 text-xs">الاسم</th>
                  <th className="text-right py-3 px-4 font-black text-slate-400 text-xs">الهاتف</th>
                  <th className="text-right py-3 px-4 font-black text-slate-400 text-xs hidden sm:table-cell">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{c.name || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400" />
                      {c.phone}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      {c.opt_in ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">مشترك</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold">غير مشترك</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-8 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="w-full h-10 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm transition-all">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

const ImportCSVModal = ({ lists, onClose, onSuccess }) => {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [selectedListId, setSelectedListId] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('اختر ملف CSV أولاً');
    setLoading(true);
    try {
      let listId = selectedListId;

      if (showNewList && newListName.trim()) {
        const { data } = await api.post('/contact-lists', { name: newListName.trim() });
        listId = String(data.contact_list?.id ?? data.id ?? '');
      }

      const form = new FormData();
      form.append('file', file);
      if (listId) form.append('contact_list_id', listId);

      const { data } = await api.post('/contacts/import/csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(`تم استيراد ${data.imported} جهة اتصال${listId ? ' وإضافتها للقائمة' : ''}.`);
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل الاستيراد.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-800">استيراد CSV</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">ملف CSV *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all ${file ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
            >
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <Upload size={24} className={file ? 'text-indigo-500' : 'text-slate-400'} />
              {file ? (
                <p className="text-sm font-bold text-indigo-700">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-600">اضغط لاختيار الملف</p>
                  <p className="text-xs text-slate-400">العمود الأول: اسم | العمود الثاني: هاتف</p>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">إضافة إلى قائمة (اختياري)</label>
            {!showNewList ? (
              <div className="flex gap-2">
                <select
                  value={selectedListId}
                  onChange={e => setSelectedListId(e.target.value)}
                  className="flex-1 h-11 px-4 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">— بدون قائمة —</option>
                  {lists.map(l => (
                    <option key={l.id} value={String(l.id)}>{l.name} ({l.count ?? 0})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowNewList(true); setSelectedListId(''); }}
                  className="h-11 px-3 border border-slate-200 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                >
                  <FolderPlus size={17} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="اسم القائمة الجديدة..."
                    className="flex-1 h-11 px-4 border border-indigo-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowNewList(false); setNewListName(''); }}
                    className="h-11 px-3 border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-xs text-indigo-600 font-medium">سيتم إنشاء القائمة تلقائياً عند الاستيراد</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm">
              إلغاء
            </button>
            <button type="submit" disabled={loading || !file} className="flex-1 h-11 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              استيراد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactsPage;
