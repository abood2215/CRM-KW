import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Save, Clock, BellRing, Users, UserCog } from 'lucide-react';
import { settings as settingsApi } from '../../api';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../utils/cn';
import UsersTab from './components/UsersTab';
import AccountTab from './components/AccountTab';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const TRIGGERS = [
  { key: 'outside_hours', label: 'خارج ساعات العمل' },
  { key: 'first_message', label: 'أول رسالة من عميل جديد' },
];

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const [tab, setTab] = useState('account');
  const [hours, setHours] = useState(null);
  const [replies, setReplies] = useState(null);

  const { data: hoursData, isLoading: hoursLoading } = useQuery({ queryKey: ['business-hours'], queryFn: settingsApi.getBusinessHours });
  const { data: repliesData, isLoading: repliesLoading } = useQuery({ queryKey: ['auto-replies'], queryFn: settingsApi.getAutoReplies });

  useEffect(() => {
    if (hoursData) {
      setHours(DAYS.map((_, day) => hoursData.find((h) => h.day_of_week === day) ?? { day_of_week: day, start_time: '09:00', end_time: '17:00', is_active: false }));
    }
  }, [hoursData]);

  useEffect(() => {
    if (repliesData) {
      setReplies(TRIGGERS.map((t) => repliesData.find((r) => r.trigger === t.key) ?? { trigger: t.key, message: '', is_active: false }));
    }
  }, [repliesData]);

  const hoursMutation = useMutation({
    mutationFn: () => settingsApi.updateBusinessHours(hours.map((h) => ({ ...h, start_time: h.start_time.slice(0, 5), end_time: h.end_time.slice(0, 5) }))),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['business-hours'] }); toast.success('تم حفظ ساعات العمل'); },
  });

  const repliesMutation = useMutation({
    mutationFn: () => settingsApi.updateAutoReplies(replies),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['auto-replies'] }); toast.success('تم حفظ الردود التلقائية'); },
  });

  const tabs = [
    { id: 'account', label: 'حسابي', icon: UserCog },
    { id: 'hours', label: 'ساعات العمل', icon: Clock },
    { id: 'replies', label: 'الردود التلقائية', icon: BellRing },
    ...(canManageUsers ? [{ id: 'users', label: 'إدارة المستخدمين', icon: Users }] : []),
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl lg:text-2xl font-black text-slate-800">الإعدادات</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border',
                tab === t.id ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
              )}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'account' && <AccountTab />}

      {tab === 'hours' && (
        hoursLoading || !hours ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-800">ساعات العمل</h3>
              <button onClick={() => hoursMutation.mutate()} disabled={hoursMutation.isPending} className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg">
                {hoursMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                حفظ
              </button>
            </div>
            <div className="space-y-2">
              {hours.map((h, i) => (
                <div key={h.day_of_week} className="flex flex-wrap items-center gap-2 sm:gap-3 py-1">
                  <label className="flex items-center gap-2 w-28 sm:w-32 flex-shrink-0">
                    <input type="checkbox" checked={h.is_active} onChange={(e) => setHours((prev) => prev.map((x, idx) => (idx === i ? { ...x, is_active: e.target.checked } : x)))} />
                    <span className="text-sm font-bold text-slate-700">{DAYS[h.day_of_week]}</span>
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="time" value={h.start_time.slice(0, 5)} onChange={(e) => setHours((prev) => prev.map((x, idx) => (idx === i ? { ...x, start_time: e.target.value } : x)))} className="h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                    <span className="text-slate-400 text-xs">إلى</span>
                    <input type="time" value={h.end_time.slice(0, 5)} onChange={(e) => setHours((prev) => prev.map((x, idx) => (idx === i ? { ...x, end_time: e.target.value } : x)))} className="h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {tab === 'replies' && (
        repliesLoading || !replies ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-800">الردود التلقائية</h3>
              <button onClick={() => repliesMutation.mutate()} disabled={repliesMutation.isPending} className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg">
                {repliesMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                حفظ
              </button>
            </div>
            <div className="space-y-4">
              {replies.map((r, i) => (
                <div key={r.trigger}>
                  <label className="flex items-center gap-2 mb-1.5">
                    <input type="checkbox" checked={r.is_active} onChange={(e) => setReplies((prev) => prev.map((x, idx) => (idx === i ? { ...x, is_active: e.target.checked } : x)))} />
                    <span className="text-sm font-bold text-slate-700">{TRIGGERS.find((t) => t.key === r.trigger)?.label}</span>
                  </label>
                  <textarea
                    rows={2}
                    value={r.message}
                    onChange={(e) => setReplies((prev) => prev.map((x, idx) => (idx === i ? { ...x, message: e.target.value } : x)))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none"
                    placeholder="نص الرد التلقائي..."
                  />
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {tab === 'users' && canManageUsers && <UsersTab />}
    </div>
  );
};

export default SettingsPage;
