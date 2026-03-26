import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import AddTaskModal from '../../components/AddTaskModal';
import { Task } from '../../types';
import {
  CheckSquare,
  Circle,
  Clock,
  Plus,
  Filter,
  Calendar,
  User as UserIcon,
  Trash2,
  Loader2,
  CheckCircle2,
  Users
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { format, isPast, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';

const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [addOpen, setAddOpen] = useState(false);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      const { data } = await api.get('/tasks', { params: { status: filter } });
      return data.tasks;
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('تم حذف المهمة');
    },
    onError: () => toast.error('فشل حذف المهمة'),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (id: number) => api.put(`/tasks/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('تم تحديث حالة المهمة');
    },
  });

  const priorityColors = {
    high: 'text-rose-600 bg-rose-50 border-rose-100',
    medium: 'text-amber-600 bg-amber-50 border-amber-100',
    low: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  };

  const filterItems = [
    { id: 'pending', label: 'المعلقة', icon: <Clock size={15} /> },
    { id: 'completed', label: 'المنجزة', icon: <CheckCircle2 size={15} /> },
    { id: 'all', label: 'الكل', icon: <Calendar size={15} /> },
  ];

  return (
    <>
      <div className="space-y-5 lg:space-y-8 font-cairo">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800">إدارة المهام</h1>
            <p className="text-slate-500 mt-1 font-medium text-sm">نظم يومك وتابع المهام المطلوبة.</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="h-10 lg:h-11 px-4 lg:px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>مهمة جديدة</span>
          </button>
        </div>

        {/* Mobile Filter Tabs */}
        <div className="flex gap-2 lg:hidden">
          {filterItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all border",
                filter === item.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
                  : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8 items-start">
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block space-y-5">
            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-800 mb-5 flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                تصفية المهام
              </h4>
              <div className="space-y-2">
                {filterItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id as any)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all",
                      filter === item.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {filter === item.id && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-emerald-600 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-2xl" />
              <div className="relative z-10">
                <h4 className="text-3xl font-black mb-1">92%</h4>
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-3">كفاءة الأداء</p>
                <p className="text-[10px] font-medium opacity-80 leading-relaxed">أداء الفريق في إغلاق المهام خلال الوقت المحدد.</p>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="lg:col-span-3 space-y-3 lg:space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
                <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
                <p className="text-slate-500 font-medium">جاري جلب المهام...</p>
              </div>
            ) : tasks.length > 0 ? tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "bg-white p-4 lg:p-6 rounded-2xl border transition-all hover:shadow-lg group flex items-start gap-4 lg:gap-6 relative overflow-hidden",
                  task.status === 'completed' ? "border-slate-50 opacity-60" : "border-slate-100 shadow-sm"
                )}
              >
                <button
                  onClick={() => toggleTaskMutation.mutate(task.id)}
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 mt-0.5",
                    task.status === 'completed'
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                      : "bg-slate-50 border border-slate-200 text-slate-300 hover:border-indigo-600 hover:text-indigo-600"
                  )}
                >
                  {task.status === 'completed' ? <CheckSquare size={16} /> : <Circle size={16} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className={cn(
                      "text-sm lg:text-base font-black",
                      task.status === 'completed' ? "text-slate-400 line-through" : "text-slate-800"
                    )}>
                      {task.title}
                    </h4>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tight border flex-shrink-0",
                      priorityColors[task.priority || 'low']
                    )}>
                      {task.priority === 'high' ? 'عالي' : task.priority === 'medium' ? 'متوسط' : 'عادي'}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs lg:text-sm font-medium text-slate-400 mb-2 line-clamp-1">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 lg:gap-6 mt-1.5">
                    {task.due_date && (
                      <div className={cn(
                        "flex items-center gap-1.5 text-[11px] font-bold",
                        !task.completed_at && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
                          ? "text-rose-600"
                          : "text-slate-500"
                      )}>
                        <Clock size={11} />
                        <span>{format(new Date(task.due_date), 'dd MMM yyyy', { locale: ar })}</span>
                      </div>
                    )}
                    {task.client && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
                        <Users size={11} />
                        <span>{task.client.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                      <UserIcon size={11} />
                      <span>{task.user?.name}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm('هل تريد حذف هذه المهمة؟'))
                      deleteTaskMutation.mutate(task.id);
                  }}
                  className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )) : (
              <div className="bg-white p-12 lg:p-20 rounded-2xl border border-slate-100 shadow-sm text-center">
                <CheckSquare size={48} className="text-slate-100 mb-5 mx-auto" strokeWidth={1} />
                <p className="text-base lg:text-lg font-black text-slate-600">القائمة فارغة</p>
                <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2 text-sm leading-relaxed">
                  {filter === 'pending'
                    ? 'جميع المهام تم إنجازها! يمكنك البدء بمهام جديدة.'
                    : 'لا توجد مهام مطابقة لتصفيتك.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
};

export default TasksPage;
