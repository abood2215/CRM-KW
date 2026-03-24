import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  defaultStatus?: string;
}

const SOURCES = [
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'instagram', label: 'إنستغرام' },
  { value: 'referral', label: 'توصية' },
  { value: 'google', label: 'جوجل' },
];

const STATUSES = [
  { value: 'new', label: 'جديد' },
  { value: 'contacted', label: 'تم التواصل' },
  { value: 'interested', label: 'مهتم' },
  { value: 'booked', label: 'محجوز' },
  { value: 'active', label: 'نشط' },
  { value: 'following', label: 'متابعة' },
];

const AddClientModal: React.FC<AddClientModalProps> = ({ open, onClose, defaultStatus = 'new' }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '', phone: '', email: '', source: 'whatsapp',
    service: '', budget: '', status: defaultStatus, notes: '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/clients', { ...data, budget: data.budget ? Number(data.budget) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('تم إضافة العميل بنجاح');
      onClose();
      setForm({ name: '', phone: '', email: '', source: 'whatsapp', service: '', budget: '', status: 'new', notes: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إضافة العميل'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('الاسم مطلوب');
    mutation.mutate(form);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">إضافة عميل جديد</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">الاسم *</label>
                  <input
                    type="text" required
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="اسم العميل الكامل"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">رقم الهاتف</label>
                  <input
                    type="text"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="07xxxxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="email@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">المصدر *</label>
                  <select
                    required value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">الحالة</label>
                  <select
                    value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">الخدمة المطلوبة</label>
                  <input
                    type="text"
                    value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="مثال: دورة لغة عربية"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">الميزانية</label>
                  <input
                    type="number" min="0"
                    value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">ملاحظات</label>
                <textarea
                  rows={3}
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                  إلغاء
                </button>
                <button type="submit" disabled={mutation.isPending}
                  className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                  {mutation.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
                  إضافة العميل
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddClientModal;
