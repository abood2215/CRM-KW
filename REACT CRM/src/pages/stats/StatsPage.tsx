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
    <div className="space-y-10 font-cairo animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-indigo-600/20 shadow-xl">
               <BarChart3 size={24} />
             </div>
             مركز التقارير والذكاء
          </h1>
          <p className="text-slate-500 mt-2 font-medium">متابعة أداء مركز مطمئنة وتحليل البيانات لاتخاذ قرارات أفضل.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <div className="bg-white p-1 rounded-2xl border border-slate-100 flex shadow-sm">
             {['week', 'month', 'year'].map(t => (
               <button 
                key={t}
                onClick={() => setDateRange(t)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black transition-all",
                  dateRange === t ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-slate-600"
                )}
               >
                {t === 'week' ? 'أسبوعي' : t === 'month' ? 'شهري' : 'سنوي'}
               </button>
             ))}
           </div>
           <button className="h-12 px-6 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm hover:bg-slate-50 flex items-center gap-2">
              <Download size={18} />
              <span>تحميل تقرير PDF</span>
           </button>
        </div>
      </div>

      {/* Main KPIs Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
         {[
           { label: 'إجمالي المبيعات', value: '45,230 ريال', icon: <TrendingUp size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
           { label: 'متوسط سرعة الرد', value: '12 دقيقة', icon: <Clock size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
           { label: 'أفضل مصدر', value: 'واتساب', icon: <Target size={20} />, color: 'text-amber-600', bg: 'bg-amber-50' },
           { label: 'معدل الحجوزات', value: '24%', icon: <PhoneCall size={20} />, color: 'text-rose-600', bg: 'bg-rose-50' },
         ].map((kpi, idx) => (
           <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", kpi.bg, kpi.color)}>
                 {kpi.icon}
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{kpi.label}</h4>
              <p className="text-2xl font-black text-slate-800">{kpi.value}</p>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Interactivity Chart */}
         <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
               <div>
                 <h3 className="text-xl font-black text-slate-800">تفاعل الرسائل</h3>
                 <p className="text-sm font-medium text-slate-400 mt-1">الرسائل الواردة مقابل الصادرة يومياً</p>
               </div>
               <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-indigo-600" />
                   <span className="text-[10px] font-black text-slate-500 uppercase">صادر</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-black text-slate-500 uppercase">وارد</span>
                 </div>
               </div>
            </div>
            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis axisLine={false} tickLine={false} dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                     <Tooltip 
                        contentStyle={{ 
                          borderRadius: '20px', 
                          border: 'none', 
                          boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.1)',
                          padding: '16px'
                        }} 
                     />
                     <Line type="monotone" dataKey="outgoing" stroke="#6366f1" strokeWidth={5} dot={{ r: 6, fill: '#6366f1', strokeWidth: 3, stroke: 'white' }} activeDot={{ r: 8 }} />
                     <Line type="monotone" dataKey="incoming" stroke="#10b981" strokeWidth={5} dot={{ r: 6, fill: '#10b981', strokeWidth: 3, stroke: 'white' }} activeDot={{ r: 8 }} />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Sales by Agent */}
         <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-10">أداء الموظفين</h3>
            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agentData} layout="vertical" margin={{ left: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                     <XAxis type="number" hide />
                     <YAxis axisLine={false} tickLine={false} dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 14, fontWeight: 900 }} width={80} />
                     <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                     />
                     <Bar dataKey="deals" radius={[0, 10, 10, 0]} barSize={32}>
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
