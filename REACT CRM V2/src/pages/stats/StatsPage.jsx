import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Cell, PieChart, Pie,
} from 'recharts';
import { Loader2, Users, Target, PhoneCall, Clock } from 'lucide-react';
import { stats as statsApi } from '../../api';
import { cn } from '../../utils/cn';

const RANGES = [
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
];

const SOURCE_COLORS = {
  whatsapp: '#10b981',
  instagram: '#ec4899',
  referral: '#f59e0b',
  google: '#3b82f6',
};
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

const StatsPage = () => {
  const [range, setRange] = useState('week');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', range],
    queryFn: () => statsApi.getDashboardStats(range),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['stats-agents'],
    queryFn: statsApi.getAgentStats,
  });

  const agentData = agents.map((a) => ({ name: a.name, deals: a.clients_count }));

  const sourceData = Object.entries(stats?.clients_by_source ?? {}).map(([name, value], i) => ({
    name,
    value,
    color: SOURCE_COLORS[name] ?? PALETTE[i % PALETTE.length],
  }));

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">التقارير</h1>
          <p className="text-slate-500 mt-1 text-sm">تحليل أداء مركز مطمئنة لاتخاذ قرارات أفضل.</p>
        </div>
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-bold', range === r.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'إجمالي العملاء', value: stats?.total_clients ?? '—', color: 'text-indigo-600 bg-indigo-50' },
          { icon: Clock, label: 'سرعة الرد', value: stats?.avg_response_minutes != null ? `${stats.avg_response_minutes} دقيقة` : '—', color: 'text-emerald-600 bg-emerald-50' },
          { icon: Target, label: 'أفضل مصدر', value: stats?.top_source ?? '—', color: 'text-amber-600 bg-amber-50' },
          { icon: PhoneCall, label: 'معدل الحجوزات', value: `${stats?.booking_rate ?? 0}%`, color: 'text-rose-600 bg-rose-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-black text-slate-800">{value}</p>
            <p className="text-xs text-slate-400 font-bold mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-black text-slate-800 mb-4">تفاعل الرسائل</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats?.messages_by_day ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="outgoing" name="صادر" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="incoming" name="وارد" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-black text-slate-800 mb-4">أداء الموظفين</h3>
          {agentData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-slate-400 text-sm">لا توجد بيانات</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={agentData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis axisLine={false} tickLine={false} dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} width={70} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="deals" radius={[0, 8, 8, 0]} barSize={22}>
                  {agentData.map((_, index) => (
                    <Cell key={index} fill={index % 2 === 0 ? '#6366f1' : '#ec4899'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {sourceData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-black text-slate-800 mb-4">مصادر العملاء</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" outerRadius={90} dataKey="value">
                  {sourceData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {sourceData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPage;
