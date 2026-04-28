import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import { X, Loader2, User, Phone, Mail, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AddContactModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  'w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors';

const AddContactModal: React.FC<AddContactModalProps> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: '',
    notes: '',
    tags: '',
    opt_in: true,
  });

  const mutation = useMutation({
    mutationFn: (payload: typeof form) =>
      api.post('/contacts', {
        ...payload,
        tags: payload.tags
          ? payload.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      toast.success('تمت إضافة جهة الاتصال بنجاح');
      onSuccess();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'فشلت الإضافة، تحقق من البيانات'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('الاسم مطلوب');
    if (!form.phone.trim()) return toast.error('رقم الهاتف مطلوب');
    mutation.mutate(form);
  };

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm font-cairo">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800">إضافة جهة اتصال</h2>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">
                  الاسم <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={set('name')}
                    placeholder="الاسم الكامل"
                    className={inputClass + ' pr-9'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">
                  الهاتف <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="07xxxxxxxx"
                    className={inputClass + ' pr-9'}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="email@example.com"
                  className={inputClass + ' pr-9'}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Source + Opt-in */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">المصدر</label>
                <select value={form.source} onChange={set('source')} className={inputClass}>
                  <option value="">— اختر —</option>
                  <option value="whatsapp">واتساب</option>
                  <option value="instagram">إنستغرام</option>
                  <option value="referral">توصية</option>
                  <option value="google">جوجل</option>
                  <option value="manual">يدوي</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">حالة الاشتراك</label>
                <select
                  value={form.opt_in ? 'true' : 'false'}
                  onChange={(e) => setForm((f) => ({ ...f, opt_in: e.target.value === 'true' }))}
                  className={inputClass}
                >
                  <option value="true">مشترك ✓</option>
                  <option value="false">غير مشترك</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">الوسوم (مفصولة بفاصلة)</label>
              <div className="relative">
                <Tag size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={form.tags}
                  onChange={set('tags')}
                  placeholder="مثال: vip, دورة, متابعة"
                  className={inputClass + ' pr-9'}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">ملاحظات</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={set('notes')}
                placeholder="أي ملاحظات إضافية..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                إضافة جهة الاتصال
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddContactModal;
