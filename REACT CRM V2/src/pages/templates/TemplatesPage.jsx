import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, FileText, Plus, Pencil, Trash2, RefreshCw, Search } from 'lucide-react';
import { templates as templatesApi, whatsappNumbers as whatsappNumbersApi } from '../../api';
import { cn } from '../../utils/cn';
import TemplateFormModal from './components/TemplateFormModal';

const STATUS_COLORS = {
  approved: 'bg-emerald-50 text-emerald-600',
  active: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  rejected: 'bg-rose-50 text-rose-600',
};

const CATEGORY_LABELS = {
  marketing: 'تسويقي',
  utility: 'خدمي',
  authentication: 'توثيق',
};

const TemplatesPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [numberId, setNumberId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', { search, category, numberId }],
    queryFn: () => templatesApi.getTemplates({
      search: search || undefined,
      category: category || undefined,
      whatsapp_number_id: numberId || undefined,
    }),
  });

  const { data: numbers = [] } = useQuery({
    queryKey: ['whatsapp-numbers-select'],
    queryFn: whatsappNumbersApi.getWhatsappNumbers,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['templates'] });

  const deleteMutation = useMutation({
    mutationFn: (id) => templatesApi.deleteTemplate(id),
    onSuccess: () => { invalidate(); toast.success('تم حذف القالب'); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل الحذف'),
  });

  const syncMutation = useMutation({
    mutationFn: (whatsappNumberId) => templatesApi.syncTemplates(whatsappNumberId),
    onSuccess: (data) => { invalidate(); toast.success(data?.message || 'تمت المزامنة'); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشلت المزامنة'),
  });

  const openCreate = () => { setEditingTemplate(null); setFormOpen(true); };
  const openEdit = (t) => { setEditingTemplate(t); setFormOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">قوالب الرسائل</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">قوالب واتساب المعتمدة من Meta لكل رقم.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={numberId}
            onChange={(e) => setNumberId(e.target.value)}
            disabled={syncMutation.isPending}
            className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 min-w-0 max-w-full"
          >
            <option value="">مزامنة قوالب رقم...</option>
            {numbers.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <button
            onClick={() => numberId && syncMutation.mutate(numberId)}
            disabled={!numberId || syncMutation.isPending}
            className="h-11 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl flex items-center gap-2 text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            {syncMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            <span>مزامنة</span>
          </button>
          <button onClick={openCreate} className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm">
            <Plus size={16} />
            <span>قالب جديد</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم..."
            className="w-full h-11 pr-11 pl-4 bg-white border border-slate-200 rounded-xl text-sm"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600">
          <option value="">كل الفئات</option>
          <option value="marketing">تسويقي</option>
          <option value="utility">خدمي</option>
          <option value="authentication">توثيق</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600 h-10 w-10" /></div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <FileText size={40} className="text-slate-100 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">لا توجد قوالب مطابقة. زامن القوالب من هنا أو أضف قالباً جديداً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-black text-slate-800 text-sm">{t.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-black px-2 py-1 rounded-lg uppercase', STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-500')}>
                    {t.status}
                  </span>
                  <button onClick={() => openEdit(t)} className="p-1.5 text-slate-300 hover:text-indigo-500">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { if (window.confirm('حذف هذا القالب؟')) deleteMutation.mutate(t.id); }}
                    className="p-1.5 text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{t.body_text}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 text-[11px] font-bold text-slate-400">
                <span>{CATEGORY_LABELS[t.category] ?? t.category}</span>
                <span>{t.variables_count} متغير</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateFormModal open={formOpen} onClose={() => setFormOpen(false)} template={editingTemplate} />
    </div>
  );
};

export default TemplatesPage;
