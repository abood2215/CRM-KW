import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { dripSequences as dripSequencesApi, whatsappNumbers as whatsappNumbersApi } from '../api';
import { useModalA11y } from '../hooks/useModalA11y';

const emptyForm = { name: '', description: '', whatsapp_number_id: '' };

const CreateDripSequenceModal = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const ref = useModalA11y(open, onClose);
  const [form, setForm] = useState(emptyForm);

  const { data: numbers = [] } = useQuery({
    queryKey: ['whatsapp-numbers'],
    queryFn: whatsappNumbersApi.getWhatsappNumbers,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      dripSequencesApi.createDripSequence({
        ...form,
        whatsapp_number_id: form.whatsapp_number_id ? Number(form.whatsapp_number_id) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-sequences'] });
      toast.success('تم إنشاء السلسلة بنجاح');
      onClose();
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إنشاء السلسلة'),
  });

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
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">سلسلة متابعة جديدة</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.name.trim()) return toast.error('اسم السلسلة مطلوب');
                mutation.mutate();
              }}
              className="p-8 space-y-5"
            >
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">اسم السلسلة *</label>
                <input
                  type="text" required
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="مثال: متابعة العملاء الجدد"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">رقم واتساب المرسِل (اختياري)</label>
                <select
                  value={form.whatsapp_number_id} onChange={(e) => setForm((f) => ({ ...f, whatsapp_number_id: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">أي رقم متصل</option>
                  {numbers.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">وصف (اختياري)</label>
                <textarea
                  rows={2}
                  value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="الهدف من هذه السلسلة..."
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                  إلغاء
                </button>
                <button type="submit" disabled={mutation.isPending}
                  className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                  {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
                  إنشاء السلسلة
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateDripSequenceModal;
