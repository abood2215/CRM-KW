import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, NavLink, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, LayoutDashboard, Kanban, Users, CheckSquare, ListChecks, Phone, FileText, Megaphone, MessageSquare, Bell, Settings, HardDrive, BarChart3, Menu, X } from 'lucide-react';
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
  { to: '/notifications', label: 'الإشعارات', icon: Bell },
  { to: '/drive', label: 'الملفات', icon: HardDrive },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const echo = useEcho();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
  });
  const unreadCount = notificationsData?.unread_count ?? 0;

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

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
      <header className="bg-white border-b border-slate-200 px-4 lg:px-6 h-16 flex items-center justify-between gap-4 lg:gap-6">
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
            aria-label="القائمة"
          >
            <Menu size={20} />
          </button>
          <h1 className="font-black text-slate-800 whitespace-nowrap">مركز مطمئنة</h1>
        </div>

        <nav className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto">
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

        <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
          {UTILITY_ITEMS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              title={label}
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

        <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
          <span className="text-sm font-medium text-slate-600">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            تسجيل خروج
          </button>
        </div>

        <Link
          to="/notifications"
          className="lg:hidden relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex-shrink-0"
          aria-label="الإشعارات"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </header>

      <AnimatePresence>
        {drawerOpen && (
          <React.Fragment>
            <motion.div
              className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-white z-50 lg:hidden shadow-2xl flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0">
                <span className="font-black text-slate-800">مركز مطمئنة</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
                  aria-label="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors',
                        isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                      )
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
                <div className="h-px bg-slate-100 my-2" />
                {UTILITY_ITEMS.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors relative',
                        isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                      )
                    }
                  >
                    <Icon size={18} />
                    {label}
                    {to === '/notifications' && unreadCount > 0 && (
                      <span className="mr-auto min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-100 flex-shrink-0">
                <p className="text-sm font-bold text-slate-700 mb-3 truncate">{user?.name}</p>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <LogOut size={16} />
                  تسجيل خروج
                </button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

      <main className="p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
