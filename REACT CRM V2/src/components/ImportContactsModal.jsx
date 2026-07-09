import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Upload, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { contacts as contactsApi, contactLists as contactListsApi } from '../api';
import { useModalA11y } from '../hooks/useModalA11y';

const NEW_LIST_VALUE = '__new__';

/** Pass a fixed contactListId (e.g. from the Contact Lists page) to lock the target list and hide the picker. */
const ImportContactsModal = ({ open, onClose, contactListId = null }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [selectedListId, setSelectedListId] = useState('');
  const [newListName, setNewListName] = useState('');
  const [result, setResult] = useState(null);

  const { data: lists = [] } = useQuery({
    queryKey: ['contact-lists-select'],
    queryFn: contactListsApi.getContactLists,
    enabled: open && !contactListId,
  });

  const isCreatingNewList = selectedListId === NEW_LIST_VALUE;
  const targetListId = contactListId || (isCreatingNewList ? null : selectedListId || null);

  const createListMutation = useMutation({
    mutationFn: () => contactListsApi.createContactList({ name: newListName }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      queryClient.invalidateQueries({ queryKey: ['contact-lists-select'] });
      setSelectedListId(String(res.contact_list.id));
      setNewListName('');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إنشاء القائمة'),
  });

  const mutation = useMutation({
    mutationFn: () => contactsApi.importContactsCsv(file, targetListId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      setResult(data);
      toast.success(data.message);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل الاستيراد'),
  });

  const handleClose = () => {
    setFile(null);
    setSelectedListId('');
    setNewListName('');
    setResult(null);
    onClose();
  };

  const ref = useModalA11y(open, handleClose);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">استيراد CSV</h2>
              <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-5">
              <p className="text-xs text-slate-500 leading-relaxed">
                الأعمدة: الاسم, الهاتف, البريد (اختياري), التاقات (اختياري), المصدر (اختياري).
                الأرقام غير الكويتية تُرفض تلقائياً.
              </p>

              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-8 cursor-pointer hover:border-indigo-300 transition-colors">
                <Upload size={24} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-600">{file ? file.name : 'اختر ملف CSV'}</span>
                <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
              </label>

              {!contactListId && (
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">إضافة إلى قائمة (اختياري)</label>
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">بدون قائمة (جهات اتصال عامة فقط)</option>
                    {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.count})</option>)}
                    <option value={NEW_LIST_VALUE}>+ إنشاء قائمة جديدة</option>
                  </select>

                  {isCreatingNewList && (
                    <div className="flex gap-2 mt-2">
                      <input
                        autoFocus
                        placeholder="اسم القائمة الجديدة"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && newListName.trim()) { e.preventDefault(); createListMutation.mutate(); } }}
                        className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => createListMutation.mutate()}
                        disabled={!newListName.trim() || createListMutation.isPending}
                        className="h-10 px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {createListMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                        إنشاء
                      </button>
                    </div>
                  )}
                </div>
              )}

              {result && (
                <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1">
                  <p className="font-bold text-emerald-600">تم استيراد: {result.imported}</p>
                  <p className="font-bold text-slate-500">تم تخطي (مكرر): {result.skipped}</p>
                  {result.rejected_international > 0 && (
                    <p className="font-bold text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle size={13} />
                      أرقام دولية مرفوضة: {result.rejected_international}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleClose} className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl">إغلاق</button>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={!file || mutation.isPending || isCreatingNewList}
                  className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
                  استيراد
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ImportContactsModal;
