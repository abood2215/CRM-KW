import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { WhatsappTemplate, WhatsappNumber } from '../../types';
import {
  FileText, RefreshCw, CheckCircle, Clock, XCircle,
  Loader2, Search, Filter, Eye, Image, Video, File as FilePdf
} from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

// ==============================
// صفحة القوالب
// ==============================
const TemplatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedNumberId, setSelectedNumberId] = useState<number | ''>('');
  const [previewTemplate, setPreviewTemplate] = useState<WhatsappTemplate | null>(null);

  // جلب أرقام واتساب لاختيار الرقم للمزامنة
  const { data: numbers = [] } = useQuery<WhatsappNumber[]>({
    queryKey: ['whatsapp-numbers'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp-numbers');
      return data.whatsapp_numbers;
    },
  });

  // جلب القوالب
  const { data: templates = [], isLoading } = useQuery<WhatsappTemplate[]>({
    queryKey: ['templates', search, statusFilter, categoryFilter, selectedNumberId],
    queryFn: async () => {
      const { data } = await api.get('/templates', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          whatsapp_number_id: selectedNumberId || undefined,
        }
      });
      return data.templates;
    },
  });

  // مزامنة القوالب
  const syncMutation = useMutation({
    mutationFn: (numberId: number) =>
      api.post('/templates/sync', { whatsapp_number_id: numberId }),
    onSuccess: (_, numberId) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('جاري مزامنة القوالب من Meta...');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'فشلت المزامنة.'),
  });

  // مزامنة عبر endpoint رقم واتساب
  const syncByNumberMutation = useMutation({
    mutationFn: (numberId: number) =>
      api.post(`/whatsapp-numbers/${numberId}/sync-templates`),
    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['templates'] }), 3000);
      toast.success('جاري المزامنة في الخلفية، سيتم التحديث خلال ثوانٍ...');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'فشلت المزامنة.'),
  });

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    approved: { label: 'معتمد', color: 'bg-emerald-50 text-emerald-600', icon: <CheckCircle size={12} /> },
    pending:  { label: 'قيد المراجعة', color: 'bg-amber-50 text-amber-600', icon: <Clock size={12} /> },
    rejected: { label: 'مرفوض', color: 'bg-rose-50 text-rose-600', icon: <XCircle size={12} /> },
  };

  const categoryLabels: Record<string, string> = {
    marketing:      'تسويقي',
    utility:        'خدمي',
    authentication: 'مصادقة',
  };

  const headerIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image size={14} className="text-indigo-500" />;
      case 'video': return <Video size={14} className="text-purple-500" />;
      case 'pdf':   return <FilePdf size={14} className="text-rose-500" />;
      default:      return null;
    }
  };

  return (
    <div className="space-y-8 font-cairo animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">قوالب واتساب</h1>
          <p className="text-slate-500 mt-1 font-medium">قوالب الرسائل المعتمدة من Meta للحملات التسويقية.</p>
        </div>

        {/* زر المزامنة */}
        <div className="flex items-center gap-3">
          {numbers.length > 0 && (
            <select
              value={selectedNumberId}
              onChange={e => setSelectedNumberId(e.target.value ? Number(e.target.value) : '')}
              className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">اختر الرقم</option>
              {numbers.map(n => (
                <option key={n.id} value={n.id}>{n.name} - {n.phone}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => {
              if (!selectedNumberId) {
                toast.error('اختر رقم واتساب أولاً.');
                return;
              }
              syncByNumberMutation.mutate(Number(selectedNumberId));
            }}
            disabled={syncByNumberMutation.isPending}
            className="h-10 px-5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {syncByNumberMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            مزامنة من Meta
          </button>
        </div>
      </div>

      {/* فلاتر */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="بحث باسم القالب..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pr-9 pl-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">جميع الحالات</option>
          <option value="approved">معتمد ✅</option>
          <option value="pending">قيد المراجعة ⏳</option>
          <option value="rejected">مرفوض ❌</option>
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">جميع الأنواع</option>
          <option value="marketing">تسويقي</option>
          <option value="utility">خدمي</option>
          <option value="authentication">مصادقة</option>
        </select>
      </div>

      {/* المحتوى */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600 h-10 w-10" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-20 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={36} className="text-slate-200" />
          </div>
          <p className="text-xl font-black text-slate-700 mb-2">لا توجد قوالب</p>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            اضغط "مزامنة من Meta" بعد اختيار رقم واتساب لجلب القوالب المعتمدة.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const status = statusConfig[template.status] ?? statusConfig.pending;
            return (
              <div
                key={template.id}
                className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-6 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5',
                      status.color
                    )}>
                      {status.icon}
                      {status.label}
                    </span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold">
                      {categoryLabels[template.category] ?? template.category}
                    </span>
                  </div>
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <Eye size={16} />
                  </button>
                </div>

                {/* اسم القالب */}
                <h3 className="font-black text-slate-800 mb-1 font-mono text-sm">{template.name}</h3>
                <p className="text-xs text-slate-400 font-medium mb-3">{template.language}</p>

                {/* Header type */}
                {template.header_type !== 'none' && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-2">
                    {headerIcon(template.header_type)}
                    <span>هيدر: {template.header_type}</span>
                  </div>
                )}

                {/* نص الرسالة */}
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 flex-1">
                  {template.body_text}
                </p>

                {/* Footer */}
                {template.footer_text && (
                  <p className="text-xs text-slate-400 mt-2 border-t border-slate-50 pt-2">
                    {template.footer_text}
                  </p>
                )}

                {/* متغيرات */}
                {template.variables_count > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                    <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px]">
                      {template.variables_count}
                    </span>
                    متغير
                  </div>
                )}

                {/* أزرار */}
                {template.buttons && template.buttons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.buttons.map((btn: any, i: number) => (
                      <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">
                        {btn.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* معاينة القالب */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
};

// ==============================
// مودال معاينة القالب
// ==============================
const TemplatePreviewModal: React.FC<{ template: WhatsappTemplate; onClose: () => void }> = ({ template, onClose }) => {
  const categoryLabels: Record<string, string> = {
    marketing: 'تسويقي',
    utility: 'خدمي',
    authentication: 'مصادقة',
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-800 text-lg">معاينة القالب</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50">✕</button>
          </div>
        </div>

        <div className="p-6">
          {/* معلومات القالب */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold font-mono">{template.name}</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{template.language}</span>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">{categoryLabels[template.category]}</span>
          </div>

          {/* محاكاة واجهة واتساب */}
          <div className="bg-[#ECE5DD] rounded-2xl p-4">
            <div className="bg-white rounded-xl p-4 max-w-sm shadow-sm">
              {/* هيدر */}
              {template.header_type !== 'none' && (
                <div className="mb-3">
                  {template.header_type === 'text' && template.header_content && (
                    <p className="font-black text-slate-800 text-sm">{template.header_content}</p>
                  )}
                  {template.header_type === 'image' && (
                    <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Image size={24} className="text-slate-300" />
                      <span className="text-xs text-slate-400 mr-2">صورة</span>
                    </div>
                  )}
                  {template.header_type === 'video' && (
                    <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Video size={24} className="text-slate-300" />
                      <span className="text-xs text-slate-400 mr-2">فيديو</span>
                    </div>
                  )}
                </div>
              )}

              {/* النص */}
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{template.body_text}</p>

              {/* Footer */}
              {template.footer_text && (
                <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">{template.footer_text}</p>
              )}

              {/* أزرار */}
              {template.buttons && template.buttons.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {template.buttons.map((btn: any, i: number) => (
                    <button
                      key={i}
                      className="w-full py-2 text-center text-sm font-bold text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      {btn.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {template.variables_count > 0 && (
            <p className="mt-3 text-xs text-slate-500 font-medium text-center">
              ⚡ هذا القالب يحتوي على {template.variables_count} متغير قابل للتخصيص
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesPage;
