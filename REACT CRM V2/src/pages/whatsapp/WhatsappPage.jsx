import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, RefreshCw, X, Pencil, QrCode } from 'lucide-react';
import { whatsappNumbers as whatsappNumbersApi } from '../../api';
import { cn } from '../../utils/cn';
import { useConfirm } from '../../hooks/useConfirm';
import { useModalA11y } from '../../hooks/useModalA11y';
import { usePermission } from '../../hooks/usePermission';
import BaileysQrModal from './components/BaileysQrModal';

const QUALITY_LABELS = {
  GREEN: { label: 'جيدة', cls: 'bg-emerald-50 text-emerald-600' },
  YELLOW: { label: 'متوسطة', cls: 'bg-amber-50 text-amber-600' },
  RED: { label: 'ضعيفة', cls: 'bg-rose-50 text-rose-600' },
  UNKNOWN: { label: 'غير معروفة', cls: 'bg-slate-100 text-slate-400' },
};

const emptyForm = {
  name: '',
  phone: '',
  api_type: 'cloud',
  phone_number_id: '',
  access_token: '',
  business_account_id: '',
  session_name: '',
  daily_limit: 500,
};

const WhatsappPage = () => {
  const queryClient = useQueryClient();
  const canManage = usePermission('whatsapp_numbers.manage');
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [addOpen, setAddOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState(null);
  const [qrNumber, setQrNumber] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const modalRef = useModalA11y(addOpen || !!editingNumber, () => { setAddOpen(false); setEditingNumber(null); });

  const isEdit = !!editingNumber;

  const { data: numbers = [], isLoading } = useQuery({
    queryKey: ['whatsapp-numbers'],
    queryFn: whatsappNumbersApi.getWhatsappNumbers,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['whatsapp-numbers'] });

  useEffect(() => {
    if (isEdit) {
      setForm({
        name: editingNumber.name,
        phone: editingNumber.phone,
        api_type: editingNumber.api_type,
        phone_number_id: editingNumber.phone_number_id ?? '',
        access_token: '',
        business_account_id: editingNumber.business_account_id ?? '',
        session_name: editingNumber.session_name ?? '',
        daily_limit: editingNumber.daily_limit ?? 500,
      });
    }
  }, [editingNumber, isEdit]);

  const createMutation = useMutation({
    mutationFn: (data) => whatsappNumbersApi.createWhatsappNumber(data),
    onSuccess: () => { invalidate(); toast.success('تم إضافة الرقم بنجاح'); setAddOpen(false); setForm(emptyForm); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إضافة الرقم'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const payload = { name: data.name, daily_limit: Number(data.daily_limit) };
      if (data.api_type === 'cloud') {
        if (data.access_token) payload.access_token = data.access_token;
        payload.phone_number_id = data.phone_number_id;
        payload.business_account_id = data.business_account_id;
      }

      return whatsappNumbersApi.updateWhatsappNumber(editingNumber.id, payload);
    },
    onSuccess: () => { invalidate(); toast.success('تم تحديث الرقم'); setEditingNumber(null); setForm(emptyForm); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل تحديث الرقم'),
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

  const closeForm = () => { setAddOpen(false); setEditingNumber(null); setForm(emptyForm); };

  const handleDelete = async (id) => {
    if (await confirm('حذف هذا الرقم؟')) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">أرقام واتساب</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">إدارة أرقام الإرسال (Cloud API أو واتساب ويب).</p>
        </div>
        {canManage && (
          <button onClick={() => setAddOpen(true)} className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm self-start sm:self-auto">
            <Plus size={16} />
            <span>رقم جديد</span>
          </button>
        )}
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
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-2">
                <span>{n.api_type === 'cloud' ? 'Cloud API' : 'واتساب ويب'}</span>
                <span>{n.sent_today} / {n.daily_limit} اليوم</span>
              </div>
              {n.api_type === 'cloud' && (
                <div className="flex items-center justify-between text-xs mb-4">
                  {n.quality_rating ? (
                    <span className={cn('font-black px-2 py-0.5 rounded-lg', QUALITY_LABELS[n.quality_rating]?.cls ?? QUALITY_LABELS.UNKNOWN.cls)}>
                      جودة الحساب: {QUALITY_LABELS[n.quality_rating]?.label ?? n.quality_rating}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-bold">جودة الحساب: لم تُفحص بعد</span>
                  )}
                  {n.quality_checked_at && (
                    <span className="text-slate-300">{formatDistanceToNow(new Date(n.quality_checked_at), { locale: ar, addSuffix: true })}</span>
                  )}
                </div>
              )}
              {canManage && (
                <div className="flex gap-2">
                  {n.api_type === 'cloud' ? (
                    <button onClick={() => syncMutation.mutate(n.id)} className="flex-1 h-9 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50">
                      <RefreshCw size={13} />
                      مزامنة القوالب
                    </button>
                  ) : (
                    <button
                      onClick={() => setQrNumber(n)}
                      className={cn(
                        'flex-1 h-9 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5',
                        n.can_send ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                      )}
                    >
                      <QrCode size={13} />
                      {n.can_send ? 'إعادة الربط' : 'ربط عبر QR'}
                    </button>
                  )}
                  <button
                    onClick={() => setEditingNumber(n)}
                    className="h-9 w-9 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="h-9 w-9 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(addOpen || isEdit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div ref={modalRef} role="dialog" aria-modal="true" className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">{isEdit ? `تعديل ${editingNumber.name}` : 'رقم واتساب جديد'}</h2>
              <button onClick={closeForm} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); isEdit ? updateMutation.mutate(form) : createMutation.mutate(form); }}
              className="p-8 space-y-4"
            >
              <input required placeholder="اسم الرقم" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              {!isEdit && (
                <input required placeholder="رقم الهاتف" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              )}
              <input type="number" min="1" placeholder="الحد اليومي للإرسال" value={form.daily_limit} onChange={(e) => setForm((f) => ({ ...f, daily_limit: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              {!isEdit && (
                <select value={form.api_type} onChange={(e) => setForm((f) => ({ ...f, api_type: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="cloud">Cloud API</option>
                  <option value="baileys">واتساب ويب (Baileys)</option>
                </select>
              )}
              {form.api_type === 'cloud' ? (
                <>
                  <input required={!isEdit} placeholder="Phone Number ID" value={form.phone_number_id} onChange={(e) => setForm((f) => ({ ...f, phone_number_id: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input required={!isEdit} placeholder={isEdit ? 'Access Token (اتركه فاضي لعدم التغيير)' : 'Access Token'} value={form.access_token} onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input placeholder="Business Account ID" value={form.business_account_id} onChange={(e) => setForm((f) => ({ ...f, business_account_id: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </>
              ) : !isEdit ? (
                <input required placeholder="اسم الجلسة (session_name)" value={form.session_name} onChange={(e) => setForm((f) => ({ ...f, session_name: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              ) : null}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl">إلغاء</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={18} className="animate-spin" />}
                  {isEdit ? 'حفظ' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BaileysQrModal number={qrNumber} onClose={() => setQrNumber(null)} />
      {confirmDialog}
    </div>
  );
};

export default WhatsappPage;
