import React, { ReactNode, useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  MessageSquare,
  CheckSquare,
  Megaphone,
  Smartphone,
  Settings,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Bell,
  Search,
  User as UserIcon,
  Columns,
  Contact,
  FileText,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import AudioToggle from '../components/AudioToggle';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, unreadCount } = useUIStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { title: 'لوحة التحكم', icon: <LayoutDashboard size={20} />, path: '/' },
    { title: 'لوحة المتابعة', icon: <Columns size={20} />, path: '/pipeline' },
    { title: 'سجل العملاء', icon: <Users size={20} />, path: '/clients' },
    { title: 'صندوق الرسائل', icon: <MessageSquare size={20} />, path: '/messages', badge: unreadCount },
    { title: 'إدارة المهام', icon: <CheckSquare size={20} />, path: '/tasks' },
    { title: 'جهات الاتصال', icon: <Contact size={20} />, path: '/contacts' },
    { title: 'الحملات الترويجية', icon: <Megaphone size={20} />, path: '/campaigns' },
    { title: 'قوالب واتساب', icon: <FileText size={20} />, path: '/templates' },
    { title: 'إدارة الأرقام', icon: <Smartphone size={20} />, path: '/whatsapp' },
    { title: 'التقارير', icon: <BarChart3 size={20} />, path: '/stats' },
    { title: 'الإعدادات', icon: <Settings size={20} />, path: '/settings' },
  ];

  // Bottom nav items (most important 5)
  const bottomNavItems = [
    { title: 'الرئيسية', icon: <LayoutDashboard size={22} />, path: '/' },
    { title: 'العملاء', icon: <Users size={22} />, path: '/clients' },
    { title: 'الرسائل', icon: <MessageSquare size={22} />, path: '/messages', badge: unreadCount },
    { title: 'المهام', icon: <CheckSquare size={22} />, path: '/tasks' },
    { title: 'القائمة', icon: <Menu size={22} />, path: null, action: () => setMobileSidebarOpen(true) },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <div className="h-20 flex items-center justify-between px-5 border-b border-indigo-900/50">
        <h1 className="text-xl font-bold text-white truncate">مركز مطمئنة</h1>
        {isMobile ? (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg bg-indigo-900/50 text-indigo-300 hover:text-white hover:bg-indigo-800"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg bg-indigo-900/50 text-indigo-300 hover:text-white hover:bg-indigo-800"
          >
            {sidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center px-4 py-3 mx-2 rounded-xl transition-all group relative",
              isActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-indigo-300 hover:text-white hover:bg-indigo-900/40"
            )}
          >
            <span className={cn("transition-colors flex-shrink-0", !isMobile && !sidebarOpen && "mx-auto")}>
              {item.icon}
            </span>
            {(isMobile || sidebarOpen) && (
              <span className="mr-3 font-medium whitespace-nowrap">{item.title}</span>
            )}
            {item.badge !== undefined && item.badge > 0 && (
              <span className={cn(
                "absolute flex items-center justify-center bg-rose-500 text-white font-bold rounded-full text-[10px]",
                isMobile || sidebarOpen ? "left-4 top-1/2 -translate-y-1/2 w-5 h-5" : "left-2 top-2 w-4 h-4"
              )}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-indigo-900/50">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center text-indigo-300 hover:text-rose-400 hover:bg-rose-500/10 p-3 rounded-xl transition-all",
            !isMobile && !sidebarOpen && "justify-center"
          )}
        >
          <LogOut size={20} />
          {(isMobile || sidebarOpen) && <span className="mr-3 font-medium">تسجيل الخروج</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-cairo">
      {/* Mobile Overlay Backdrop */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar (Slide-in from right for RTL) */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[280px] bg-indigo-900 text-white flex flex-col z-50 shadow-2xl lg:hidden"
          >
            <SidebarContent isMobile />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className={cn(
          "bg-indigo-900 text-white flex-col transition-all duration-300 relative z-30 shadow-2xl hidden lg:flex",
          !sidebarOpen && "items-center"
        )}
      >
        <div className="h-20 flex items-center justify-between px-5 border-b border-indigo-900/50">
          {sidebarOpen && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold text-white truncate"
            >
              مركز مطمئنة
            </motion.h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg bg-indigo-900/50 text-indigo-300 hover:text-white hover:bg-indigo-800"
          >
            {sidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center px-4 py-3 mx-2 rounded-xl transition-all group relative",
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-indigo-300 hover:text-white hover:bg-indigo-900/40"
              )}
            >
              <span className={cn("transition-colors", !sidebarOpen && "mx-auto")}>
                {item.icon}
              </span>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mr-3 font-medium whitespace-nowrap"
                >
                  {item.title}
                </motion.span>
              )}
              {item.badge !== undefined && item.badge > 0 && (
                <span className={cn(
                  "absolute flex items-center justify-center bg-rose-500 text-white font-bold rounded-full text-[10px]",
                  sidebarOpen ? "left-4 top-1/2 -translate-y-1/2 w-5 h-5" : "left-2 top-2 w-4 h-4"
                )}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-900/50">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center text-indigo-300 hover:text-rose-400 hover:bg-rose-500/10 p-3 rounded-xl transition-all",
              !sidebarOpen && "justify-center"
            )}
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="mr-3 font-medium">تسجيل الخروج</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-20 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            {/* Mobile Hamburger */}
            <button
              className="lg:hidden p-2 -mr-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            {/* Logo text on mobile */}
            <span className="text-base font-black text-indigo-700 lg:hidden">مطمئنة</span>

            {/* Desktop Search */}
            <div className="relative max-w-md w-full hidden lg:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="بحث..."
                className="w-full h-10 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            {/* زر الإشعارات الصوتية */}
            <AudioToggle />

            <NavLink to="/notifications" className="relative text-slate-500 hover:text-indigo-600 transition-colors p-2 rounded-xl hover:bg-indigo-50">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 left-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            <div className="h-7 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2 lg:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</p>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    {user?.role === 'admin' ? 'مدير نظام' : user?.role === 'manager' ? 'مشرف' : 'موظف'}
                  </p>
                </div>
              </div>
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 cursor-pointer overflow-hidden hover:ring-4 hover:ring-indigo-50 transition-all">
                {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <UserIcon size={18} />}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 lg:hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {bottomNavItems.map((item, idx) =>
            item.action ? (
              <button
                key={idx}
                onClick={item.action}
                className="flex flex-col items-center gap-1 px-3 py-1 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {item.icon}
                <span className="text-[10px] font-bold">{item.title}</span>
              </button>
            ) : (
              <NavLink
                key={item.path!}
                to={item.path!}
                end={item.path === '/'}
                className={({ isActive }) => cn(
                  "flex flex-col items-center gap-1 px-3 py-1 transition-colors relative",
                  isActive ? "text-indigo-600" : "text-slate-400 hover:text-indigo-600"
                )}
              >
                {({ isActive }) => (
                  <>
                    <span className={cn(
                      "p-1.5 rounded-xl transition-all",
                      isActive ? "bg-indigo-50" : ""
                    )}>
                      {item.icon}
                    </span>
                    <span className="text-[10px] font-bold">{item.title}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute top-0 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          )}
        </div>
      </nav>
    </div>
  );
};

export default MainLayout;
