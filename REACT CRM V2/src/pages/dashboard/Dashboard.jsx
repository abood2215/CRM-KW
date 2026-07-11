import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Loader2, Users, CheckSquare, MessageSquare, Megaphone, UserPlus, ListChecks, CalendarClock, Circle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { stats as statsApi, tasks as tasksApi } from '../../api';
import { cn } from '../../utils/cn';
import { formatResponseTime } from '../../utils/format';
import AddContactModal from '../../components/AddContactModal';
import AddTaskModal from '../../components/AddTaskModal';
import CreateCampaignModal from '../../components/CreateCampaignModal';

const RANGES = [
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
];

const QUICK_ACTIONS = [
  { key: 'contact', label: 'جهة اتصال جديدة', icon: UserPlus, color: 'bg-violet-50 text-violet-600' },
  { key: 'task', label: 'مهمة جديدة', icon: ListChecks, color: 'bg-amber-50 text-amber-600' },
  { key: 'campaign', label: 'حملة جديدة', icon: Megaphone, color: 'bg-rose-50 text-rose-600' },
];

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [range, setRange] = useState('week');
  const [activeModal, setActiveModal] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats', range],
    queryFn: () => statsApi.getDashboardStats(range),
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayTasks = [] } = useQuery({
    queryKey: ['tasks', 'due-today'],
    queryFn: () => tasksApi.getTasks({ due_date: today, status: 'pending' }).then((res) => res.tasks),
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id) => tasksApi.completeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('تم إكمال المهمة');
    },
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-l from-indigo-600 to-indigo-500 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-xl lg:text-2xl font-black">أهلاً {user?.name} 👋</h1>
          <p className="text-indigo-100 mt-1 text-sm">{format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}</p>
        </div>
        <div className="flex gap-1 bg-white/15 rounded-xl p-1 self-start sm:self-auto">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-colors', range === r.id ? 'bg-white text-indigo-600' : 'text-white/80 hover:bg-white/10')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {QUICK_ACTIONS.map(({ key, label, icon: Icon, color }) => (
          <motion.button
            key={key}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveModal(key)}
            className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3 text-right hover:shadow-md transition-shadow"
          >
            <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
              <Icon size={18} />
            </span>
            <span className="font-bold text-sm text-slate-700">{label}</span>
          </motion.button>
        ))}
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <AlertTriangle className="text-rose-400" size={28} />
          <p className="text-slate-500 text-sm font-bold">تعذّر تحميل إحصائيات لوحة التحكم — حاول تحديث الصفحة.</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'عملاء بالمتابعة', value: data.total_clients, color: 'text-indigo-600 bg-indigo-50' },
              { icon: CheckSquare, label: 'مهام معلقة', value: data.pending_tasks, color: 'text-amber-600 bg-amber-50' },
              { icon: MessageSquare, label: 'محادثات مفتوحة', value: data.open_conversations, color: 'text-emerald-600 bg-emerald-50' },
              { icon: Megaphone, label: 'حملات نشطة', value: data.active_campaigns, color: 'text-rose-600 bg-rose-50' },
            ].map(({ icon: Icon, label, value, color }) => (
              <motion.div key={label} whileHover={{ y: -2 }} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
                  <Icon size={18} />
                </div>
                <p className="text-2xl font-black text-slate-800">{value}</p>
                <p className="text-xs text-slate-400 font-bold mt-1">{label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-black text-slate-800 mb-4">نمو العملاء</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.clients_growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                <CalendarClock size={16} className="text-indigo-600" />
                مهامي اليوم
              </h3>
              {todayTasks.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">لا توجد مهام مستحقة اليوم 🎉</p>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto max-h-56">
                  {todayTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => completeTaskMutation.mutate(task.id)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-right"
                    >
                      <Circle size={14} className="text-slate-300 flex-shrink-0" />
                      <span className="text-sm font-bold text-slate-700 truncate flex-1">{task.title}</span>
                    </button>
                  ))}
                </div>
              )}
              <Link to="/tasks" className="mt-3 text-center text-xs font-bold text-indigo-600 hover:underline">عرض كل المهام</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              ['معدل الردود على الحملات', `${data.reply_rate}%`],
              ['معدل الحجوزات', `${data.booking_rate ?? 0}%`],
              ['متوسط سرعة الرد', formatResponseTime(data.avg_response_minutes)],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
                <p className="text-xl font-black text-slate-800">{value}</p>
                <p className="text-xs text-slate-400 font-bold mt-1">{label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <AddContactModal open={activeModal === 'contact'} onClose={() => setActiveModal(null)} />
      <AddTaskModal open={activeModal === 'task'} onClose={() => setActiveModal(null)} />
      <CreateCampaignModal open={activeModal === 'campaign'} onClose={() => setActiveModal(null)} />
    </div>
  );
};

export default Dashboard;
