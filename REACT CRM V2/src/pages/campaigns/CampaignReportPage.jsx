import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowRight, Loader2, Phone, ShieldOff, AlertTriangle, Download } from 'lucide-react';
import { campaigns as campaignsApi } from '../../api';
import { usePermission } from '../../hooks/usePermission';

const CampaignReportPage = () => {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const canManage = usePermission('campaigns.manage');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaign-report', id, page],
    queryFn: () => campaignsApi.getCampaignReport(id, { per_page: 25, page }),
  });

  const blacklistFailedMutation = useMutation({
    mutationFn: () => campaignsApi.blacklistFailedRecipients(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-report', id] });
      toast.success(res.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2 text-center">
        <AlertTriangle className="text-rose-400" size={28} />
        <p className="text-slate-500 text-sm font-bold">تعذّر تحميل تقرير الحملة.</p>
        <Link to="/campaigns" className="text-sm font-bold text-indigo-600 hover:underline">رجوع للحملات</Link>
      </div>
    );
  }

  const { campaign, analytics, recipients, meta } = data;

  const handleExportRecipients = async () => {
    try {
      const blob = await campaignsApi.exportCampaignRecipientsCsv(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `campaign-${id}-recipients.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('فشل التصدير');
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/campaigns" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600">
        <ArrowRight size={16} />
        رجوع للحملات
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">{campaign.name}</h1>
          {campaign.whatsapp_number && (
            <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-500 mt-1">
              <Phone size={14} />
              <span>{campaign.whatsapp_number.name} ({campaign.whatsapp_number.phone})</span>
            </div>
          )}
        </div>
        <button
          onClick={handleExportRecipients}
          className="h-10 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all bg-white flex-shrink-0"
        >
          <Download size={16} />
          <span>تصدير المستلمين CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ['إجمالي المستلمين', analytics.total_recipients],
          ['أُرسلت', analytics.sent_count],
          ['فشلت', analytics.failed_count],
          ['ردود', analytics.reply_count],
          ['نسبة التسليم', `${analytics.delivery_rate}%`],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-800">{value}</p>
            <p className="text-[11px] font-bold text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Secondary/manual fallback — auto-blacklisting on delivery failure normally handles this */}
      {canManage && analytics.failed_count > 0 && (
        <button
          onClick={() => blacklistFailedMutation.mutate()}
          disabled={blacklistFailedMutation.isPending}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
        >
          {blacklistFailedMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
          حظر جميع الأرقام الفاشلة يدوياً
        </button>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-slate-400 text-xs font-black uppercase border-b border-slate-100">
              <th className="px-6 py-4">الاسم</th>
              <th className="px-6 py-4">الهاتف</th>
              <th className="px-6 py-4">الحالة</th>
              <th className="px-6 py-4">خطأ</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0">
                <td className="px-6 py-3 font-bold text-slate-700">{r.name ?? '—'}</td>
                <td className="px-6 py-3 text-slate-500">{r.phone}</td>
                <td className="px-6 py-3">
                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-50 text-slate-600">{r.status}</span>
                </td>
                <td className="px-6 py-3 text-slate-400 text-xs">{r.error_message ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Real pagination — fixes the old app's hardcoded 200-recipient cap */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-sm">
          <span className="text-slate-400 font-medium">
            صفحة {meta.current_page} من {meta.last_page} — {meta.total} مستلم إجمالاً
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 font-bold"
            >
              السابق
            </button>
            <button
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 font-bold"
            >
              التالي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignReportPage;
