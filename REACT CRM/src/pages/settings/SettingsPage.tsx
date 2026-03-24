import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  Clock, MessageSquare, Users, Save, Plus, Edit, Trash2, Loader2, FileText
} from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { User, BusinessHour, AutoReply } from '../../types';
import AddUserModal from '../../components/AddUserModal';

const SettingsPage: React.FC = () => {
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
    <div className="space-y-8 font-cairo animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">إعدادات النظام</h1>
          <p className="text-slate-500 mt-1 font-medium">تخصيص كامل للنظام ليناسب احتياجات مركز مطمئنة.</p>
        </div>
        {activeTab !== 'users' && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-11 px-6 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>حفظ التغييرات</span>
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Tabs Sidebar */}
        <div className="lg:w-72 space-y-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={cn("w-full px-6 py-4 rounded-2xl flex items-center gap-4 transition-all",
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
                  : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 hover:text-indigo-600")}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400")}>
                {tab.icon}
              </div>
              <span className="text-sm font-black">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">

          {/* Business Hours */}
          {activeTab === 'hours' && (
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800">توقيتات العمل الرسمية</h3>
                <div className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black">
                  بتوقيت عمان (Amman/Asia)
                </div>
              </div>
              <div className="space-y-4">
                {loadingHours ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                  </div>
                ) : localHours.map((day, idx) => (
                  <div key={day.id} className="p-5 rounded-2xl border border-slate-50 bg-slate-50/30 flex items-center justify-between group hover:bg-white hover:border-slate-100 transition-all">
                    <div className="flex items-center gap-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={day.is_active} className="sr-only peer"
                          onChange={e => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, is_active: e.target.checked } : d))} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                      <span className="text-sm font-black text-slate-700 w-20">{daysLabel[day.day_of_week]}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="time" value={day.start_time}
                        onChange={e => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, start_time: e.target.value } : d))}
                        className="px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 bg-white focus:outline-none focus:border-indigo-500" />
                      <span className="text-slate-300">إلى</span>
                      <input type="time" value={day.end_time}
                        onChange={e => setLocalHours(h => h.map((d, i) => i === idx ? { ...d, end_time: e.target.value } : d))}
                        className="px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 bg-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto Replies */}
          {activeTab === 'replies' && (
            <div className="p-10 space-y-8">
              <h3 className="text-xl font-black text-slate-800">إدارة الردود التلقائية</h3>
              <div className="grid grid-cols-1 gap-6">
                {loadingReplies ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                  </div>
                ) : localReplies.map((reply, idx) => (
                  <div key={reply.id} className="p-8 rounded-[2rem] border border-slate-100 bg-slate-50/30 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                          <FileText size={20} />
                        </div>
                        <span className="text-sm font-black text-slate-800">
                          {reply.trigger === 'outside_hours' ? 'رد خارج أوقات العمل' : 'ترحيب العملاء الجدد'}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={reply.is_active} className="sr-only peer"
                          onChange={e => setLocalReplies(r => r.map((rep, i) => i === idx ? { ...rep, is_active: e.target.checked } : rep))} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                    <textarea
                      className="w-full h-32 p-6 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none"
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
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800">قائمة مستخدمي النظام</h3>
                <button onClick={() => setAddUserOpen(true)}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                  <Plus size={16} /> إضافة مستخدم
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-xs font-black text-slate-400 border-b border-slate-100">المستخدم</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 border-b border-slate-100">الصلاحية</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 border-b border-slate-100">الحالة</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 border-b border-slate-100 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loadingUsers ? (
                      <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="animate-spin inline-block text-indigo-600" /></td></tr>
                    ) : userList.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">{u.name.charAt(0)}</div>
                            <div>
                              <p className="text-sm font-black text-slate-800">{u.name}</p>
                              <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase",
                            u.role === 'admin' ? "bg-rose-50 text-rose-600" : u.role === 'manager' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600")}>
                            {u.role === 'admin' ? 'مدير نظام' : u.role === 'manager' ? 'مشرف' : 'موظف'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("flex items-center gap-1.5 text-[11px] font-bold", u.is_active ? "text-emerald-600" : "text-slate-400")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", u.is_active ? "bg-emerald-500" : "bg-slate-300")} />
                            {u.is_active ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`هل تريد حذف المستخدم "${u.name}"؟`))
                                deleteUserMutation.mutate(u.id);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all">
                            <Trash2 size={18} />
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
