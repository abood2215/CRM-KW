import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { campaigns as campaignsApi, contactLists as contactListsApi, whatsappNumbers as whatsappNumbersApi, templates as templatesApi } from '../api';

const emptyForm = {
  name: '',
  whatsapp_number_id: '',
  contact_list_id: '',
  template_name: '',
  template_language: '',
  delay_seconds: 30,
};

const CreateCampaignModal = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: numbers = [] } = useQuery({
    queryKey: ['whatsapp-numbers-select'],
    queryFn: whatsappNumbersApi.getWhatsappNumbers,
    enabled: open,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['contact-lists-select'],
    queryFn: contactListsApi.getContactLists,
    enabled: open,
  });

  const { data: allTemplates = [] } = useQuery({
    queryKey: ['templates-select'],
    queryFn: () => templatesApi.getTemplates(),
    enabled: open,
  });

  const availableTemplates = useMemo(
    () => allTemplates.filter((t) => !form.whatsapp_number_id || t.whatsapp_number_id === Number(form.whatsapp_number_id)),
    [allTemplates, form.whatsapp_number_id]
  );

  const mutation = useMutation({
    mutationFn: (data) =>
      campaignsApi.createCampaign({
        ...data,
        whatsapp_number_id: data.whatsapp_number_id ? Number(data.whatsapp_number_id) : undefined,
        contact_list_id: data.contact_list_id ? Number(data.contact_list_id) : undefined,
        delay_seconds: Number(data.delay_seconds),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(res.skipped_message ?? 'تم إنشاء الحملة بنجاح');
      onClose();
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إنشاء الحملة'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('اسم الحملة مطلوب');
    if (!form.contact_list_id) return toast.error('اختر قائمة جهات اتصال');
    if (!form.template_name) return toast.error('اختر قالب رسالة');
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
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative max-h-[85vh] flex flex-col"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-black text-slate-800">حملة جديدة</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">اسم الحملة *</label>
                <input
                  type="text" required
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="مثال: عرض نهاية الأسبوع"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">رقم الإرسال *</label>
                <select
                  required value={form.whatsapp_number_id}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp_number_id: e.target.value, template_name: '', template_language: '' }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">اختر رقم واتساب</option>
                  {numbers.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.phone})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">قائمة جهات الاتصال *</label>
                <select
                  required value={form.contact_list_id}
                  onChange={(e) => setForm((f) => ({ ...f, contact_list_id: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">اختر قائمة</option>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.count})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">القالب *</label>
                <select
                  required value={form.template_name}
                  onChange={(e) => {
                    const selected = availableTemplates.find((t) => t.name === e.target.value);
                    setForm((f) => ({ ...f, template_name: e.target.value, template_language: selected?.language ?? '' }));
                  }}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">اختر قالب</option>
                  {availableTemplates.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">التأخير بين الرسائل (ثانية)</label>
                <input
                  type="number" min="1" max="3600"
                  value={form.delay_seconds} onChange={(e) => setForm((f) => ({ ...f, delay_seconds: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                  إلغاء
                </button>
                <button type="submit" disabled={mutation.isPending} className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                  {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
                  إنشاء الحملة
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateCampaignModal;
