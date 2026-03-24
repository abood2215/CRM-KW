import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { WhatsappNumber } from '../../types';
import { 
  Smartphone, 
  Settings2, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  RefreshCw,
  MoreVertical,
  Activity,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const WhatsappPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedQR, setSelectedQR] = useState<{ id: number, qr: string } | null>(null);

  const { data: numbers = [], isLoading } = useQuery<WhatsappNumber[]>({
    queryKey: ['whatsapp-numbers'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp-numbers');
      return data.whatsapp_numbers;
    },
  });

  const getQRMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.get(`/whatsapp-numbers/${id}/qr`);
      return { id, qr: data.qr };
    },
    onSuccess: (data) => setSelectedQR(data),
    onError: () => toast.error('فشل جلب رمز QR'),
  });

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    connected: { label: 'متصل', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <CheckCircle2 size={16} /> },
    disconnected: { label: 'غير متصل', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: <AlertCircle size={16} /> },
    banned: { label: 'محظور', color: 'text-slate-600 bg-slate-100 border-slate-200', icon: <ShieldAlert size={16} /> },
  };

  return (
    <div className="space-y-8 font-cairo animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">إدارة أرقام واتساب</h1>
          <p className="text-slate-500 mt-1 font-medium">قم بربط أرقامك الرسمية ومراقبة أدائها اليومي لمركز مطمئنة.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
            <Plus size={18} />
            <span>إضافة رقم جديد</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
             <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
             <p className="text-slate-500 font-medium">جاري جلب قائمة الأرقام...</p>
          </div>
        ) : numbers.map((number) => (
          <div key={number.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all">
            {/* Health Info */}
            <div className="p-8 pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all border border-slate-100 group-hover:border-indigo-100 shadow-sm relative">
                  <Smartphone size={28} />
                   <div className="absolute -top-1 -left-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white ring-4 ring-emerald-500/10 group-hover:animate-ping" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-4 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 uppercase tracking-tight",
                    statusMap[number.status].color
                  )}>
                    {statusMap[number.status].label}
                  </span>
                </div>
              </div>

              <div className="space-y-1 mb-8">
                 <h3 className="text-xl font-black text-slate-800">{number.name}</h3>
                 <p className="text-sm font-bold text-slate-400">{number.phone}</p>
              </div>

              {/* Sent Today Progress */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">الإرسال اليومي</span>
                    <span className={cn(
                      number.sent_today > number.daily_limit * 0.8 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {number.sent_today} / {number.daily_limit}
                    </span>
                 </div>
                 <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(number.sent_today / number.daily_limit) * 100}%` }}
                      className={cn(
                        "h-full rounded-full transition-all",
                        number.sent_today > number.daily_limit * 0.8 ? "bg-rose-500" : "bg-emerald-500"
                      )} 
                    />
                 </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="p-6 pt-0 mt-4 flex items-center justify-between">
               <div className="flex items-center gap-2 text-slate-300 text-[10px] font-black uppercase tracking-tighter">
                  <Clock size={14} />
                  <span>آخر إرسال: {number.last_sent_at ? format(new Date(number.last_sent_at), 'HH:mm') : 'لم يرسل'}</span>
               </div>
               <div className="flex items-center gap-2">
                  {number.status === 'disconnected' && (
                    <button 
                      onClick={() => getQRMutation.mutate(number.id)}
                      className="h-10 px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/10"
                    >
                      <QrCode size={14} />
                      <span>ربط الرقم</span>
                    </button>
                  )}
                  <button className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 rounded-xl flex items-center justify-center transition-all">
                    <Settings2 size={16} />
                  </button>
               </div>
            </div>
          </div>
        ))}
        
        {/* Statistics or Connect more card */}
        <div className="bg-indigo-600 p-10 rounded-[2rem] shadow-2xl text-white relative flex flex-col items-center justify-center text-center overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-24 translate-x-24 blur-3xl pointer-events-none transition-transform duration-700 group-hover:scale-150" />
           <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-white/20">
                 <ShieldCheck size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-black mb-2">الأمان والحماية</h3>
              <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-[200px]">جميع الأرقام مرتبطة بنظام حظر ذكي يضمن أمان حساباتك الرسمية بالواتساب.</p>
              <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-6 justify-center">
                 <div className="text-center">
                   <p className="text-2xl font-black">24/7</p>
                   <p className="text-[10px] font-bold text-indigo-100 uppercase mt-1">المتابعة</p>
                 </div>
                 <div className="h-8 w-px bg-white/20" />
                 <div className="text-center">
                   <p className="text-2xl font-black">100%</p>
                   <p className="text-[10px] font-bold text-indigo-100 uppercase mt-1">الاستقرار</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {selectedQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative"
            >
              <button 
                onClick={() => setSelectedQR(null)}
                className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all font-bold"
              >
                إغلاق
              </button>
              
              <div className="mb-8">
                 <h3 className="text-2xl font-black text-slate-800 mb-2">ربط حساب واتساب</h3>
                 <p className="text-slate-400 text-sm font-medium">افتح الواتساب من جوالك وامسح رمز الـ QR أدناه للمزامنة فوراً.</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8 aspect-square flex items-center justify-center overflow-hidden">
                <img src={selectedQR.qr} alt="Scan to connect" className="w-full h-full object-contain mix-blend-multiply" />
              </div>

              <div className="flex flex-col gap-3">
                 <button
                   onClick={() => selectedQR && getQRMutation.mutate(selectedQR.id)}
                   disabled={getQRMutation.isPending}
                   className="h-12 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70">
                   <RefreshCw size={18} className={getQRMutation.isPending ? 'animate-spin' : ''} />
                   <span>تحديث الرمز</span>
                 </button>
                 <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl justify-center border border-emerald-100">
                    <Activity size={12} />
                    <span>جاهز للمسح الضوئي</span>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatsappPage;
