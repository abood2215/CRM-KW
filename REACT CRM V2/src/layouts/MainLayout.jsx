import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useQuery, useQueryClient, QueryErrorResetBoundary } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, LayoutDashboard, Kanban, Users, CheckSquare, ListChecks, Phone, FileText, Megaphone, MessageSquare, Bell, Settings, HardDrive, BarChart3, Menu, X, Search, History, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { auth, notifications as notificationsApi, whatsappNumbers as whatsappNumbersApi } from '../api';
import { cn } from '../utils/cn';
import { useEcho } from '../hooks/useEcho';
import { playNewMessageChime, showDesktopNotification } from '../utils/newMessageAlert';
import CommandPalette from '../components/CommandPalette';
import NotificationsDropdown from '../components/NotificationsDropdown';
import ErrorBoundary from '../components/ErrorBoundary';

// Each nav item gets its own accent color (chip + active-state ring), instead of
// one uniform color, so the sidebar reads as a set of distinct destinations.
// Tailwind's scanner needs literal class strings (not `bg-${color}-50`), hence
// this lookup table of pre-written literals rather than building them at runtime.
const COLOR_STYLES = {
  indigo: { chip: 'bg-indigo-50 text-indigo-600', chipActive: 'bg-indigo-600 text-white', active: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' },
  blue: { chip: 'bg-blue-50 text-blue-600', chipActive: 'bg-blue-600 text-white', active: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' },
  violet: { chip: 'bg-violet-50 text-violet-600', chipActive: 'bg-violet-600 text-white', active: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100' },
  amber: { chip: 'bg-amber-50 text-amber-600', chipActive: 'bg-amber-600 text-white', active: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' },
  cyan: { chip: 'bg-cyan-50 text-cyan-600', chipActive: 'bg-cyan-600 text-white', active: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600', chipActive: 'bg-emerald-600 text-white', active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' },
  green: { chip: 'bg-green-50 text-green-600', chipActive: 'bg-green-600 text-white', active: 'bg-green-50 text-green-700 ring-1 ring-green-100' },
  purple: { chip: 'bg-purple-50 text-purple-600', chipActive: 'bg-purple-600 text-white', active: 'bg-purple-50 text-purple-700 ring-1 ring-purple-100' },
  rose: { chip: 'bg-rose-50 text-rose-600', chipActive: 'bg-rose-600 text-white', active: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100' },
  orange: { chip: 'bg-orange-50 text-orange-600', chipActive: 'bg-orange-600 text-white', active: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100' },
  red: { chip: 'bg-red-50 text-red-600', chipActive: 'bg-red-600 text-white', active: 'bg-red-50 text-red-700 ring-1 ring-red-100' },
  teal: { chip: 'bg-teal-50 text-teal-600', chipActive: 'bg-teal-600 text-white', active: 'bg-teal-50 text-teal-700 ring-1 ring-teal-100' },
  gray: { chip: 'bg-slate-100 text-slate-500', chipActive: 'bg-slate-600 text-white', active: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' },
};

const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [{ to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true, color: 'indigo' }],
  },
  {
    label: 'العملاء',
    items: [
      { to: '/pipeline', label: 'تتبع العملاء', icon: Kanban, color: 'blue' },
      { to: '/contacts', label: 'جهات الاتصال', icon: Users, color: 'violet' },
      { to: '/tasks', label: 'المهام', icon: CheckSquare, color: 'amber' },
      { to: '/contact-lists', label: 'قوائم التواصل', icon: ListChecks, color: 'cyan' },
    ],
  },
  {
    label: 'التواصل',
    items: [
      { to: '/messages', label: 'المحادثات', icon: MessageSquare, color: 'emerald' },
      { to: '/whatsapp', label: 'أرقام واتساب', icon: Phone, color: 'green' },
      { to: '/templates', label: 'القوالب', icon: FileText, color: 'purple' },
      { to: '/campaigns', label: 'الحملات', icon: Megaphone, color: 'rose' },
    ],
  },
  {
    label: 'أخرى',
    items: [
      { to: '/stats', label: 'التقارير', icon: BarChart3, color: 'orange' },
      { to: '/notifications', label: 'الإشعارات', icon: Bell, color: 'red', badge: 'notifications' },
      { to: '/drive', label: 'الملفات', icon: HardDrive, color: 'teal' },
      { to: '/activity-log', label: 'سجل النشاط', icon: History, color: 'blue', permission: 'activity_log.view' },
      { to: '/settings', label: 'الإعدادات', icon: Settings, color: 'gray' },
    ],
  },
];

const NavItem = ({ to, label, icon: Icon, end, unreadCount, color, onClick }) => {
  const styles = COLOR_STYLES[color] ?? COLOR_STYLES.gray;

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn('flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold transition-all', isActive ? styles.active : 'text-slate-600 hover:bg-slate-50')
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors', isActive ? styles.chipActive : styles.chip)}>
            <Icon size={16} />
          </span>
          {label}
          {unreadCount > 0 && (
            <span className="mr-auto min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

const NavGroups = ({ unreadCount, onItemClick, permissions }) => (
  <>
    {NAV_GROUPS.map((group) => {
      const items = group.items.filter((item) => !item.permission || permissions.includes(item.permission));
      if (items.length === 0) return null;

      return (
        <div key={group.label}>
          <p className="px-3 mb-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">{group.label}</p>
          <div className="space-y-1">
            {items.map((item) => (
              <NavItem key={item.to} {...item} unreadCount={item.badge === 'notifications' ? unreadCount : 0} onClick={onItemClick} />
            ))}
          </div>
        </div>
      );
    })}
  </>
);

const UserCard = ({ user, initial, roleLabel }) => (
  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
    <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black flex-shrink-0">{initial}</div>
    <div className="min-w-0">
      <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
      <p className="text-xs text-slate-400 truncate">{roleLabel}</p>
    </div>
  </div>
);

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const echo = useEcho();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
  });
  const unreadCount = notificationsData?.unread_count ?? 0;

  const [qualityBannerDismissed, setQualityBannerDismissed] = useState(false);
  const { data: whatsappNumbersData } = useQuery({
    queryKey: ['whatsapp-numbers'],
    queryFn: whatsappNumbersApi.getWhatsappNumbers,
    refetchInterval: 5 * 60 * 1000,
  });
  const redNumbers = (whatsappNumbersData ?? []).filter((n) => n.quality_rating === 'RED');

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Alerts on an incoming customer message (never our own outbound echo) when the agent
  // isn't actively looking — tab hidden, or simply not on the messages screen. Someone
  // staring at the conversation list already sees the badge; this is for everywhere else.
  useEffect(() => {
    if (!echo) return undefined;

    const channel = echo.channel('conversations');
    const onNewMessage = (payload) => {
      if (payload.direction !== 'in') return;
      if (document.visibilityState === 'visible' && location.pathname.startsWith('/messages')) return;

      playNewMessageChime();
      showDesktopNotification(payload.sender_name || 'رسالة جديدة', payload.content || '');
    };

    channel.listen('.NewMessageEvent', onNewMessage);

    return () => channel.stopListening('.NewMessageEvent', onNewMessage);
  }, [echo, location.pathname]);

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
  const roleLabel = user?.role?.name;
  const permissions = user?.permissions ?? [];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 h-screen sticky top-0 bg-white border-l border-slate-100">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black flex-shrink-0">م</div>
          <span className="font-black text-slate-800 truncate">مركز مطمئنة</span>
        </div>

        <div className="px-4 pt-4 flex-shrink-0">
          <UserCard user={user} initial={initial} roleLabel={roleLabel} />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <NavGroups unreadCount={unreadCount} permissions={permissions} />
        </nav>

        <div className="p-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
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

          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden lg:flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 text-slate-400 text-sm hover:border-indigo-200 hover:text-indigo-600 transition-colors"
          >
            <Search size={15} />
            <span>بحث سريع</span>
            <kbd className="text-[10px] font-bold border border-slate-200 rounded-md px-1.5 py-0.5 mr-1">Ctrl K</kbd>
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setPaletteOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              aria-label="بحث"
            >
              <Search size={18} />
            </button>
            <NotificationsDropdown />
          </div>
        </header>

        {redNumbers.length > 0 && !qualityBannerDismissed && (
          <div className="bg-rose-50 border-b border-rose-100 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-700 text-sm font-bold min-w-0">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span className="truncate">
                جودة {redNumbers.length === 1 ? `رقم "${redNumbers[0].name}"` : `${redNumbers.length} أرقام واتساب`} ضعيفة (RED) — ميتا قد تُقيّد الإرسال.{' '}
                <NavLink to="/whatsapp" className="underline hover:no-underline">فتح صفحة الأرقام</NavLink>
              </span>
            </div>
            <button
              onClick={() => setQualityBannerDismissed(true)}
              className="p-1 rounded-lg text-rose-400 hover:bg-rose-100 flex-shrink-0"
              aria-label="إخفاء التنبيه"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6">
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary key={location.pathname} onReset={reset}>
                <Outlet />
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

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
              className="fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-white z-50 lg:hidden shadow-2xl flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black flex-shrink-0">م</div>
                  <span className="font-black text-slate-800">مركز مطمئنة</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
                  aria-label="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-4 pt-4 flex-shrink-0">
                <UserCard user={user} initial={initial} roleLabel={roleLabel} />
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                <NavGroups unreadCount={unreadCount} permissions={permissions} onItemClick={() => setDrawerOpen(false)} />
              </nav>

              <div className="p-4 border-t border-slate-100 flex-shrink-0">
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
    </div>
  );
};

export default MainLayout;
