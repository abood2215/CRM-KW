import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, Trash2, Loader2, Megaphone, PauseCircle } from 'lucide-react';
import { notifications as notificationsApi } from '../../api';
import { cn } from '../../utils/cn';
import { resolveNotificationLink } from '../../utils/notifications';

const TYPE_ICONS = {
  campaign_completed: { icon: Megaphone, cls: 'bg-emerald-50 text-emerald-600' },
  campaign_paused: { icon: PauseCircle, cls: 'bg-amber-50 text-amber-600' },
};

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markReadMutation = useMutation({ mutationFn: notificationsApi.markNotificationRead, onSuccess: invalidate });
  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllNotificationsRead,
    onSuccess: () => { invalidate(); toast.success('تم تحديد الكل كمقروء'); },
  });
  const deleteMutation = useMutation({ mutationFn: notificationsApi.deleteNotification, onSuccess: invalidate });

  const notifications = data?.notifications ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">الإشعارات</h1>
          <p className="text-slate-500 mt-1 text-sm">{data?.unread_count ?? 0} إشعار غير مقروء</p>
        </div>
        {data?.unread_count > 0 && (
          <button onClick={() => markAllReadMutation.mutate()} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
            <CheckCheck size={14} />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={32} className="text-slate-100 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">لا توجد إشعارات</p>
          </div>
        ) : (
          notifications.map((n) => {
            const typeInfo = TYPE_ICONS[n.type];
            const TypeIcon = typeInfo?.icon ?? Bell;

            return (
              <div key={n.id} className={cn('flex items-start gap-3 p-4 border-b border-slate-50 last:border-0', !n.read_at && 'bg-indigo-50/30')}>
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', typeInfo?.cls ?? 'bg-slate-100 text-slate-400')}>
                  <TypeIcon size={15} />
                </div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    if (!n.read_at) markReadMutation.mutate(n.id);
                    const link = resolveNotificationLink(n);
                    if (link) navigate(link);
                  }}
                >
                  <p className="font-bold text-sm text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { locale: ar, addSuffix: true })}</p>
                </div>
                {!n.read_at && <div className="w-2 h-2 rounded-full mt-2 bg-indigo-600 flex-shrink-0" />}
                <button onClick={() => deleteMutation.mutate(n.id)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
