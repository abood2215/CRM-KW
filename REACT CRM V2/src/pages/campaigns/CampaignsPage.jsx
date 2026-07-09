import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Megaphone, Plus, Pause, Play, Trash2, CheckCircle2, Clock, Loader2, BarChart3, Phone } from 'lucide-react';
import { campaigns as campaignsApi } from '../../api';
import { cn } from '../../utils/cn';
import { useConfirm } from '../../hooks/useConfirm';
import CreateCampaignModal from '../../components/CreateCampaignModal';

const STATUS_MAP = {
  draft: { label: 'مسودة', color: 'bg-slate-100 text-slate-500', icon: <Clock size={13} /> },
  scheduled: { label: 'مجدولة', color: 'bg-indigo-50 text-indigo-600', icon: <Clock size={13} /> },
  running: { label: 'جاري الإرسال', color: 'bg-emerald-50 text-emerald-600', icon: <Play size={13} /> },
  paused: { label: 'متوقفة', color: 'bg-amber-50 text-amber-600', icon: <Pause size={13} /> },
  completed: { label: 'مكتملة', color: 'bg-sky-50 text-sky-600', icon: <CheckCircle2 size={13} /> },
};

const TABS = [
  { id: 'all', label: 'جميع الحملات' },
  { id: 'running', label: 'نشطة الآن' },
  { id: 'completed', label: 'المكتملة' },
];

const CampaignsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [activeTab, setActiveTab] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', activeTab],
    queryFn: () => campaignsApi.getCampaigns({ status: activeTab !== 'all' ? activeTab : undefined }),
  });
  const campaigns = data?.campaigns ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['campaigns'] });

  const pauseMutation = useMutation({
    mutationFn: (id) => campaignsApi.pauseCampaign(id),
    onSuccess: () => { invalidate(); toast.success('تم إيقاف الحملة'); },
  });
  const resumeMutation = useMutation({
    mutationFn: (id) => campaignsApi.resumeCampaign(id),
    onSuccess: () => { invalidate(); toast.success('تم استئناف الحملة'); },
  });
  const startMutation = useMutation({
    mutationFn: (id) => campaignsApi.startCampaign(id),
    onSuccess: () => { invalidate(); toast.success('تم بدء الحملة'); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل بدء الحملة'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => campaignsApi.deleteCampaign(id),
    onSuccess: () => { invalidate(); toast.success('تم حذف الحملة'); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل حذف الحملة'),
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800">الحملات الترويجية</h1>
            <p className="text-slate-500 mt-1 font-medium text-sm">أطلق حملات واتساب للوصول إلى عملائك.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCreateOpen(true)}
            className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            <span>حملة جديدة</span>
          </motion.button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
          <div className="flex gap-0 border-b border-slate-100 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'py-4 px-6 text-sm font-black transition-all border-b-2 whitespace-nowrap',
                  activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
                <p className="text-slate-500 font-medium">جاري جلب الحملات...</p>
              </div>
            ) : campaigns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 hover:bg-white hover:shadow-xl transition-all flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <span className={cn('px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 uppercase', STATUS_MAP[campaign.status]?.color)}>
                        {STATUS_MAP[campaign.status]?.icon}
                        {STATUS_MAP[campaign.status]?.label ?? campaign.status}
                      </span>
                      {['draft', 'completed', 'paused'].includes(campaign.status) && (
                        <button
                          onClick={async () => { if (await confirm('هل تريد حذف هذه الحملة؟')) deleteMutation.mutate(campaign.id); }}
                          className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <h3 className="text-base font-black text-slate-800 mb-1 truncate">{campaign.name}</h3>

                    {/* Fixes a bug in the old app where the sending number never appeared on the card */}
                    {campaign.whatsapp_number && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-500 mb-4">
                        <Phone size={12} />
                        <span>{campaign.whatsapp_number.name} ({campaign.whatsapp_number.phone})</span>
                      </div>
                    )}

                    <div className="mt-auto space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase mb-2">
                          <span>نسبة الإرسال</span>
                          <span>{campaign.progress_percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200/60 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${campaign.progress_percentage}%` }}
                            className={cn('h-full rounded-full', campaign.status === 'running' ? 'bg-emerald-500' : 'bg-indigo-600')}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-800">{campaign.sent_count}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">أُرسلت</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-rose-500">{campaign.failed_count}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">فشلت</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-emerald-500">{campaign.reply_count}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">ردود</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                        <Clock size={12} />
                        <span>{campaign.created_at ? format(new Date(campaign.created_at), 'dd MMM yyyy', { locale: ar }) : '—'}</span>
                      </div>
                      {campaign.status === 'running' ? (
                        <button onClick={() => pauseMutation.mutate(campaign.id)} className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-amber-600">
                          <Pause size={16} />
                        </button>
                      ) : campaign.status === 'paused' ? (
                        <button onClick={() => resumeMutation.mutate(campaign.id)} className="w-9 h-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-emerald-600">
                          <Play size={16} />
                        </button>
                      ) : ['draft', 'scheduled'].includes(campaign.status) ? (
                        <button onClick={() => startMutation.mutate(campaign.id)} className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700">
                          <Play size={16} />
                        </button>
                      ) : (
                        <button onClick={() => navigate(`/campaigns/${campaign.id}/report`)} className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white">
                          <BarChart3 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-5 mx-auto border border-slate-100">
                  <Megaphone size={36} className="text-slate-200" />
                </div>
                <p className="text-lg font-black text-slate-700 mb-2">لا توجد حملات حالياً</p>
                <p className="text-slate-400 font-medium max-w-xs mx-auto text-sm mb-5">أطلق حملتك الترويجية الأولى للوصول إلى عملائك.</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="h-10 px-5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all inline-flex items-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  حملة جديدة
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {confirmDialog}
    </>
  );
};

export default CampaignsPage;
