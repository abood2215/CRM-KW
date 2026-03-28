import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Bell, CheckCheck, Trash2, Loader2, AlertCircle, CheckCircle2, Megaphone, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  campaign_completed: { icon: <Megaphone size={18} />,    color: 'text-emerald-600 bg-emerald-50' },
  campaign_failed:    { icon: <AlertCircle size={18} />,  color: 'text-rose-600 bg-rose-50' },
  message_failed:     { icon: <MessageSquare size={18} />,color: 'text-amber-600 bg-amber-50' },
  default:            { icon: <Bell size={18} />,          color: 'text-indigo-600 bg-indigo-50' },
};

const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ notifications: any[]; unread_count: number }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('تم تحديد الكل كمقروء');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  return (
    <div className="space-y-5 lg:space-y-8 font-cairo">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">الإشعارات</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all"
          >
            <CheckCheck size={16} />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 mx-auto border border-slate-100">
              <Bell size={32} className="text-slate-200" />
            </div>
            <p className="text-lg font-black text-slate-700">لا توجد إشعارات</p>
            <p className="text-slate-400 text-sm mt-1">ستظهر هنا إشعارات الحملات والرسائل</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const config = typeConfig[n.type] ?? typeConfig.default;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read_at && markReadMutation.mutate(n.id)}
                  className={cn(
                    'flex items-start gap-4 p-5 lg:p-6 transition-all cursor-pointer hover:bg-slate-50',
                    !n.read_at && 'bg-indigo-50/30'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0', config.color)}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-black text-slate-800 text-sm">{n.title}</p>
                      {!n.read_at && (
                        <span className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1.5 font-medium">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
