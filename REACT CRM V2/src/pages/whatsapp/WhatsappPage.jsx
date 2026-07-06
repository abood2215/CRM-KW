import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, RefreshCw, X } from 'lucide-react';
import { whatsappNumbers as whatsappNumbersApi } from '../../api';
import { cn } from '../../utils/cn';

const emptyForm = {
  name: '',
  phone: '',
  api_type: 'cloud',
  phone_number_id: '',
  access_token: '',
  business_account_id: '',
  session_name: '',
};

const WhatsappPage = () => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: numbers = [], isLoading } = useQuery({
    queryKey: ['whatsapp-numbers'],
    queryFn: whatsappNumbersApi.getWhatsappNumbers,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['whatsapp-numbers'] });

  const createMutation = useMutation({
    mutationFn: (data) => whatsappNumbersApi.createWhatsappNumber(data),
    onSuccess: () => { invalidate(); toast.success('تم إضافة الرقم بنجاح'); setAddOpen(false); setForm(emptyForm); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إضافة الرقم'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => whatsappNumbersApi.deleteWhatsappNumber(id),
    onSuccess: () => { invalidate(); toast.success('تم حذف الرقم'); },
  });

  const syncMutation = useMutation({
    mutationFn: (id) => whatsappNumbersApi.syncTemplatesForNumber(id),
    onSuccess: () => toast.success('جاري مزامنة القوالب في الخلفية'),
    onError: (e) => toast.error(e?.response?.data?.message || 'فشلت المزامنة'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">أرقام واتساب</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">إدارة أرقام الإرسال (Cloud API أو واتساب ويب).</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm">
          <Plus size={16} />
          <span>رقم جديد</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600 h-10 w-10" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {numbers.map((n) => (
            <div key={n.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-black text-slate-800">{n.name}</h3>
                  <p className="text-sm text-slate-500 font-medium">{n.phone}</p>
                </div>
                <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-lg uppercase', n.can_send ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                  {n.can_send ? 'متصل' : 'غير متصل'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-4">
                <span>{n.api_type === 'cloud' ? 'Cloud API' : 'واتساب ويب'}</span>
                <span>{n.sent_today} / {n.daily_limit} اليوم</span>
              </div>
              <div className="flex gap-2">
                {n.api_type === 'cloud' && (
                  <button onClick={() => syncMutation.mutate(n.id)} className="flex-1 h-9 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50">
                    <RefreshCw size={13} />
                    مزامنة القوالب
                  </button>
                )}
                <button
                  onClick={() => { if (window.confirm('حذف هذا الرقم؟')) deleteMutation.mutate(n.id); }}
                  className="h-9 w-9 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">رقم واتساب جديد</h2>
              <button onClick={() => setAddOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
              className="p-8 space-y-4"
            >
              <input required placeholder="اسم الرقم" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <input required placeholder="رقم الهاتف" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <select value={form.api_type} onChange={(e) => setForm((f) => ({ ...f, api_type: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                <option value="cloud">Cloud API</option>
                <option value="baileys">واتساب ويب (Baileys)</option>
              </select>
              {form.api_type === 'cloud' ? (
                <>
                  <input required placeholder="Phone Number ID" value={form.phone_number_id} onChange={(e) => setForm((f) => ({ ...f, phone_number_id: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input required placeholder="Access Token" value={form.access_token} onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input placeholder="Business Account ID" value={form.business_account_id} onChange={(e) => setForm((f) => ({ ...f, business_account_id: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </>
              ) : (
                <input required placeholder="اسم الجلسة (session_name)" value={form.session_name} onChange={(e) => setForm((f) => ({ ...f, session_name: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAddOpen(false)} className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl">إلغاء</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  {createMutation.isPending && <Loader2 size={18} className="animate-spin" />}
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsappPage;
