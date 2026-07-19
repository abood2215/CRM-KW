import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { users as usersApi, roles as rolesApi } from '../../../api';
import { useModalA11y } from '../../../hooks/useModalA11y';

const emptyForm = { name: '', email: '', password: '', role_id: '', phone: '', specialty: '', is_active: true };

const UserFormModal = ({ open, onClose, user }) => {
  const queryClient = useQueryClient();
  const ref = useModalA11y(open, onClose);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const isEdit = !!user;

  const { data: roleList = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.getRoles,
    enabled: open,
  });

  // Reuses UsersTab's already-fetched ['users'] cache — just here to build the specialty
  // suggestion list, not to trigger a second network round-trip.
  const { data: existingUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getUsers,
    enabled: open,
  });
  const specialtySuggestions = [...new Set(existingUsers.map((u) => u.specialty).filter(Boolean))];

  useEffect(() => {
    if (open) {
      setForm(user ? {
        name: user.name,
        email: user.email,
        password: '',
        role_id: user.role?.id ?? '',
        phone: user.phone ?? '',
        specialty: user.specialty ?? '',
        is_active: user.is_active ?? true,
      } : emptyForm);
    }
  }, [open, user]);

  useEffect(() => {
    if (open && !isEdit && !form.role_id && roleList.length > 0) {
      const defaultRole = roleList.find((r) => r.slug === 'agent') ?? roleList[0];
      setForm((f) => ({ ...f, role_id: defaultRole.id }));
    }
  }, [open, isEdit, roleList, form.role_id]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      return isEdit ? usersApi.updateUser(user.id, payload) : usersApi.createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(isEdit ? 'تم تحديث المستخدم' : 'تم إنشاء المستخدم بنجاح');
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشلت العملية'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEdit && form.password.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    mutation.mutate();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div ref={ref} role="dialog" aria-modal="true" className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-black text-slate-800">{isEdit ? 'تعديل المستخدم' : 'مستخدم جديد'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">الاسم الكامل *</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="اسم الموظف" />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">البريد الإلكتروني *</label>
            <input type="email" required dir="ltr" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="user@example.com" />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">
              كلمة المرور {isEdit ? <span className="text-slate-400 font-normal">(اتركه فارغاً للإبقاء)</span> : '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} required={!isEdit} minLength={8} dir="ltr"
                value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full h-11 px-4 pl-11 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="8 أحرف على الأقل" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">الصلاحية *</label>
              <select value={form.role_id} onChange={(e) => setForm((f) => ({ ...f, role_id: Number(e.target.value) }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                {roleList.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">رقم الهاتف</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="07xxxxxxxx" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">التخصص (اختياري — لتوجيه المحادثات الجديدة تلقائياً)</label>
            <input
              list="specialty-suggestions"
              value={form.specialty}
              onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              placeholder="مثال: نطق، لغة إنجليزية"
            />
            <datalist id="specialty-suggestions">
              {specialtySuggestions.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          {isEdit && (
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
              <span className="text-sm font-bold text-slate-700">حالة الحساب</span>
              <span className="flex items-center gap-2">
                <span className={form.is_active ? 'text-xs font-bold text-emerald-600' : 'text-xs font-bold text-slate-400'}>{form.is_active ? 'نشط' : 'معطل'}</span>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl">إلغاء</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 h-11 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'حفظ' : 'إنشاء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
