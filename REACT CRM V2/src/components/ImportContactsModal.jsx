import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Upload, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { contacts as contactsApi } from '../api';

const ImportContactsModal = ({ open, onClose, contactListId = null }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: () => contactsApi.importContactsCsv(file, contactListId),
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
    setResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
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
                  disabled={!file || mutation.isPending}
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
