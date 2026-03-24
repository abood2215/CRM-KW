import React, { ReactNode } from 'react';
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
  Activity,
  Columns
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, unreadCount } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { title: 'لوحة التحكم', icon: <LayoutDashboard size={20} />, path: '/' },
    { title: 'لوحة المتابعة', icon: <Columns size={20} />, path: '/pipeline' },
    { title: 'سجل العملاء', icon: <Users size={20} />, path: '/clients' },
    { title: 'صندوق الرسائل', icon: <MessageSquare size={20} />, path: '/messages', badge: unreadCount },
    { title: 'إدارة المهام', icon: <CheckSquare size={20} />, path: '/tasks' },
    { title: 'الحملات الترويجية', icon: <Megaphone size={20} />, path: '/campaigns' },
    { title: 'إدارة الأرقام', icon: <Smartphone size={20} />, path: '/whatsapp' },
    { title: 'التقارير', icon: <BarChart3 size={20} />, path: '/stats' },
    { title: 'الإعدادات', icon: <Settings size={20} />, path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-cairo">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className={cn(
          "bg-indigo-900 text-white flex flex-col transition-all duration-300 relative z-30 shadow-2xl",
          !sidebarOpen && "items-center"
        )}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-indigo-900/50">
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-20 shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="بحث..." 
                className="w-full h-10 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-indigo-600 transition-colors">
              <Bell size={22} />
              <span className="absolute -top-1 -left-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] text-white">3</span>
            </button>

            <div className="h-8 w-px bg-slate-200" />

            <div className="flex items-center gap-3 pr-2">
              <div className="text-left md:text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</p>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    {user?.role === 'admin' ? 'مدير نظام' : user?.role === 'manager' ? 'مشرف' : 'موظف'}
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 cursor-pointer overflow-hidden hover:ring-4 hover:ring-indigo-50 transition-all">
                {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <UserIcon size={20} />}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
