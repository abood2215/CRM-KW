import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Clock, MessageSquare, Users, Save, Plus, Edit, Trash2, Loader2, FileText, Lock
} from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { User, BusinessHour, AutoReply } from '../../types';
import AddUserModal from '../../components/AddUserModal';

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  
  // Check authorization - only admin and manager can access settings
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

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'hours' | 'replies' | 'users'>('hours');
  const [localHours, setLocalHours] = useState<BusinessHour[]>([]);
  const [localReplies, setLocalReplies] = useState<AutoReply[]>([]);
  const [addUserOpen, setAddUserOpen] = useState(false);

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
      hours: localHours.map(h => ({
        day_of_week: h.day_of_week,
        start_time: h.start_time,
        end_time: h.end_time,
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
            <div className="p-5 lg:p-8 space-y-5 lg:space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-base lg:text-xl font-black text-slate-800">توقيتات العمل</h3>
                <div className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black">
                  Amman/Asia
                </div>
              </div>
              <div className="space-y-3">
                {loadingHours ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-indigo-600" size={28} />
                  </div>
                ) : localHours.map((day, idx) => (
                  <div key={day.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4 flex-wrap hover:bg-white transition-all">
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={day.is_active} className="sr-only peer"
                          onChange={e => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, is_active: e.target.checked } : d))} />
                        <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                      <span className="text-sm font-black text-slate-700 w-16">{daysLabel[day.day_of_week]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="time" value={day.start_time}
                        onChange={e => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, start_time: e.target.value } : d))}
                        className="px-3 py-1.5 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 bg-white focus:outline-none focus:border-indigo-500" />
                      <span className="text-slate-300 text-sm">←</span>
                      <input type="time" value={day.end_time}
                        onChange={e => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, end_time: e.target.value } : d))}
                        className="px-3 py-1.5 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 bg-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto Replies */}
          {activeTab === 'replies' && (
            <div className="p-5 lg:p-8 space-y-5 lg:space-y-6">
              <h3 className="text-base lg:text-xl font-black text-slate-800">الردود التلقائية</h3>
              <div className="grid grid-cols-1 gap-4 lg:gap-6">
                {loadingReplies ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-indigo-600" size={28} />
                  </div>
                ) : localReplies.map((reply, idx) => (
                  <div key={reply.id} className="p-5 lg:p-6 rounded-2xl border border-slate-100 bg-slate-50/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                          <FileText size={17} />
                        </div>
                        <span className="text-sm font-black text-slate-800">
                          {reply.trigger === 'outside_hours' ? 'رد خارج أوقات العمل' : 'ترحيب العملاء الجدد'}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={reply.is_active} className="sr-only peer"
                          onChange={e => setLocalReplies(r => r.map((rep, i) => i === idx ? { ...rep, is_active: e.target.checked } : rep))} />
                        <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                    <textarea
                      className="w-full h-28 lg:h-32 px-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none"
                      value={reply.message}
                      onChange={e => setLocalReplies(r => r.map((rep, i) => i === idx ? { ...rep, message: e.target.value } : rep))}
                    />
                  </div>
                ))}
              </div>
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
                          <button
                            onClick={() => {
                              if (window.confirm(`هل تريد حذف المستخدم "${u.name}"؟`))
                                deleteUserMutation.mutate(u.id);
                            }}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
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
    </div>
  );
};

export default SettingsPage;
