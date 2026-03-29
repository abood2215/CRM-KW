import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import AddClientModal from '../../components/AddClientModal';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DashboardStats } from '../../types';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [addClientOpen, setAddClientOpen] = useState(false);

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
      icon: <Users size={20} />,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      accent: 'from-indigo-500 to-indigo-600',
      shadow: 'shadow-indigo-100',
    },
    {
      title: 'عملاء اليوم',
      value: stats?.new_clients_today || 0,
      change: '+5%',
      isUp: true,
      icon: <TrendingUp size={20} />,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      accent: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-100',
    },
    {
      title: 'رسائل غير مقروءة',
      value: stats?.unread_messages || 0,
      change: '-2%',
      isUp: false,
      icon: <MessageSquare size={20} />,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      accent: 'from-amber-500 to-amber-600',
      shadow: 'shadow-amber-100',
    },
    {
      title: 'مهام معلقة',
      value: stats?.pending_tasks || 0,
      change: '15',
      isUp: true,
      icon: <CheckSquare size={20} />,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-100',
      accent: 'from-rose-500 to-rose-600',
      shadow: 'shadow-rose-100',
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
    <>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800">نظرة عامة على النظام</h1>
            <p className="text-slate-500 mt-1 font-medium text-sm lg:text-base">أهلاً بك، إليك ما حدث في مركز مطمئنة اليوم.</p>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <button className="h-10 lg:h-11 px-4 lg:px-6 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 text-sm">
              <Clock size={16} />
              <span className="hidden sm:inline">آخر 7 أيام</span>
              <span className="sm:hidden">7 أيام</span>
            </button>
            <button
              onClick={() => setAddClientOpen(true)}
              className="h-10 lg:h-11 px-4 lg:px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              <span>إضافة عميل</span>
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {statCards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              className={cn(
                "bg-white p-4 lg:p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden relative",
                card.shadow
              )}
            >
              {/* Accent bar */}
              <div className={cn("absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-l rounded-t-2xl opacity-60", card.accent)} />

              <div className="flex items-start justify-between mb-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", card.iconBg, card.iconColor)}>
                  {card.icon}
                </div>
                <div className={cn(
                  "flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-lg",
                  card.isUp ? "text-emerald-700 bg-emerald-50" : "text-rose-600 bg-rose-50"
                )}>
                  {card.isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {card.change}
                </div>
              </div>

              <p className="text-[11px] font-semibold text-slate-400 mb-0.5 truncate">{card.title}</p>
              <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none">{card.value}</h3>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-5 lg:mb-8">
              <div>
                <h4 className="text-base lg:text-lg font-black text-gray-800">نمو العملاء</h4>
                <p className="text-gray-400 text-xs lg:text-sm font-medium mt-0.5">عدد العملاء الجدد أسبوعياً</p>
              </div>
            </div>
            <div className="h-[200px] lg:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      padding: '10px 14px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clients"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorClients)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[2rem] border border-gray-100 shadow-sm">
            <h4 className="text-base lg:text-lg font-black text-gray-800 mb-5 lg:mb-8 text-center">مصادر العملاء</h4>
            <div className="h-[180px] lg:h-[200px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
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
            <div className="mt-3 space-y-2.5">
              {sourceData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs lg:text-sm font-bold text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-400">{Math.round((item.value / 1200) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
          {/* Recent Clients */}
          <div className="bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-5 lg:mb-6">
              <h4 className="text-base lg:text-lg font-black text-slate-800">آخر العملاء</h4>
              <button
                onClick={() => navigate('/clients')}
                className="text-indigo-600 font-bold text-xs lg:text-sm hover:underline flex items-center gap-1"
              >
                مشاهدة الكل <ExternalLink size={13} />
              </button>
            </div>
            <div className="space-y-2 lg:space-y-4">
              {stats?.recent_clients?.length ? stats.recent_clients.map((client, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 lg:p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-800">{client.name}</h5>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">{client.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs lg:text-sm font-bold text-slate-700">{client.status_label}</p>
                    <p className="text-[10px] font-medium text-slate-300 mt-0.5 uppercase leading-none">
                      {format(new Date(client.created_at), 'HH:mm - dd MMM', { locale: ar })}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10">
                  <p className="text-slate-400 font-medium text-sm">لا يوجد عملاء حالياً</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-indigo-600 p-5 lg:p-8 rounded-2xl lg:rounded-[2rem] shadow-xl text-white relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700" />
            <div className="relative z-10">
              <h4 className="text-lg lg:text-xl font-black mb-1.5">إحصائيات فورية</h4>
              <p className="text-indigo-100 opacity-80 mb-6 lg:mb-8 font-medium text-sm">ملخص سريع لحالة الرسائل والحملات.</p>

              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl lg:text-3xl font-black mb-1">0</p>
                    <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">حملات نشطة</p>
                  </div>
                  <div className="h-12 w-px bg-white/20" />
                  <div>
                    <p className="text-2xl lg:text-3xl font-black mb-1">0%</p>
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

      <AddClientModal open={addClientOpen} onClose={() => setAddClientOpen(false)} />
    </>
  );
};

export default Dashboard;
