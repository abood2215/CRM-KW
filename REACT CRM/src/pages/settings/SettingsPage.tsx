import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Clock, MessageSquare, Users, Save, Plus, Edit, Trash2, Loader2, FileText, Lock, X, Eye, EyeOff
} from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { User, BusinessHour, AutoReply } from '../../types';
import AddUserModal from '../../components/AddUserModal';

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; color?: string }> = ({
  checked, onChange, color = 'bg-indigo-600',
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
      checked ? color : 'bg-slate-200'
    )}
  >
    <span
      className={cn(
        'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
        checked ? 'translate-x-5' : 'translate-x-0'
      )}
    />
  </button>
);

// ── Edit User Modal ────────────────────────────────────────────────────────────
interface EditUserModalProps {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSaved }) => {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<'admin' | 'manager' | 'agent'>('agent');
  const [isActive, setIsActive] = useState(true);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPassword('');
      setRole(user.role as any);
      setIsActive(user.is_active ?? true);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, any>) => api.put(`/users/${user!.id}`, payload),
    onSuccess: () => { toast.success('تم تحديث المستخدم'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل التحديث'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return toast.error('الاسم والبريد مطلوبان');
    const payload: Record<string, any> = { name: name.trim(), email: email.trim(), role, is_active: isActive };
    if (password.trim()) {
      if (password.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      payload.password = password;
    }
    mutation.mutate(payload);
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm font-cairo">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800">تعديل المستخدم</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">الاسم *</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">البريد الإلكتروني *</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr"
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              كلمة المرور <span className="text-slate-400 font-normal">(اتركه فارغاً للإبقاء على الحالية)</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" dir="ltr"
                className="w-full h-11 px-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">الصلاحية</label>
            <select value={role} onChange={e => setRole(e.target.value as any)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
              <option value="admin">مدير</option>
              <option value="manager">مشرف</option>
              <option value="agent">موظف</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-bold text-slate-600">الحالة</span>
            <div className="flex items-center gap-2">
              <Toggle checked={isActive} onChange={setIsActive} color="bg-emerald-500" />
              <span className="text-xs font-bold text-slate-600">{isActive ? 'نشط' : 'معطل'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">
              إلغاء
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 h-11 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm">
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={15} />}
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'hours' | 'replies' | 'users'>('hours');
  const [localHours, setLocalHours] = useState<BusinessHour[]>([]);
  const [localReplies, setLocalReplies] = useState<AutoReply[]>([]);
  const [addUserOpen, setAddUserOpen]   = useState(false);
  const [editingUser, setEditingUser]   = useState<User | null>(null);

  // Queries
  const { data: hoursData, isLoading: loadingHours } = useQuery<BusinessHour[]>({
    queryKey: ['business-hours'],
    queryFn: async () => {
      const { data } = await api.get('/settings/business-hours');
      return data.business_hours as BusinessHour[];
    },
    enabled: activeTab === 'hours',
  });

  const { data: userList = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data.users as User[];
    },
    enabled: activeTab === 'users',
  });

  const { data: repliesData, isLoading: loadingReplies } = useQuery<AutoReply[]>({
    queryKey: ['auto-replies'],
    queryFn: async () => {
      const { data } = await api.get('/settings/auto-replies');
      return data.auto_replies as AutoReply[];
    },
    enabled: activeTab === 'replies',
  });

  // Sync query data to local state for editing
  useEffect(() => {
    if (hoursData) setLocalHours(hoursData);
  }, [hoursData]);

  useEffect(() => {
    if (repliesData) setLocalReplies(repliesData);
  }, [repliesData]);

  // Save mutations
  const saveHoursMutation = useMutation({
    mutationFn: () => api.put('/settings/business-hours', {
      // Slice to HH:mm — DB returns "09:00:00" but validation requires "09:00"
      hours: localHours.map(h => ({
        day_of_week: h.day_of_week,
        start_time: (h.start_time ?? '').substring(0, 5),
        end_time: (h.end_time ?? '').substring(0, 5),
        is_active: h.is_active,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
      toast.success('تم حفظ ساعات العمل');
    },
    onError: () => toast.error('فشل حفظ ساعات العمل'),
  });

  const saveRepliesMutation = useMutation({
    mutationFn: () => api.put('/settings/auto-replies', {
      replies: localReplies.map(r => ({
        trigger: r.trigger,
        message: r.message,
        is_active: r.is_active,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-replies'] });
      toast.success('تم حفظ الردود التلقائية');
    },
    onError: () => toast.error('فشل حفظ الردود التلقائية'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('تم حذف المستخدم');
    },
    onError: () => toast.error('فشل حذف المستخدم'),
  });

  const handleSave = () => {
    if (activeTab === 'hours') saveHoursMutation.mutate();
    else if (activeTab === 'replies') saveRepliesMutation.mutate();
  };

  const isSaving = saveHoursMutation.isPending || saveRepliesMutation.isPending;

  const tabs = [
    { id: 'hours', label: 'ساعات العمل', icon: <Clock size={18} /> },
    { id: 'replies', label: 'الردود التلقائية', icon: <MessageSquare size={18} /> },
    { id: 'users', label: 'إدارة المستخدمين', icon: <Users size={18} /> },
  ];

  const daysLabel = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // Authorization check — must be after all hooks
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-cairo">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-rose-50 rounded-2xl">
              <Lock size={32} className="text-rose-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">تم منع الوصول</h1>
            <p className="text-slate-600 text-sm font-medium mt-2">
              هذه الصفحة متاحة فقط للمديرين والمشرفين. ليس لديك صلاحيات كافية للوصول إلى الإعدادات.
            </p>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 text-xs font-bold">
              صلاحيتك الحالية: <span className="font-black text-amber-900">موظف</span>
            </p>
          </div>
          <a
            href="/"
            className="block h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center"
          >
            العودة إلى الرئيسية
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-8 font-cairo pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">إعدادات النظام</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">تخصيص النظام ليناسب احتياجات مركز مطمئنة.</p>
        </div>
        {activeTab !== 'users' && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 lg:h-11 px-4 lg:px-6 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-70 text-sm self-start sm:self-auto"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>حفظ التغييرات</span>
          </button>
        )}
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex gap-2 lg:hidden overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border flex-shrink-0",
              activeTab === tab.id
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
                : "bg-white text-slate-400 border-slate-200"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
        {/* Desktop Tabs Sidebar */}
        <div className="hidden lg:block lg:w-64 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full px-5 py-4 rounded-2xl flex items-center gap-4 transition-all",
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
                  : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 hover:text-indigo-600"
              )}
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400")}>
                {tab.icon}
              </div>
              <span className="text-sm font-black">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="flex-1 bg-white rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">

          {/* Business Hours */}
          {activeTab === 'hours' && (
            <div className="p-5 lg:p-8 space-y-5 lg:space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base lg:text-xl font-black text-slate-800">توقيتات العمل</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">الردود التلقائية تعمل خارج هذه الأوقات.</p>
                </div>
                <div className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black border border-indigo-100">
                  Asia/Kuwait
                </div>
              </div>

              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[1fr_auto] gap-4 px-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">اليوم</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">من — إلى</span>
              </div>

              <div className="space-y-2">
                {loadingHours ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-indigo-600" size={28} />
                  </div>
                ) : localHours.map((day, idx) => (
                  <div
                    key={day.id}
                    className={cn(
                      'px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 transition-all',
                      day.is_active
                        ? 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60'
                        : 'border-slate-100 bg-slate-50/30 hover:bg-white opacity-60'
                    )}
                  >
                    {/* Day + Toggle */}
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <Toggle
                        checked={day.is_active}
                        onChange={v => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, is_active: v } : d))}
                        color="bg-emerald-500"
                      />
                      <span className={cn(
                        'text-sm font-black w-14 flex-shrink-0',
                        day.is_active ? 'text-slate-800' : 'text-slate-400'
                      )}>
                        {daysLabel[day.day_of_week]}
                      </span>
                    </div>

                    {/* Times */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-400 mb-1">من</span>
                        <input
                          type="time"
                          value={day.start_time}
                          disabled={!day.is_active}
                          onChange={e => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, start_time: e.target.value } : d))}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <span className="text-slate-300 text-base mt-4">—</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-400 mb-1">إلى</span>
                        <input
                          type="time"
                          value={day.end_time}
                          disabled={!day.is_active}
                          onChange={e => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, end_time: e.target.value } : d))}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto Replies */}
          {activeTab === 'replies' && (
            <div className="p-5 lg:p-8 space-y-5">
              <div>
                <h3 className="text-base lg:text-xl font-black text-slate-800">الردود التلقائية</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">تُرسل تلقائياً عبر واتساب عند تحقق الشرط.</p>
              </div>

              {loadingReplies ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="animate-spin text-indigo-600" size={28} />
                </div>
              ) : (
                <div className="space-y-4">
                  {localReplies.map((reply, idx) => {
                    const isOutside = reply.trigger === 'outside_hours';
                    return (
                      <div
                        key={reply.id}
                        className={cn(
                          'rounded-2xl border transition-all',
                          reply.is_active
                            ? 'border-indigo-200 bg-indigo-50/40'
                            : 'border-slate-100 bg-slate-50/30'
                        )}
                      >
                        {/* Card Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100/70">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                              reply.is_active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white border border-slate-100 text-slate-400'
                            )}>
                              {isOutside ? <Clock size={17} /> : <MessageSquare size={17} />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800">
                                {isOutside ? 'رد خارج أوقات العمل' : 'ترحيب العملاء الجدد'}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {isOutside
                                  ? 'يُرسل عند تلقي رسالة خارج ساعات العمل'
                                  : 'يُرسل عند أول تواصل من عميل جديد'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={cn(
                              'text-[10px] font-black px-2.5 py-1 rounded-lg',
                              reply.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                            )}>
                              {reply.is_active ? 'مفعّل' : 'معطّل'}
                            </span>
                            <Toggle
                              checked={reply.is_active}
                              onChange={v => setLocalReplies(r => r.map((rep, i) => i === idx ? { ...rep, is_active: v } : rep))}
                            />
                          </div>
                        </div>

                        {/* Textarea */}
                        <div className="p-5">
                          <label className="block text-xs font-black text-slate-500 mb-2">نص الرسالة</label>
                          <textarea
                            rows={4}
                            className={cn(
                              'w-full px-4 py-3 bg-white border rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none transition-all',
                              reply.is_active ? 'border-indigo-200' : 'border-slate-200 text-slate-400'
                            )}
                            placeholder="اكتب نص الرد التلقائي هنا..."
                            value={reply.message}
                            onChange={e => setLocalReplies(r => r.map((rep, i) => i === idx ? { ...rep, message: e.target.value } : rep))}
                          />
                          <p className="text-[10px] text-slate-400 mt-1.5 text-left ltr">{reply.message.length} حرف</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="p-5 lg:p-8 space-y-5 lg:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base lg:text-xl font-black text-slate-800">مستخدمو النظام</h3>
                <button
                  onClick={() => setAddUserOpen(true)}
                  className="h-9 px-4 bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus size={14} /> إضافة مستخدم
                </button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-right border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="px-4 lg:px-6 py-3 text-xs font-black text-slate-400 border-b border-slate-100">المستخدم</th>
                      <th className="px-4 lg:px-6 py-3 text-xs font-black text-slate-400 border-b border-slate-100">الصلاحية</th>
                      <th className="px-4 lg:px-6 py-3 text-xs font-black text-slate-400 border-b border-slate-100">الحالة</th>
                      <th className="px-4 lg:px-6 py-3 border-b border-slate-100 text-center w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loadingUsers ? (
                      <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="animate-spin inline-block text-indigo-600" /></td></tr>
                    ) : userList.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase flex-shrink-0">{u.name.charAt(0)}</div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 truncate">{u.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap",
                            u.role === 'admin' ? "bg-rose-50 text-rose-600" : u.role === 'manager' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600")}>
                            {u.role === 'admin' ? 'مدير' : u.role === 'manager' ? 'مشرف' : 'موظف'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <span className={cn("flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap", u.is_active ? "text-emerald-600" : "text-slate-400")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", u.is_active ? "bg-emerald-500" : "bg-slate-300")} />
                            {u.is_active ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="تعديل"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`هل تريد حذف المستخدم "${u.name}"؟`))
                                  deleteUserMutation.mutate(u.id);
                              }}
                              className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="حذف"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddUserModal open={addUserOpen} onClose={() => setAddUserOpen(false)} />
      <EditUserModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
    </div>
  );
};

export default SettingsPage;
