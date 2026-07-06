import React, { useEffect } from 'react';
import { Outlet, useNavigate, NavLink, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, LayoutDashboard, Kanban, Users, CheckSquare, ListChecks, Phone, FileText, Megaphone, MessageSquare, Bell, Settings, HardDrive, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { auth, notifications as notificationsApi } from '../api';
import { cn } from '../utils/cn';
import { useEcho } from '../hooks/useEcho';

const NAV_ITEMS = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/messages', label: 'المحادثات', icon: MessageSquare },
  { to: '/pipeline', label: 'تتبع العملاء', icon: Kanban },
  { to: '/contacts', label: 'جهات الاتصال', icon: Users },
  { to: '/tasks', label: 'المهام', icon: CheckSquare },
  { to: '/contact-lists', label: 'قوائم التواصل', icon: ListChecks },
  { to: '/whatsapp', label: 'أرقام واتساب', icon: Phone },
  { to: '/templates', label: 'القوالب', icon: FileText },
  { to: '/campaigns', label: 'الحملات', icon: Megaphone },
  { to: '/stats', label: 'التقارير', icon: BarChart3 },
];

const UTILITY_ITEMS = [
  { to: '/notifications', icon: Bell, title: 'الإشعارات' },
  { to: '/drive', icon: HardDrive, title: 'الملفات' },
  { to: '/settings', icon: Settings, title: 'الإعدادات' },
];

const MainLayout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const echo = useEcho();

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
  });
  const unreadCount = notificationsData?.unread_count ?? 0;

  useEffect(() => {
    if (!echo || !user) return undefined;

    const channel = echo.private(`user.${user.id}`);
    const onNotification = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(payload.title, { icon: '🔔' });
    };

    channel.listen('.notification', onNotification);

    return () => channel.stopListening('.notification', onNotification);
  }, [echo, user, queryClient]);

  const handleLogout = async () => {
    try {
      await auth.logout();
    } catch {
      // ignore — logging out locally regardless of API result
    }
    logout();
    toast.success('تم تسجيل الخروج');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between gap-6">
        <h1 className="font-black text-slate-800 whitespace-nowrap">CRM V2</h1>
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap',
                  isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1 flex-shrink-0">
          {UTILITY_ITEMS.map(({ to, icon: Icon, title }) => (
            <Link
              key={to}
              to={to}
              title={title}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
            >
              <Icon size={16} />
              {to === '/notifications' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-sm font-medium text-slate-600">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            تسجيل خروج
          </button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
