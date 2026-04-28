import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  ArrowRight,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '../../utils/cn';
import { Campaign } from '../../types';

// ألوان الرسوم البيانية
const COLORS = {
  sent:    '#6366f1', // indigo
  failed:  '#f43f5e', // rose
  replied: '#10b981', // emerald
  pending: '#f59e0b', // amber
};

interface Analytics {
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  reply_count: number;
  block_count: number;
  pending_count: number;
  delivery_rate: number;
  reply_rate: number;
  fail_rate: number;
  block_rate: number;
  progress: number;
  duration_minutes: number | null;
  started_at: string | null;
  completed_at: string | null;
}

interface HourlyPoint {
  hour: string;
  total: number;
  sent: number;
  failed: number;
  replied: number;
}

interface Recipient {
  id: number;
  phone: string;
  name?: string;
  status: string;
  sent_at?: string;
  error_message?: string;
}

interface ReportData {
  campaign: Campaign;
  analytics: Analytics;
  hourly_stats: HourlyPoint[];
  recipients: Recipient[];
}

// بطاقة إحصائية
const StatCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}> = ({ label, value, sub, color, icon }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-xs font-bold text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// حالة المستلم
const RecipientStatus: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; className: string }> = {
    sent:    { label: 'مُرسل',   className: 'bg-indigo-50 text-indigo-700' },
    failed:  { label: 'فشل',     className: 'bg-rose-50 text-rose-700' },
    replied: { label: 'ردّ',     className: 'bg-emerald-50 text-emerald-700' },
    pending: { label: 'انتظار', className: 'bg-amber-50 text-amber-700' },
    blocked: { label: 'محظور',  className: 'bg-slate-100 text-slate-600' },
  };
  const cfg = map[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full', cfg.className)}>
      {cfg.label}
    </span>
  );
};

// تصدير CSV
function exportToCsv(campaign: Campaign, recipients: Recipient[]): void {
  const bom = '\uFEFF'; // BOM لدعم العربي في Excel
  const headers = ['الاسم', 'الهاتف', 'الحالة', 'وقت الإرسال', 'الخطأ'];
  const rows = recipients.map((r) => [
    r.name || '-',
    r.phone,
    r.status,
    r.sent_at ? format(parseISO(r.sent_at), 'yyyy-MM-dd HH:mm') : '-',
    r.error_message || '-',
  ]);

  const csv = bom + [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `تقرير_حملة_${campaign.name}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Label مخصص للـ Pie chart
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      className="text-[11px] font-bold font-cairo">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CampaignReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery<ReportData>({
    queryKey: ['campaign-report', id],
    queryFn: async () => {
      const { data } = await api.get(`/campaigns/${id}/report`);
      return data;
    },
    enabled: !!id,
  });

  // بيانات الـ Pie chart (توزيع الحالات)
  const pieData = data ? [
    { name: 'مُرسل',   value: data.analytics.sent_count,    color: COLORS.sent },
    { name: 'فشل',     value: data.analytics.failed_count,  color: COLORS.failed },
    { name: 'ردّ',     value: data.analytics.reply_count,   color: COLORS.replied },
    { name: 'انتظار', value: data.analytics.pending_count,  color: COLORS.pending },
  ].filter((d) => d.value > 0) : [];

  // تنسيق ساعات الـ Bar chart
  const chartData = (data?.hourly_stats || []).map((point) => ({
    ...point,
    hour: point.hour.substring(11, 16), // أخذ HH:MM فقط
  }));

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* زر الرجوع */}
      <button
        onClick={() => navigate('/campaigns')}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowRight size={16} />
        العودة للحملات
      </button>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
          <p className="text-slate-500 font-medium">جاري تحميل التقرير...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-32">
          <AlertCircle className="text-rose-400 h-12 w-12 mb-3" />
          <p className="text-slate-500 font-medium">تعذّر تحميل التقرير</p>
        </div>
      ) : data ? (
        <>
          {/* عنوان الحملة + تصدير */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-slate-800">{data.campaign.name}</h1>
              <p className="text-slate-500 mt-1 text-sm font-medium">تقرير أداء الحملة الترويجية</p>
            </div>
            <button
              onClick={() => exportToCsv(data.campaign, data.recipients)}
              className="h-10 lg:h-11 px-4 lg:px-5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 text-sm self-start sm:self-auto"
            >
              <Download size={16} />
              تصدير CSV
            </button>
          </div>

          {/* بطاقات الإحصائيات */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="إجمالي المستلمين"
              value={data.analytics.total_recipients}
              color="bg-indigo-50 text-indigo-600"
              icon={<Users size={22} />}
            />
            <StatCard
              label="مُرسل بنجاح"
              value={data.analytics.sent_count}
              sub={`معدل الوصول: ${data.analytics.delivery_rate}%`}
              color="bg-emerald-50 text-emerald-600"
              icon={<CheckCircle2 size={22} />}
            />
            <StatCard
              label="فشل الإرسال"
              value={data.analytics.failed_count}
              sub={`معدل الفشل: ${data.analytics.fail_rate}%`}
              color="bg-rose-50 text-rose-600"
              icon={<XCircle size={22} />}
            />
            <StatCard
              label="ردّوا على الحملة"
              value={data.analytics.reply_count}
              sub={`معدل الرد: ${data.analytics.reply_rate}%`}
              color="bg-purple-50 text-purple-600"
              icon={<MessageSquare size={22} />}
            />
          </div>

          {/* شريط التقدم */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-700">نسبة الإنجاز</span>
              <span className="text-sm font-black text-indigo-600">{data.analytics.progress}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all"
                style={{ width: `${data.analytics.progress}%` }}
              />
            </div>
            {data.analytics.duration_minutes !== null && (
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Clock size={12} />
                مدة الحملة: {data.analytics.duration_minutes} دقيقة
              </p>
            )}
          </div>

          {/* الرسوم البيانية */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart - توزيع بالوقت */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-indigo-500" />
                <h3 className="text-sm font-black text-slate-800">الإرسال بالساعة</h3>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 11, fontFamily: 'Cairo, sans-serif' }}
                      stroke="#cbd5e1"
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="#cbd5e1" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontFamily: 'Cairo, sans-serif',
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontFamily: 'Cairo, sans-serif', fontSize: 12 }}
                    />
                    <Bar dataKey="sent"    name="مُرسل"   fill={COLORS.sent}    radius={[4,4,0,0]} />
                    <Bar dataKey="failed"  name="فشل"     fill={COLORS.failed}  radius={[4,4,0,0]} />
                    <Bar dataKey="replied" name="ردّ"     fill={COLORS.replied} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[240px]">
                  <p className="text-slate-400 text-sm font-medium">لا توجد بيانات كافية للرسم البياني</p>
                </div>
              )}
            </div>

            {/* Pie Chart - توزيع الحالات */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-4 rounded-full bg-indigo-500" />
                <h3 className="text-sm font-black text-slate-800">توزيع الحالات</h3>
              </div>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontFamily: 'Cairo, sans-serif',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* مفتاح الألوان */}
                  <div className="space-y-1.5 mt-2">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                          <span className="font-medium text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-black text-slate-700">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[180px]">
                  <p className="text-slate-400 text-sm font-medium">لا توجد بيانات</p>
                </div>
              )}
            </div>
          </div>

          {/* جدول المستلمين */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">قائمة المستلمين</h3>
              <span className="text-xs font-bold text-slate-400">
                {data.recipients.length} من {data.analytics.total_recipients} مستلم
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الاسم</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الهاتف</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الحالة</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden md:table-cell">وقت الإرسال</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden lg:table-cell">الخطأ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.recipients.map((recipient) => (
                    <tr key={recipient.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-3 text-sm font-bold text-slate-700">
                        {recipient.name || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-600" dir="ltr">
                        {recipient.phone}
                      </td>
                      <td className="px-6 py-3">
                        <RecipientStatus status={recipient.status} />
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-400 hidden md:table-cell">
                        {recipient.sent_at
                          ? format(parseISO(recipient.sent_at), 'dd/MM HH:mm', { locale: ar })
                          : '—'}
                      </td>
                      <td className="px-6 py-3 text-xs text-rose-500 hidden lg:table-cell max-w-[200px] truncate">
                        {recipient.error_message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default CampaignReportPage;
