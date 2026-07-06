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

const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [{ to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'العملاء',
    items: [
      { to: '/pipeline', label: 'تتبع العملاء', icon: Kanban },
      { to: '/contacts', label: 'جهات الاتصال', icon: Users },
      { to: '/tasks', label: 'المهام', icon: CheckSquare },
      { to: '/contact-lists', label: 'قوائم التواصل', icon: ListChecks },
    ],
  },
  {
    label: 'التواصل',
    items: [
      { to: '/messages', label: 'المحادثات', icon: MessageSquare },
      { to: '/whatsapp', label: 'أرقام واتساب', icon: Phone },
      { to: '/templates', label: 'القوالب', icon: FileText },
      { to: '/campaigns', label: 'الحملات', icon: Megaphone },
    ],
  },
  {
    label: 'أخرى',
    items: [
      { to: '/stats', label: 'التقارير', icon: BarChart3 },
      { to: '/notifications', label: 'الإشعارات', icon: Bell, badge: 'notifications' },
      { to: '/drive', label: 'الملفات', icon: HardDrive },
      { to: '/settings', label: 'الإعدادات', icon: Settings },
    ],
  },
];

const ROLE_LABELS = { admin: 'مدير النظام', manager: 'مشرف', agent: 'موظف' };

const NavItem = ({ to, label, icon: Icon, end, unreadCount, dark, onClick }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors relative',
        dark
          ? isActive
            ? 'bg-indigo-600/15 text-indigo-400 border-r-2 border-indigo-500'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-r-2 border-transparent'
          : isActive
            ? 'bg-indigo-50 text-indigo-600'
            : 'text-slate-600 hover:bg-slate-50'
      )
    }
  >
    <Icon size={17} />
    {label}
    {unreadCount > 0 && (
      <span className="mr-auto min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </NavLink>
);

const NavGroups = ({ dark, unreadCount, onItemClick }) => (
  <>
    {NAV_GROUPS.map((group) => (
      <div key={group.label}>
        <p className={cn('px-3 mb-1.5 text-[11px] font-black uppercase tracking-wider', dark ? 'text-slate-500' : 'text-slate-400')}>
          {group.label}
        </p>
        <div className="space-y-1">
          {group.items.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              dark={dark}
              unreadCount={item.badge === 'notifications' ? unreadCount : 0}
              onClick={onItemClick}
            />
          ))}
        </div>
      </div>
    ))}
  </>
);

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

  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() ?? '؟';
  const roleLabel = ROLE_LABELS[user?.role] ?? user?.role;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 h-screen sticky top-0 bg-slate-900">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black flex-shrink-0">م</div>
          <span className="font-black text-white truncate">مركز مطمئنة</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          <NavGroups dark unreadCount={unreadCount} />
        </nav>

        <div className="p-4 border-t border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut size={15} />
            تسجيل خروج
          </button>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
              aria-label="القائمة"
            >
              <Menu size={20} />
            </button>
            <span className="font-black text-slate-800">مركز مطمئنة</span>
          </div>

          <div className="hidden lg:block" />

          <Link
            to="/notifications"
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex-shrink-0"
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

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
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
              className="fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-slate-900 z-50 lg:hidden shadow-2xl flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black flex-shrink-0">م</div>
                  <span className="font-black text-white">مركز مطمئنة</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/5 transition-colors"
                  aria-label="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3 space-y-6">
                <NavGroups dark unreadCount={unreadCount} onItemClick={() => setDrawerOpen(false)} />
              </nav>

              <div className="p-4 border-t border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black flex-shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{roleLabel}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                >
                  <LogOut size={16} />
                  تسجيل خروج
                </button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
