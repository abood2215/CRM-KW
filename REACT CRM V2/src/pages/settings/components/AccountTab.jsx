import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Save, User, KeyRound } from 'lucide-react';
import { auth as authApi } from '../../../api';
import { useAuthStore } from '../../../store/useAuthStore';

const AccountTab = () => {
  const currentUser = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [profile, setProfile] = useState({ name: currentUser?.name ?? '', phone: currentUser?.phone ?? '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' });

  const profileMutation = useMutation({
    mutationFn: () => authApi.updateProfile(profile),
    onSuccess: (res) => { updateUser(res.user); toast.success('تم تحديث الملف الشخصي'); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل تحديث الملف الشخصي'),
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.updatePassword(passwordForm),
    onSuccess: () => { setPasswordForm({ current_password: '', password: '', password_confirmation: '' }); toast.success('تم تغيير كلمة المرور بنجاح'); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل تغيير كلمة المرور'),
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordForm.password.length < 8) return toast.error('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
    if (passwordForm.password !== passwordForm.password_confirmation) return toast.error('كلمتا المرور غير متطابقتين');
    passwordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
          <User size={16} className="text-indigo-600" />
          الملف الشخصي
        </h3>
        <form onSubmit={(e) => { e.preventDefault(); profileMutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">الاسم الكامل</label>
              <input
                required
                value={profile.name}
                onChange={(e) => setProfile((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">رقم الهاتف</label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile((f) => ({ ...f, phone: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                placeholder="9xxxxxxx"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">البريد الإلكتروني</label>
            <input disabled value={currentUser?.email ?? ''} className="w-full h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400" />
          </div>
          <button type="submit" disabled={profileMutation.isPending} className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-4 py-2.5 rounded-lg disabled:opacity-60">
            {profileMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            حفظ
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
          <KeyRound size={16} className="text-indigo-600" />
          تغيير كلمة المرور
        </h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">كلمة المرور الحالية</label>
            <input
              required type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, current_password: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">كلمة المرور الجديدة</label>
            <input
              required type="password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">تأكيد كلمة المرور الجديدة</label>
            <input
              required type="password"
              value={passwordForm.password_confirmation}
              onChange={(e) => setPasswordForm((f) => ({ ...f, password_confirmation: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>
          <button type="submit" disabled={passwordMutation.isPending} className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-4 py-2.5 rounded-lg disabled:opacity-60">
            {passwordMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            تغيير كلمة المرور
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountTab;
