import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import CreateCampaignModal from '../../components/CreateCampaignModal';
import { Campaign } from '../../types';
import { 
  Megaphone, 
  Plus, 
  MoreVertical, 
  Send, 
  Pause, 
  Play, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  Users,
  MessageSquare,
  BarChart3,
  Image as ImageIcon
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('تم إيقاف الحملة مؤقتاً');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('تم حذف الحملة');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل حذف الحملة'),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: number) => api.put(`/campaigns/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('تم استئناف الحملة');
    },
  });

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    draft: { label: 'مسودة', color: 'bg-slate-100 text-slate-500', icon: <Clock size={14} /> },
    scheduled: { label: 'مجدولة', color: 'bg-indigo-50 text-indigo-600', icon: <Clock size={14} /> },
    running: { label: 'جاري الإرسال', color: 'bg-emerald-50 text-emerald-600', icon: <Play size={14} /> },
    paused: { label: 'متوقفة', color: 'bg-amber-50 text-amber-600', icon: <Pause size={14} /> },
    completed: { label: 'مكتملة', color: 'bg-sky-50 text-sky-600', icon: <CheckCircle2 size={14} /> },
  };

  return (
    <div className="space-y-8 font-cairo animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">الحملات الترويجية</h1>
          <p className="text-slate-500 mt-1 font-medium">أطلق حملات واتساب متطورة للوصول إلى آلاف العملاء بضغطة واحدة.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setCreateOpen(true)} className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
            <Plus size={18} />
            <span>حملة جديدة</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden min-h-[500px] flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex gap-8 px-10 border-b border-slate-50 overflow-x-auto scrollbar-hide">
          {(['all', 'running', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-6 px-4 text-sm font-black transition-all border-b-4",
                activeTab === tab 
                  ? "border-indigo-600 text-indigo-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              {tab === 'all' ? 'جميع الحملات' : tab === 'running' ? 'نشطة الآن' : 'الأرشيف والمكتملة'}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
               <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
               <p className="text-slate-500 font-medium">جاري جلب قائمة الحملات...</p>
            </div>
          ) : campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-slate-50/50 rounded-[2rem] border border-slate-100 p-8 hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all group flex flex-col relative overflow-hidden">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-8">
                    <span className={cn(
                      "px-4 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 uppercase tracking-tight",
                      statusMap[campaign.status].color
                    )}>
                      {statusMap[campaign.status].icon}
                      {statusMap[campaign.status].label}
                    </span>
                    {['draft', 'completed', 'paused'].includes(campaign.status) && (
                      <button onClick={() => {
                        if (window.confirm('هل تريد حذف هذه الحملة؟'))
                          deleteMutation.mutate(campaign.id);
                      }} className="p-1 px-2 text-slate-300 hover:text-rose-500 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-slate-800 mb-2 truncate">{campaign.name}</h3>
                  <p className="text-xs font-medium text-slate-400 mb-8 line-clamp-2 leading-relaxed ml-2">{campaign.message_text}</p>
                  
                  {/* Progress Section */}
                  <div className="mt-auto space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest">
                         <span>نسبة الإرسال</span>
                         <span>{campaign.progress_percentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${campaign.progress_percentage}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={cn(
                            "h-full rounded-full",
                            campaign.status === 'running' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-indigo-600"
                          )} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                       <div className="text-center group-hover:scale-105 transition-transform">
                          <p className="text-base font-black text-slate-800">{campaign.sent_count}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">أُرسلت</p>
                       </div>
                       <div className="text-center group-hover:scale-105 transition-transform">
                          <p className="text-base font-black text-rose-500">{campaign.failed_count}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">فشلت</p>
                       </div>
                       <div className="text-center group-hover:scale-105 transition-transform">
                          <p className="text-base font-black text-emerald-500">{campaign.reply_count}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">ردود</p>
                       </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={14} />
                        <span>{format(new Date(campaign.created_at), 'dd MMM yyyy')}</span>
                     </div>
                     {campaign.status === 'running' ? (
                       <button 
                        onClick={() => pauseMutation.mutate(campaign.id)}
                        className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all font-bold"
                       >
                        <Pause size={18} />
                       </button>
                     ) : campaign.status === 'paused' ? (
                       <button 
                        onClick={() => resumeMutation.mutate(campaign.id)}
                        className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all font-bold"
                       >
                        <Play size={18} />
                       </button>
                     ) : (
                       <button className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all font-bold">
                        <BarChart3 size={18} />
                       </button>
                     )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6 mx-auto border border-slate-100">
                <Megaphone size={40} className="text-slate-100" />
              </div>
              <p className="text-xl font-black text-slate-700 mb-2">لا توجد حملات حالياً</p>
              <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">أطلق حملتك الترويجية الأولى بالضغط على الزر في للأعلى لزيادة مبيعاتك.</p>
            </div>
          )}
        </div>
      </div>
    </div>

    <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
  );
};

export default CampaignsPage;
