import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2, Users, CheckSquare, MessageSquare, Megaphone } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { stats as statsApi } from '../../api';
import { cn } from '../../utils/cn';

const RANGES = [
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
];

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const [range, setRange] = useState('week');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats', range],
    queryFn: () => statsApi.getDashboardStats(range),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">أهلاً {user?.name} 👋</h1>
          <p className="text-slate-500 mt-1 text-sm">نظرة سريعة على أداء المركز.</p>
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

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'عملاء بالمتابعة', value: data.total_clients, color: 'text-indigo-600 bg-indigo-50' },
              { icon: CheckSquare, label: 'مهام معلقة', value: data.pending_tasks, color: 'text-amber-600 bg-amber-50' },
              { icon: MessageSquare, label: 'محادثات مفتوحة', value: data.open_conversations, color: 'text-emerald-600 bg-emerald-50' },
              { icon: Megaphone, label: 'حملات نشطة', value: data.active_campaigns, color: 'text-rose-600 bg-rose-50' },
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

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-black text-slate-800 mb-4">نمو العملاء</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.clients_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              ['معدل الردود على الحملات', `${data.reply_rate}%`],
              ['معدل الحجوزات', `${data.booking_rate ?? 0}%`],
              ['متوسط سرعة الرد', data.avg_response_minutes ? `${data.avg_response_minutes} دقيقة` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
                <p className="text-xl font-black text-slate-800">{value}</p>
                <p className="text-xs text-slate-400 font-bold mt-1">{label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
