import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Search, Upload, Download, Trash2, ShieldAlert, Users, ShieldOff, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { contacts as contactsApi } from '../../api';
import { useConfirm } from '../../hooks/useConfirm';
import AddContactModal from '../../components/AddContactModal';
import ImportContactsModal from '../../components/ImportContactsModal';
import ContactsTable from './components/ContactsTable';
import DeleteAllContactsModal from './components/DeleteAllContactsModal';

const ContactsPage = () => {
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [optInFilter, setOptInFilter] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const filters = tab === 'blacklisted'
    ? { is_blacklisted: true, search: search || undefined, page }
    : { opt_in: optInFilter || undefined, search: search || undefined, page };

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', tab, search, optInFilter, page],
    queryFn: () => contactsApi.getContacts(filters),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contacts'] });

  const deleteMutation = useMutation({
    mutationFn: (id) => contactsApi.deleteContact(id),
    onSuccess: () => { invalidate(); toast.success('تم الحذف.'); },
    onError: () => toast.error('فشل الحذف.'),
  });

  const optOutMutation = useMutation({
    mutationFn: (id) => contactsApi.optOutContact(id),
    onSuccess: () => { invalidate(); toast.success('تم إلغاء الاشتراك.'); },
  });

  const blacklistMutation = useMutation({
    mutationFn: (contact) => (contact.is_blacklisted ? contactsApi.unblacklistContact(contact.id) : contactsApi.blacklistContact(contact.id)),
    onSuccess: (_, contact) => { invalidate(); toast.success(contact.is_blacklisted ? 'تم رفع الحظر عن الرقم' : 'تم إضافة الرقم لقائمة الحظر'); },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => contactsApi.destroyAllContacts(),
    onSuccess: (res) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      setDeleteAllOpen(false);
      toast.success(`تم حذف ${res.deleted} جهة اتصال.`);
    },
    onError: () => toast.error('فشل الحذف.'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => contactsApi.bulkDestroyContacts(ids),
    onSuccess: (res) => { invalidate(); setSelectedIds([]); toast.success(`تم حذف ${res.deleted} جهة اتصال.`); },
    onError: () => toast.error('فشل الحذف.'),
  });

  const bulkBlacklistMutation = useMutation({
    mutationFn: (ids) => contactsApi.bulkBlacklistContacts(ids),
    onSuccess: (res) => { invalidate(); setSelectedIds([]); toast.success(`تم حظر ${res.updated} جهة اتصال.`); },
    onError: () => toast.error('فشل التحديث.'),
  });

  const toggleSelect = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = (select) => setSelectedIds(select ? rows.map((c) => c.id) : []);

  const handleExport = async () => {
    try {
      const blob = await contactsApi.exportContactsCsv();
      const url = window.URL.createObjectURL(blob);
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

  const handleDelete = async (id) => { if (await confirm('حذف هذه الجهة؟')) deleteMutation.mutate(id); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">جهات الاتصال</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">كل العملاء وجهات الاتصال بمكان واحد.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setImportOpen(true)} className="h-10 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Upload size={16} />
            استيراد CSV
          </button>
          <button onClick={handleExport} className="h-10 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Download size={16} />
            تصدير CSV
          </button>
          {(meta?.total ?? 0) > 0 && tab === 'all' && (
            <button onClick={() => setDeleteAllOpen(true)} className="h-10 px-4 border border-rose-200 rounded-xl text-rose-600 font-bold text-sm flex items-center gap-2 hover:bg-rose-50 transition-all">
              <Trash2 size={16} />
              مسح الكل
            </button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setAddOpen(true)}
            className="h-10 px-5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            جهة اتصال جديدة
          </motion.button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex gap-8 px-6 border-b border-slate-50 overflow-x-auto">
          <button
            onClick={() => { setTab('all'); setPage(1); setSelectedIds([]); }}
            className={cn('py-4 text-sm font-black border-b-4 transition-all whitespace-nowrap flex items-center gap-2', tab === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600')}
          >
            <Users size={15} /> جهات الاتصال
          </button>
          <button
            onClick={() => { setTab('blacklisted'); setPage(1); setSelectedIds([]); }}
            className={cn('py-4 text-sm font-black border-b-4 transition-all whitespace-nowrap flex items-center gap-2', tab === 'blacklisted' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600')}
          >
            <ShieldAlert size={15} /> المحظورون
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="بحث بالاسم أو الهاتف..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-10 pr-9 pl-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            {tab === 'all' && (
              <select
                value={optInFilter}
                onChange={(e) => { setOptInFilter(e.target.value); setPage(1); }}
                className="h-10 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 bg-white"
              >
                <option value="">الكل</option>
                <option value="true">مشتركون</option>
                <option value="false">غير مشتركين</option>
              </select>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3 mb-4">
              <span className="text-sm font-bold text-indigo-700">تم تحديد {selectedIds.length} جهة اتصال</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => { if (await confirm(`حظر ${selectedIds.length} جهة اتصال المحددة؟`)) bulkBlacklistMutation.mutate(selectedIds); }}
                  className="h-8 px-3 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
                >
                  <ShieldOff size={13} />
                  حظر المحدد
                </button>
                <button
                  onClick={async () => { if (await confirm(`حذف ${selectedIds.length} جهة اتصال المحددة؟`)) bulkDeleteMutation.mutate(selectedIds); }}
                  className="h-8 px-3 rounded-lg bg-white border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={13} />
                  حذف المحدد
                </button>
                <button onClick={() => setSelectedIds([])} className="h-8 w-8 rounded-lg flex items-center justify-center text-indigo-400 hover:bg-indigo-100 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <ContactsTable
            contacts={rows}
            isLoading={isLoading}
            onOptOut={(id) => optOutMutation.mutate(id)}
            onToggleBlacklist={(contact) => blacklistMutation.mutate(contact)}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onAddContact={() => setAddOpen(true)}
            onImport={() => setImportOpen(true)}
          />

          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500 font-medium">عرض {rows.length} من {meta.total}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 px-4 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50">السابق</button>
                <span className="h-9 px-4 flex items-center text-sm font-bold text-slate-600">{page} / {meta.last_page}</span>
                <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="h-9 px-4 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50">التالي</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddContactModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ImportContactsModal open={importOpen} onClose={() => setImportOpen(false)} />
      <DeleteAllContactsModal
        open={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={() => deleteAllMutation.mutate()}
        total={meta?.total}
        isPending={deleteAllMutation.isPending}
      />
      {confirmDialog}
    </div>
  );
};

export default ContactsPage;
