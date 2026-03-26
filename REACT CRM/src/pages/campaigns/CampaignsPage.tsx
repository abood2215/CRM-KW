import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import CreateCampaignModal from '../../components/CreateCampaignModal';
import { Campaign } from '../../types';
import {
  Megaphone,
  Plus,
  Pause,
  Play,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  BarChart3
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const CampaignsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'running' | 'completed'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns', activeTab],
    queryFn: async () => {
      const { data } = await api.get('/campaigns', { params: { status: activeTab !== 'all' ? activeTab : undefined } });
      return data.campaigns;
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: number) => api.put(`/campaigns/${id}/pause`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('تم إيقاف الحملة'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/campaigns/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('تم حذف الحملة'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل حذف الحملة'),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: number) => api.put(`/campaigns/${id}/resume`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('تم استئناف الحملة'); },
  });

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    draft:     { label: 'مسودة',        color: 'bg-slate-100 text-slate-500',   icon: <Clock size={13} /> },
    scheduled: { label: 'مجدولة',       color: 'bg-indigo-50 text-indigo-600',  icon: <Clock size={13} /> },
    running:   { label: 'جاري الإرسال', color: 'bg-emerald-50 text-emerald-600',icon: <Play size={13} /> },
    paused:    { label: 'متوقفة',       color: 'bg-amber-50 text-amber-600',    icon: <Pause size={13} /> },
    completed: { label: 'مكتملة',       color: 'bg-sky-50 text-sky-600',        icon: <CheckCircle2 size={13} /> },
  };

  const tabs = [
    { id: 'all', label: 'جميع الحملات' },
    { id: 'running', label: 'نشطة الآن' },
    { id: 'completed', label: 'المكتملة' },
  ];

  return (
    <>
      <div className="space-y-5 lg:space-y-8 font-cairo">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800">الحملات الترويجية</h1>
            <p className="text-slate-500 mt-1 font-medium text-sm">أطلق حملات واتساب للوصول إلى عملائك.</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="h-10 lg:h-11 px-4 lg:px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>حملة جديدة</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden min-h-[400px] flex flex-col">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-slate-100 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "py-4 px-4 lg:px-8 text-xs lg:text-sm font-black transition-all border-b-2 whitespace-nowrap flex-shrink-0",
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 lg:p-10">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
                <p className="text-slate-500 font-medium">جاري جلب الحملات...</p>
              </div>
            ) : campaigns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 lg:p-6 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all group flex flex-col relative overflow-hidden"
                  >
                    {/* Status + Delete */}
                    <div className="flex items-center justify-between mb-5">
                      <span className={cn(
                        "px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 uppercase tracking-tight",
                        statusMap[campaign.status]?.color || 'bg-slate-100 text-slate-500'
                      )}>
                        {statusMap[campaign.status]?.icon}
                        {statusMap[campaign.status]?.label || campaign.status}
                      </span>
                      {['draft', 'completed', 'paused'].includes(campaign.status) && (
                        <button
                          onClick={() => {
                            if (window.confirm('هل تريد حذف هذه الحملة؟'))
                              deleteMutation.mutate(campaign.id);
                          }}
                          className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <h3 className="text-base font-black text-slate-800 mb-1.5 truncate">{campaign.name}</h3>
                    <p className="text-xs font-medium text-slate-400 mb-5 line-clamp-2 leading-relaxed">{campaign.message_text}</p>

                    {/* Progress */}
                    <div className="mt-auto space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                          <span>نسبة الإرسال</span>
                          <span>{campaign.progress_percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200/60 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${campaign.progress_percentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={cn(
                              "h-full rounded-full",
                              campaign.status === 'running' ? "bg-emerald-500" : "bg-indigo-600"
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-800">{campaign.sent_count}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">أُرسلت</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-rose-500">{campaign.failed_count}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">فشلت</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-emerald-500">{campaign.reply_count}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">ردود</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                        <Clock size={12} />
                        <span>{format(new Date(campaign.created_at), 'dd MMM yyyy')}</span>
                      </div>
                      {campaign.status === 'running' ? (
                        <button
                          onClick={() => pauseMutation.mutate(campaign.id)}
                          className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
                        >
                          <Pause size={16} />
                        </button>
                      ) : campaign.status === 'paused' ? (
                        <button
                          onClick={() => resumeMutation.mutate(campaign.id)}
                          className="w-9 h-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                        >
                          <Play size={16} />
                        </button>
                      ) : (
                        <button className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
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
                <p className="text-lg lg:text-xl font-black text-slate-700 mb-2">لا توجد حملات حالياً</p>
                <p className="text-slate-400 font-medium max-w-xs mx-auto leading-relaxed text-sm">
                  أطلق حملتك الترويجية الأولى للوصول إلى عملائك.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
};

export default CampaignsPage;
