import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Bell, CheckCheck, Megaphone, PauseCircle } from 'lucide-react';
import { notifications as notificationsApi } from '../api';
import { cn } from '../utils/cn';

const TYPE_ICONS = {
  campaign_completed: { icon: Megaphone, cls: 'bg-emerald-50 text-emerald-600' },
  campaign_paused: { icon: PauseCircle, cls: 'bg-amber-50 text-amber-600' },
};

const NotificationsDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
  });
  const unreadCount = data?.unread_count ?? 0;
  const recent = (data?.notifications ?? []).slice(0, 5);

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex-shrink-0"
        aria-label="الإشعارات"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-12 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="font-black text-sm text-slate-800">الإشعارات</span>
              {unreadCount > 0 && (
                <button onClick={() => markAllReadMutation.mutate()} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline">
                  <CheckCheck size={12} />
                  تحديد الكل كمقروء
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={26} className="text-slate-100 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs">لا توجد إشعارات</p>
                </div>
              ) : (
                recent.map((n) => {
                  const typeInfo = TYPE_ICONS[n.type];
                  const TypeIcon = typeInfo?.icon ?? Bell;

                  return (
                    <button
                      key={n.id}
                      onClick={() => !n.read_at && markReadMutation.mutate(n.id)}
                      className={cn('w-full flex items-start gap-3 p-3 border-b border-slate-50 last:border-0 text-right hover:bg-slate-50 transition-colors', !n.read_at && 'bg-indigo-50/30')}
                    >
                      <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', typeInfo?.cls ?? 'bg-slate-100 text-slate-400')}>
                        <TypeIcon size={13} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-xs text-slate-800 truncate">{n.title}</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5 line-clamp-1">{n.message}</span>
                        <span className="block text-[10px] text-slate-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { locale: ar, addSuffix: true })}</span>
                      </span>
                      {!n.read_at && <span className="w-1.5 h-1.5 rounded-full mt-1.5 bg-indigo-600 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border-t border-slate-100 transition-colors"
            >
              عرض الكل
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsDropdown;
