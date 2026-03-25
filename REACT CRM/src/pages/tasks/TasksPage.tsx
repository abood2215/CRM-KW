import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import AddTaskModal from '../../components/AddTaskModal';
import { Task } from '../../types';
import { 
  CheckSquare, 
  Circle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Filter, 
  Calendar, 
  MoreVertical, 
  User as UserIcon,
  Trash2,
  Edit,
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
    mutationFn: async (id: number) => {
      return api.put(`/tasks/${id}/complete`);
    },
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

  return (
    <>
    <div className="space-y-8 font-cairo animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">إدارة المهام</h1>
          <p className="text-slate-500 mt-1 font-medium">نظم يومك وتابع المهام المطلوبة للتواصل مع عملاء مركز مطمئنة.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setAddOpen(true)} className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
            <Plus size={18} />
            <span>مهمة جديدة</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar: Filters & Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
               <Filter size={18} className="text-slate-400" />
               تصفية المهام
            </h4>
            <div className="space-y-2">
              {[
                { id: 'pending', label: 'مهام معلقة', icon: <Clock size={16} /> },
                { id: 'completed', label: 'تم الانجاز', icon: <CheckCircle2 size={16} /> },
                { id: 'all', label: 'جميع المهام', icon: <Calendar size={16} /> },
              ].map((item) => (
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

          <div className="bg-emerald-600 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-2xl" />
             <div className="relative z-10">
                <h4 className="text-3xl font-black mb-1">92%</h4>
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-4">كفاءة الأداء</p>
                <p className="text-[10px] font-medium opacity-80 leading-relaxed">أداء الفريق في إغلاق المهام خلال الوقت المحدد مرتفع جداً هذا الشهر.</p>
             </div>
          </div>
        </div>

        {/* Main List */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-slate-100">
               <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
               <p className="text-slate-500 font-medium font-cairo">جاري جلب قائمة المهام...</p>
            </div>
          ) : tasks.length > 0 ? tasks.map((task) => (
            <div 
              key={task.id} 
              className={cn(
                "bg-white p-6 rounded-2xl border transition-all hover:shadow-xl group flex items-start gap-6 relative overflow-hidden",
                task.status === 'completed' ? "border-slate-50 opacity-60" : "border-slate-100 shadow-sm"
              )}
            >
               <button 
                onClick={() => toggleTaskMutation.mutate(task.id)}
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 mt-1",
                  task.status === 'completed' 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                    : "bg-slate-50 border border-slate-200 text-slate-300 hover:border-indigo-600 hover:text-indigo-600"
                )}
               >
                 {task.status === 'completed' ? <CheckSquare size={18} /> : <Circle size={18} />}
               </button>

               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className={cn(
                      "text-base font-black truncate",
                      task.status === 'completed' ? "text-slate-400 line-through" : "text-slate-800"
                    )}>
                      {task.title}
                    </h4>
                    <span className={cn(
                      "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tight border",
                      priorityColors[task.priority || 'low']
                    )}>
                      {task.priority === 'high' ? 'عالي' : task.priority === 'medium' ? 'متوسط' : 'عادي'}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm font-medium text-slate-400 mb-4 line-clamp-1">{task.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-6 mt-2">
                    {task.due_date && (
                      <div className={cn(
                        "flex items-center gap-2 text-[11px] font-bold",
                        !task.completed_at && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
                          ? "text-rose-600"
                          : "text-slate-500"
                      )}>
                        <Clock size={12} />
                        <span>موعد الاستحقاق: {format(new Date(task.due_date), 'dd MMM yyyy - HH:mm', { locale: ar })}</span>
                      </div>
                    )}
                    {task.client && (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-600">
                        <Users size={12} />
                        <span>العميل: {task.client.name}</span>
                      </div>
                    )}
                     <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                        <UserIcon size={12} />
                        <span>المكلف: {task.user?.name}</span>
                      </div>
                  </div>
               </div>

               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => {
                    if (window.confirm('هل تريد حذف هذه المهمة؟'))
                      deleteTaskMutation.mutate(task.id);
                  }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
               </div>
            </div>
          )) : (
            <div className="bg-white p-20 rounded-[2rem] border border-slate-100 shadow-sm text-center">
               <CheckSquare size={60} className="text-slate-100 mb-6 mx-auto" strokeWidth={1} />
               <p className="text-lg font-black text-slate-600">القائمة فارغة تماماً</p>
               <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2 text-sm leading-relaxed">
                 {filter === 'pending' 
                   ? 'جميع المهام تم إنجازها! يمكنك الاستراحة قليلاً أو البدء بمهام جديدة.'
                   : 'لا توجد مهام مطابقة لتصفيتك حالياً.'}
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
