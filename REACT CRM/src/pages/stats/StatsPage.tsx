import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Download, 
  Calendar, 
  Filter, 
  ChevronDown,
  ArrowUpRight,
  Loader2,
  PhoneCall,
  Target,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const StatsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('last_7_days');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['full-stats', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/stats/dashboard', { params: { range: dateRange } });
      return data;
    },
  });

  const performanceData = [
    { name: 'الأحد', incoming: 45, outgoing: 120 },
    { name: 'الاثنين', incoming: 52, outgoing: 145 },
    { name: 'الثلاثاء', incoming: 48, outgoing: 130 },
    { name: 'الأربعاء', incoming: 61, outgoing: 180 },
    { name: 'الخميس', incoming: 55, outgoing: 160 },
    { name: 'الجمعة', incoming: 30, outgoing: 80 },
    { name: 'السبت', incoming: 25, outgoing: 60 },
  ];

  const agentData = [
    { name: 'أحمد', deals: 45, value: 45000 },
    { name: 'سارة', deals: 52, value: 52000 },
    { name: 'خالد', deals: 38, value: 38000 },
    { name: 'ليلى', deals: 41, value: 41000 },
  ];

  const sourceData = [
    { name: 'مباشر', value: 400, color: '#6366f1' },
    { name: 'واتساب', value: 300, color: '#10b981' },
    { name: 'إنستقرام', value: 200, color: '#ec4899' },
    { name: 'إحالة', value: 100, color: '#f59e0b' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
         <Loader2 className="animate-spin text-indigo-600 h-12 w-12 mb-4" />
         <p className="text-slate-500 font-medium font-cairo">جاري جلب التقارير التفصيلية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-8 font-cairo">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-indigo-600/20 shadow-xl flex-shrink-0">
              <BarChart3 size={20} />
            </div>
            مركز التقارير
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">تحليل أداء مركز مطمئنة لاتخاذ قرارات أفضل.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <div className="bg-white p-1 rounded-xl border border-slate-100 flex shadow-sm">
            {['week', 'month', 'year'].map(t => (
              <button
                key={t}
                onClick={() => setDateRange(t)}
                className={cn(
                  "px-3 lg:px-5 py-2 rounded-lg text-xs font-black transition-all",
                  dateRange === t ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t === 'week' ? 'أسبوع' : t === 'month' ? 'شهر' : 'سنة'}
              </button>
            ))}
          </div>
          <button className="h-10 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 flex items-center gap-2 text-sm">
            <Download size={16} />
            <span className="hidden sm:inline">تحميل PDF</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {[
          { label: 'إجمالي المبيعات', value: '45,230 ريال', icon: <TrendingUp size={18} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'سرعة الرد', value: '12 دقيقة', icon: <Clock size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'أفضل مصدر', value: 'واتساب', icon: <Target size={18} />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'معدل الحجوزات', value: '24%', icon: <PhoneCall size={18} />, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all hover:-translate-y-1">
            <div className={cn("w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", kpi.bg, kpi.color)}>
              {kpi.icon}
            </div>
            <h4 className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-tight">{kpi.label}</h4>
            <p className="text-lg lg:text-2xl font-black text-slate-800">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
        {/* Line Chart */}
        <div className="bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-5 lg:mb-8">
            <div>
              <h3 className="text-base lg:text-xl font-black text-slate-800">تفاعل الرسائل</h3>
              <p className="text-xs lg:text-sm font-medium text-slate-400 mt-0.5">الواردة مقابل الصادرة يومياً</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-[10px] font-black text-slate-500">صادر</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black text-slate-500">وارد</span>
              </div>
            </div>
          </div>
          <div className="h-[220px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis axisLine={false} tickLine={false} dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} width={30} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '10px 14px' }} />
                <Line type="monotone" dataKey="outgoing" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: 'white' }} />
                <Line type="monotone" dataKey="incoming" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'white' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-base lg:text-xl font-black text-slate-800 mb-5 lg:mb-8">أداء الموظفين</h3>
          <div className="h-[220px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis axisLine={false} tickLine={false} dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 12, fontWeight: 900 }} width={60} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="deals" radius={[0, 8, 8, 0]} barSize={24}>
                  {agentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#ec4899'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
