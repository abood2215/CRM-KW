import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Clock, MessageSquare, Users, Save, Plus, Edit, Trash2, Loader2, Lock, X, Eye, EyeOff,
  Settings, ChevronLeft, Shield, BellRing, UserPlus
} from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import AddUserModal from '../../components/AddUserModal';

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 focus:outline-none shadow-inner',
      checked ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-200'
    )}
    style={{ width: '52px' }}
  >
    <span className={cn(
      'pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-300',
      checked ? 'translate-x-6' : 'translate-x-0'
    )} />
  </button>
);

const avatarColors = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
];

const EditUserModal = ({ user, onClose, onSaved }) => {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('agent');
  const [isActive, setIsActive] = useState(true);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (user) { setName(user.name); setEmail(user.email); setPassword(''); setRole(user.role); setIsActive(user.is_active ?? true); }
  }, [user]);

  const mutation = useMutation({
    mutationFn: (payload) => api.put(`/users/${user.id}`, payload),
    onSuccess: () => { toast.success('تم تحديث المستخدم'); onSaved(); onClose(); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل التحديث'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return toast.error('الاسم والبريد مطلوبان');
    const payload = { name: name.trim(), email: email.trim(), role, is_active: isActive };
    if (password.trim()) {
      if (password.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      payload.password = password;
    }
    mutation.mutate(payload);
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-cairo">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-l from-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="font-black text-white text-lg">تعديل المستخدم</h3>
            <p className="text-indigo-200 text-xs mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">الاسم الكامل *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">البريد الإلكتروني *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr"
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              كلمة المرور <span className="text-slate-400 font-normal">(اتركه فارغاً للإبقاء)</span>
            </label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" dir="ltr"
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">الصلاحية</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all">
              <option value="admin">مدير النظام</option>
              <option value="manager">مشرف</option>
              <option value="agent">موظف</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-sm font-bold text-slate-700">حالة الحساب</span>
            <div className="flex items-center gap-2.5">
              <span className={cn('text-xs font-bold', isActive ? 'text-emerald-600' : 'text-slate-400')}>
                {isActive ? 'نشط' : 'معطل'}
              </span>
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">
              إلغاء
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 h-11 bg-gradient-to-l from-indigo-600 to-violet-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/25">
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={15} />}
              حفظ التغييرات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('hours');
  const [localHours, setLocalHours]   = useState([]);
  const [localReplies, setLocalReplies] = useState([]);
  const [addUserOpen, setAddUserOpen]   = useState(false);
  const [editingUser, setEditingUser]   = useState(null);

  const { data: hoursData, isLoading: loadingHours } = useQuery({
    queryKey: ['business-hours'],
    queryFn: async () => { const { data } = await api.get('/settings/business-hours'); return data.business_hours; },
    enabled: activeTab === 'hours',
  });

  const { data: userList = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => { const { data } = await api.get('/users'); return data.users; },
    enabled: activeTab === 'users',
  });

  const { data: repliesData, isLoading: loadingReplies } = useQuery({
    queryKey: ['auto-replies'],
    queryFn: async () => { const { data } = await api.get('/settings/auto-replies'); return data.auto_replies; },
    enabled: activeTab === 'replies',
  });

  useEffect(() => { if (hoursData) setLocalHours(hoursData); }, [hoursData]);
  useEffect(() => { if (repliesData) setLocalReplies(repliesData); }, [repliesData]);

  const saveHoursMutation = useMutation({
    mutationFn: () => api.put('/settings/business-hours', {
      hours: localHours.map(h => ({ day_of_week: h.day_of_week, start_time: (h.start_time ?? '').substring(0, 5), end_time: (h.end_time ?? '').substring(0, 5), is_active: h.is_active })),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['business-hours'] }); toast.success('تم حفظ ساعات العمل'); },
    onError: () => toast.error('فشل حفظ ساعات العمل'),
  });

  const saveRepliesMutation = useMutation({
    mutationFn: () => api.put('/settings/auto-replies', {
      replies: localReplies.map(r => ({ trigger: r.trigger, message: r.message, is_active: r.is_active })),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['auto-replies'] }); toast.success('تم حفظ الردود التلقائية'); },
    onError: () => toast.error('فشل حفظ الردود التلقائية'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('تم حذف المستخدم'); },
    onError: () => toast.error('فشل حذف المستخدم'),
  });

  const handleSave = () => {
    if (activeTab === 'hours') saveHoursMutation.mutate();
    else if (activeTab === 'replies') saveRepliesMutation.mutate();
  };

  const isSaving = saveHoursMutation.isPending || saveRepliesMutation.isPending;

  const tabs = [
    { id: 'hours',   label: 'ساعات العمل',       icon: Clock,          desc: 'أوقات العمل والدوام' },
    { id: 'replies', label: 'الردود التلقائية',   icon: BellRing,       desc: 'ردود واتساب التلقائية' },
    { id: 'users',   label: 'إدارة المستخدمين',  icon: Users,          desc: 'الفريق والصلاحيات' },
  ];

  const daysLabel = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayColors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-cyan-500 to-sky-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-600',
    'from-slate-500 to-slate-600',
  ];

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-4 font-cairo">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-rose-200 rounded-3xl flex items-center justify-center mx-auto">
            <Lock size={36} className="text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">تم منع الوصول</h1>
            <p className="text-slate-500 text-sm font-medium mt-2">هذه الصفحة متاحة فقط للمديرين والمشرفين.</p>
          </div>
          <Link to="/" className="block h-12 bg-gradient-to-l from-indigo-600 to-violet-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25">
            العودة إلى الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-cairo pb-8">

      {/* Page Header */}
      <div className="bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px'}} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <Settings size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black">إعدادات النظام</h1>
              <p className="text-indigo-200 text-sm mt-0.5">تخصيص النظام ليناسب احتياجات مركز مطمئنة</p>
            </div>
          </div>
          {activeTab !== 'users' && (
            <button onClick={handleSave} disabled={isSaving}
              className="h-11 px-6 bg-white text-indigo-700 font-black rounded-2xl hover:bg-indigo-50 transition-all flex items-center gap-2 disabled:opacity-70 shadow-xl text-sm self-start sm:self-auto flex-shrink-0">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ التغييرات
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="flex gap-2 lg:hidden overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex-shrink-0 border',
                activeTab === tab.id
                  ? 'bg-gradient-to-l from-indigo-600 to-violet-600 text-white border-transparent shadow-lg shadow-indigo-500/30'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
              )}>
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-col gap-2 w-64 flex-shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full px-5 py-4 rounded-2xl flex items-center gap-4 transition-all text-right border',
                  isActive
                    ? 'bg-gradient-to-l from-indigo-600 to-violet-600 text-white border-transparent shadow-xl shadow-indigo-500/20'
                    : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700'
                )}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                  isActive ? 'bg-white/20' : 'bg-slate-100')}>
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} />
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-black', isActive ? 'text-white' : 'text-slate-700')}>{tab.label}</p>
                  <p className={cn('text-[11px] mt-0.5', isActive ? 'text-white/70' : 'text-slate-400')}>{tab.desc}</p>
                </div>
                {isActive && <ChevronLeft size={16} className="text-white/70 mr-auto flex-shrink-0" />}
              </button>
            );
          })}

          {/* Info Card */}
          <div className="mt-2 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-indigo-500" />
              <span className="text-xs font-black text-indigo-700">الصلاحيات</span>
            </div>
            <p className="text-[11px] text-indigo-600 leading-relaxed">أنت مسجل كـ <strong>{user.role === 'admin' ? 'مدير النظام' : 'مشرف'}</strong> ولديك وصول كامل للإعدادات.</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* Business Hours */}
          {activeTab === 'hours' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">توقيتات العمل</h3>
                    <p className="text-xs text-slate-400 mt-0.5">الردود التلقائية تعمل خارج هذه الأوقات</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black border border-indigo-100">
                    <Clock size={12} /> Asia/Kuwait
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {loadingHours ? (
                    <div className="flex justify-center py-14">
                      <Loader2 className="animate-spin text-indigo-500" size={30} />
                    </div>
                  ) : localHours.map((day, idx) => (
                    <div key={day.id}
                      className={cn(
                        'rounded-2xl border transition-all duration-200',
                        day.is_active
                          ? 'border-emerald-200/80 bg-gradient-to-l from-emerald-50/60 to-teal-50/40'
                          : 'border-slate-100 bg-slate-50/50'
                      )}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Day badge */}
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[11px] font-black text-white transition-all',
                          day.is_active ? `bg-gradient-to-br ${dayColors[day.day_of_week]}` : 'bg-slate-200 text-slate-400'
                        )}>
                          {daysLabel[day.day_of_week].slice(0, 2)}
                        </div>

                        {/* Day name */}
                        <span className={cn('text-sm font-black w-20 flex-shrink-0', day.is_active ? 'text-slate-800' : 'text-slate-400')}>
                          {daysLabel[day.day_of_week]}
                        </span>

                        {/* Time inputs */}
                        <div className={cn('flex items-center gap-2 flex-1 transition-all', !day.is_active && 'opacity-40 pointer-events-none')}>
                          <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 px-3 py-2 flex-1 max-w-[130px]">
                            <span className="text-[10px] font-black text-slate-400 flex-shrink-0">من</span>
                            <input type="time" value={day.start_time} disabled={!day.is_active}
                              onChange={e => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, start_time: e.target.value } : d))}
                              className="flex-1 text-xs font-bold text-slate-700 bg-transparent focus:outline-none min-w-0" />
                          </div>
                          <span className="text-slate-300 font-black">—</span>
                          <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 px-3 py-2 flex-1 max-w-[130px]">
                            <span className="text-[10px] font-black text-slate-400 flex-shrink-0">إلى</span>
                            <input type="time" value={day.end_time} disabled={!day.is_active}
                              onChange={e => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, end_time: e.target.value } : d))}
                              className="flex-1 text-xs font-bold text-slate-700 bg-transparent focus:outline-none min-w-0" />
                          </div>
                        </div>

                        {/* Toggle */}
                        <div className="flex-shrink-0 mr-auto">
                          <Toggle checked={day.is_active}
                            onChange={v => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, is_active: v } : d))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Auto Replies */}
          {activeTab === 'replies' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h3 className="text-lg font-black text-slate-800">الردود التلقائية</h3>
                  <p className="text-xs text-slate-400 mt-0.5">تُرسل تلقائياً عبر واتساب عند تحقق الشرط</p>
                </div>

                <div className="p-4 space-y-4">
                  {loadingReplies ? (
                    <div className="flex justify-center py-16">
                      <Loader2 className="animate-spin text-indigo-500" size={30} />
                    </div>
                  ) : localReplies.map((reply, idx) => {
                    const isOutside = reply.trigger === 'outside_hours';
                    return (
                      <div key={reply.id}
                        className={cn(
                          'rounded-2xl border overflow-hidden transition-all',
                          reply.is_active ? 'border-indigo-200' : 'border-slate-200'
                        )}>
                        <div className={cn(
                          'flex items-center justify-between px-5 py-4',
                          reply.is_active
                            ? 'bg-gradient-to-l from-indigo-600 to-violet-600'
                            : 'bg-slate-50 border-b border-slate-100'
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                              reply.is_active ? 'bg-white/20' : 'bg-white border border-slate-200')}>
                              {isOutside
                                ? <Clock size={18} className={reply.is_active ? 'text-white' : 'text-slate-400'} />
                                : <MessageSquare size={18} className={reply.is_active ? 'text-white' : 'text-slate-400'} />}
                            </div>
                            <div>
                              <p className={cn('text-sm font-black', reply.is_active ? 'text-white' : 'text-slate-800')}>
                                {isOutside ? 'رد خارج أوقات العمل' : 'ترحيب العملاء الجدد'}
                              </p>
                              <p className={cn('text-[11px] mt-0.5', reply.is_active ? 'text-white/70' : 'text-slate-400')}>
                                {isOutside ? 'يُرسل خارج ساعات العمل' : 'يُرسل عند أول تواصل'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 flex-shrink-0">
                            <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-lg',
                              reply.is_active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500')}>
                              {reply.is_active ? 'مفعّل' : 'معطّل'}
                            </span>
                            <Toggle checked={reply.is_active}
                              onChange={v => setLocalReplies(r => r.map((rep, i) => i === idx ? { ...rep, is_active: v } : rep))} />
                          </div>
                        </div>
                        <div className="p-5">
                          <label className="block text-xs font-black text-slate-500 mb-2">نص الرسالة</label>
                          <textarea rows={4}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none transition-all"
                            placeholder="اكتب نص الرد التلقائي هنا..."
                            value={reply.message}
                            onChange={e => setLocalReplies(r => r.map((rep, i) => i === idx ? { ...rep, message: e.target.value } : rep))} />
                          <p className="text-[10px] text-slate-400 mt-1.5 text-left ltr">{reply.message.length} حرف</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800">مستخدمو النظام</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{userList.length} مستخدم مسجّل</p>
                </div>
                <button onClick={() => setAddUserOpen(true)}
                  className="h-10 px-4 bg-gradient-to-l from-indigo-600 to-violet-600 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-indigo-500/25">
                  <UserPlus size={14} /> إضافة مستخدم
                </button>
              </div>

              {loadingUsers ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="animate-spin text-indigo-500" size={30} />
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {userList.map((u, idx) => {
                    const gradColor = avatarColors[idx % avatarColors.length];
                    const roleMap = { admin: { label: 'مدير', cls: 'bg-rose-50 text-rose-600 border-rose-100' }, manager: { label: 'مشرف', cls: 'bg-amber-50 text-amber-600 border-amber-100' }, agent: { label: 'موظف', cls: 'bg-indigo-50 text-indigo-600 border-indigo-100' } };
                    const roleInfo = roleMap[u.role] || roleMap.agent;
                    return (
                      <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-all group">
                        <div className={cn('w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md', gradColor)}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-slate-800 truncate">{u.name}</p>
                            <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-black border flex-shrink-0', roleInfo.cls)}>
                              {roleInfo.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold',
                            u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                            <div className={cn('w-1.5 h-1.5 rounded-full', u.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                            {u.is_active ? 'نشط' : 'معطل'}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingUser(u)}
                              className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                              <Edit size={15} />
                            </button>
                            <button onClick={() => { if (window.confirm(`هل تريد حذف "${u.name}"؟`)) deleteUserMutation.mutate(u.id); }}
                              className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
