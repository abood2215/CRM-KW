import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { 
  Users, 
  MessageSquare, 
  CheckSquare, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Clock,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell,
  PieChart, 
  Pie
} from 'recharts';
import { DashboardStats } from '../../types';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/stats/dashboard');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
        <span className="text-slate-500 font-medium">جاري جلب الإحصائيات...</span>
      </div>
    );
  }

  const statCards = [
    { 
      title: 'إجمالي العملاء', 
      value: stats?.total_clients || 0, 
      change: '+12%', 
      isUp: true, 
      icon: <Users className="text-indigo-600" />, 
      color: 'bg-indigo-50' 
    },
    { 
      title: 'عملاء اليوم الجدد', 
      value: stats?.new_clients_today || 0, 
      change: '+5%', 
      isUp: true, 
      icon: <TrendingUp className="text-emerald-600" />, 
      color: 'bg-emerald-50' 
    },
    { 
      title: 'رسائل غير مقروءة', 
      value: stats?.unread_messages || 0, 
      change: '-2%', 
      isUp: false, 
      icon: <MessageSquare className="text-amber-600" />, 
      color: 'bg-amber-50' 
    },
    { 
      title: 'مهام معلقة', 
      value: stats?.pending_tasks || 0, 
      change: '15', 
      isUp: true, 
      icon: <CheckSquare className="text-rose-600" />, 
      color: 'bg-rose-50' 
    },
  ];

  const chartData = [
    { name: 'الأحد', clients: 4 },
    { name: 'الاثنين', clients: 7 },
    { name: 'الثلاثاء', clients: 5 },
    { name: 'الأربعاء', clients: 9 },
    { name: 'الخميس', clients: 12 },
    { name: 'الجمعة', clients: 15 },
    { name: 'السبت', clients: 8 },
  ];

  const sourceData = [
    { name: 'واتساب', value: 400, color: '#10b981' },
    { name: 'جروب', value: 300, color: '#f59e0b' },
    { name: 'إعلانات', value: 300, color: '#6366f1' },
    { name: 'توصية', value: 200, color: '#ec4899' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">نظرة عامة على النظام</h1>
          <p className="text-slate-500 mt-1 font-medium">أهلاً بك مجدداً، إليك ما حدث في مركز مطمئنة اليوم.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-11 px-6 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
            <Clock size={18} />
            <span>آخر 7 أيام</span>
          </button>
          <button className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
            <Plus size={18} />
            <span>إضافة عميل</span>
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", card.color)}>
                {card.icon}
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full",
                card.isUp ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
              )}>
                {card.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{card.change}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 mb-1">{card.title}</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{card.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-lg font-black text-gray-800">نمو العملاء</h4>
              <p className="text-gray-400 text-sm font-medium mt-0.5">عدد العملاء الجدد المضافين للنظام أسبوعياً</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="clients" 
                  stroke="#6366f1" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorClients)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Chart */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <h4 className="text-lg font-black text-gray-800 mb-8 text-center lg:text-right">مصادر العملاء</h4>
          <div className="h-[250px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {sourceData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-bold text-gray-600">{item.name}</span>
                </div>
                <span className="text-xs font-black text-gray-400">{Math.round((item.value / 1200) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-black text-slate-800">آخر العملاء</h4>
            <button className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
              مشاهدة الكل <ExternalLink size={14} />
            </button>
          </div>
          <div className="space-y-4">
            {stats?.recent_clients?.length ? stats.recent_clients.map((client, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-slate-800">{client.name}</h5>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">{client.source}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">{client.status_label}</p>
                  <p className="text-[10px] font-medium text-slate-300 mt-1 uppercase leading-none">
                    {format(new Date(client.created_at), 'HH:mm - dd MMM', { locale: ar })}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-10">
                <p className="text-slate-400 font-medium">لا يوجد عملاء حالياً</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tasks */}
        <div className="bg-indigo-600 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700" />
          <div className="relative z-10">
            <h4 className="text-xl font-black mb-2">إحصائيات فورية</h4>
            <p className="text-indigo-100 opacity-80 mb-8 font-medium">ملخص سريع لحالة الرسائل والحملات المشغلة الآن.</p>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-black mb-1">0</p>
                  <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">حملات نشطة</p>
                </div>
                <div className="h-12 w-px bg-white/20" />
                <div>
                  <p className="text-3xl font-black mb-1">0%</p>
                  <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">معدل الردود</p>
                </div>
              </div>
              
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-sm font-bold">اكتمال المهام الأسبوعية</p>
                   <span className="text-xs font-black">75%</span>
                </div>
                <div className="h-2 w-full bg-indigo-900/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    className="h-full bg-white rounded-full shadow-[0_0_10px_white]" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
