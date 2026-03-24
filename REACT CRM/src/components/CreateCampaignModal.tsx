import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { X, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Recipient { phone: string; name: string }

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '', message_text: '', delay_seconds: '5', scheduled_at: '',
  });
  const [recipients, setRecipients] = useState<Recipient[]>([{ phone: '', name: '' }]);
  const [csvText, setCsvText] = useState('');
  const [inputMode, setInputMode] = useState<'manual' | 'csv'>('manual');

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/campaigns', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('تم إنشاء الحملة وبدء الإرسال');
      onClose();
      setForm({ name: '', message_text: '', delay_seconds: '5', scheduled_at: '' });
      setRecipients([{ phone: '', name: '' }]);
      setCsvText('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إنشاء الحملة'),
  });

  const addRecipient = () => setRecipients(r => [...r, { phone: '', name: '' }]);
  const removeRecipient = (i: number) => setRecipients(r => r.filter((_, idx) => idx !== i));
  const updateRecipient = (i: number, field: keyof Recipient, value: string) =>
    setRecipients(r => r.map((rec, idx) => idx === i ? { ...rec, [field]: value } : rec));

  const parseCsv = () => {
    const lines = csvText.trim().split('\n').filter(Boolean);
    const parsed: Recipient[] = lines.map(line => {
      const [phone, name] = line.split(',').map(s => s.trim());
      return { phone: phone || '', name: name || '' };
    }).filter(r => r.phone);
    if (!parsed.length) return toast.error('لا توجد أرقام صالحة في النص');
    setRecipients(parsed);
    toast.success(`تم تحليل ${parsed.length} رقم`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('اسم الحملة مطلوب');
    if (!form.message_text.trim()) return toast.error('نص الرسالة مطلوب');
    const validRecipients = recipients.filter(r => r.phone.trim());
    if (!validRecipients.length) return toast.error('أضف مستلماً واحداً على الأقل');

    mutation.mutate({
      ...form,
      delay_seconds: Number(form.delay_seconds) || 5,
      scheduled_at: form.scheduled_at || undefined,
      recipients: validRecipients,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl relative"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">حملة ترويجية جديدة</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">اسم الحملة *</label>
                  <input type="text" required
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="مثال: عروض رمضان 2025" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">التأخير بين الرسائل (ثانية)</label>
                  <input type="number" min="1" max="60"
                    value={form.delay_seconds} onChange={e => setForm(f => ({ ...f, delay_seconds: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">نص الرسالة *</label>
                <textarea rows={4} required
                  value={form.message_text} onChange={e => setForm(f => ({ ...f, message_text: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="اكتب نص الرسالة التي ستُرسل لجميع المستلمين..." />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">جدولة (اختياري)</label>
                <input type="datetime-local"
                  value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              {/* Recipients Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-black text-slate-600">المستلمون *</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setInputMode('manual')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${inputMode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      يدوي
                    </button>
                    <button type="button" onClick={() => setInputMode('csv')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${inputMode === 'csv' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      CSV
                    </button>
                  </div>
                </div>

                {inputMode === 'manual' ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {recipients.map((r, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="text" placeholder="رقم الهاتف *"
                          value={r.phone} onChange={e => updateRecipient(i, 'phone', e.target.value)}
                          className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        <input type="text" placeholder="الاسم (اختياري)"
                          value={r.name} onChange={e => updateRecipient(i, 'name', e.target.value)}
                          className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        {recipients.length > 1 && (
                          <button type="button" onClick={() => removeRecipient(i)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addRecipient}
                      className="w-full h-10 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl text-xs font-bold hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2">
                      <Plus size={16} /> إضافة رقم
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea rows={5}
                      value={csvText} onChange={e => setCsvText(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                      placeholder={'الصيغة: رقم_الهاتف,الاسم\n0791234567,محمد أحمد\n0795678901,فاطمة علي'} />
                    <button type="button" onClick={parseCsv}
                      className="w-full h-10 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                      <Upload size={16} /> تحليل الأرقام ({recipients.filter(r => r.phone).length} رقم حالياً)
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                  إلغاء
                </button>
                <button type="submit" disabled={mutation.isPending}
                  className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                  {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
                  إطلاق الحملة
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
