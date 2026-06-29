import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useDebounce } from '../../hooks/useDebounce';
import {
  FileText, RefreshCw, CheckCircle, Clock, XCircle,
  Loader2, Search, Eye, Image, Video, File as FilePdf,
  Plus, Pencil, Trash2, X, Save, Info,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
  { code: 'ar',    label: 'العربية' },
  { code: 'en',    label: 'الإنجليزية' },
  { code: 'en_US', label: 'English (US)' },
  { code: 'fr',    label: 'الفرنسية' },
  { code: 'tr',    label: 'التركية' },
  { code: 'ur',    label: 'الأردية' },
];

const countVars = (text) => {
  const m = text.match(/\{\{\d+\}\}/g);
  return m ? m.length : 0;
};

const EMPTY_FORM = {
  name:           '',
  language:       'ar',
  category:       'marketing',
  status:         'approved',
  header_type:    'none',
  header_content: '',
  body_text:      '',
  footer_text:    '',
};

const TemplatesPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]                     = useState('');
  const [statusFilter, setStatusFilter]         = useState('');
  const [categoryFilter, setCategoryFilter]     = useState('');
  const [selectedNumberId, setSelectedNumberId] = useState('');
  const [previewTemplate, setPreviewTemplate]   = useState(null);
  const [editModal, setEditModal]               = useState({ open: false, template: null });
  const [deleteConfirm, setDeleteConfirm]       = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const { data: numbers = [] } = useQuery({
    queryKey: ['whatsapp-numbers'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp-numbers');
      return data.whatsapp_numbers;
    },
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', debouncedSearch, statusFilter, categoryFilter, selectedNumberId],
    queryFn: async () => {
      const { data } = await api.get('/templates', {
        params: {
          search:             debouncedSearch  || undefined,
          status:             statusFilter     || undefined,
          category:           categoryFilter   || undefined,
          whatsapp_number_id: selectedNumberId || undefined,
        },
      });
      return data.templates;
    },
  });

  const syncByNumberMutation = useMutation({
    mutationFn: (numberId) => api.post(`/whatsapp-numbers/${numberId}/sync-templates`),
    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['templates'] }), 3000);
      toast.success('جاري المزامنة في الخلفية...');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشلت المزامنة.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setDeleteConfirm(null);
      toast.success('تم حذف القالب.');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل الحذف.'),
  });

  const statusConfig = {
    approved: { label: 'معتمد',         color: 'bg-emerald-50 text-emerald-600 border-emerald-200',  icon: <CheckCircle size={11} /> },
    pending:  { label: 'قيد المراجعة', color: 'bg-amber-50   text-amber-600   border-amber-200',    icon: <Clock       size={11} /> },
    rejected: { label: 'مرفوض',        color: 'bg-rose-50    text-rose-600    border-rose-200',      icon: <XCircle     size={11} /> },
  };

  const categoryLabels = {
    marketing:      'تسويقي',
    utility:        'خدمي',
    authentication: 'مصادقة',
  };

  const headerIcon = (type) => {
    if (type === 'image') return <Image    size={13} className="text-indigo-500" />;
    if (type === 'video') return <Video    size={13} className="text-purple-500" />;
    if (type === 'pdf')   return <FilePdf  size={13} className="text-rose-500"   />;
    return null;
  };

  return (
    <div className="space-y-6 font-cairo animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">قوالب الرسائل</h1>
          <p className="text-slate-500 mt-0.5 text-sm font-medium">أنشئ وعدّل قوالب الرسائل للحملات والمحادثات.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {numbers.length > 0 && (
            <select
              value={selectedNumberId}
              onChange={e => setSelectedNumberId(e.target.value ? Number(e.target.value) : '')}
              className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">اختر الرقم</option>
              {numbers.map(n => <option key={n.id} value={n.id}>{n.name} — {n.phone}</option>)}
            </select>
          )}
          <button
            onClick={() => {
              if (!selectedNumberId) return toast.error('اختر رقم واتساب أولاً.');
              syncByNumberMutation.mutate(Number(selectedNumberId));
            }}
            disabled={syncByNumberMutation.isPending}
            className="h-10 px-4 border border-slate-200 text-slate-600 font-bold rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-2 text-sm disabled:opacity-60 bg-white"
          >
            {syncByNumberMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            مزامنة من Meta
          </button>
          <button
            onClick={() => setEditModal({ open: true, template: null })}
            className="h-10 px-5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm"
          >
            <Plus size={17} />
            إنشاء قالب
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="بحث باسم القالب..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pr-9 pl-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">جميع الحالات</option>
          <option value="approved">معتمد</option>
          <option value="pending">قيد المراجعة</option>
          <option value="rejected">مرفوض</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">جميع الأنواع</option>
          <option value="marketing">تسويقي</option>
          <option value="utility">خدمي</option>
          <option value="authentication">مصادقة</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-20 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={36} className="text-slate-200" />
          </div>
          <p className="text-xl font-black text-slate-700 mb-2">لا توجد قوالب</p>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
            أنشئ قالباً جديداً أو زامن من Meta بعد اختيار رقم واتساب.
          </p>
          <button
            onClick={() => setEditModal({ open: true, template: null })}
            className="mx-auto flex items-center gap-2 h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm"
          >
            <Plus size={16} /> إنشاء أول قالب
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map(template => {
            const status = statusConfig[template.status] ?? statusConfig.pending;
            return (
              <div
                key={template.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-5 flex flex-col"
              >
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border', status.color)}>
                      {status.icon} {status.label}
                    </span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold">
                      {categoryLabels[template.category] ?? template.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setPreviewTemplate(template)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => setEditModal({ open: true, template })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteConfirm(template)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="font-black text-slate-800 text-sm font-mono mb-0.5 truncate">{template.name}</h3>
                <p className="text-[11px] text-slate-400 font-medium mb-3">{template.language}</p>

                {template.header_type !== 'none' && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-2">
                    {headerIcon(template.header_type)}
                    <span>هيدر: {template.header_type}</span>
                  </div>
                )}

                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 flex-1 whitespace-pre-wrap">
                  {template.body_text}
                </p>

                {template.footer_text && (
                  <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-50 truncate">
                    {template.footer_text}
                  </p>
                )}

                {template.variables_count > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                    <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-black">
                      {template.variables_count}
                    </span>
                    متغير {'{{1}}'}
                  </div>
                )}

                {template.buttons && template.buttons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {template.buttons.map((btn, i) => (
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

      <AnimatePresence>
        {editModal.open && (
          <TemplateFormModal
            template={editModal.template}
            onClose={() => setEditModal({ open: false, template: null })}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['templates'] });
              setEditModal({ open: false, template: null });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewTemplate && (
          <TemplatePreviewModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            >
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={26} className="text-rose-500" />
              </div>
              <h3 className="font-black text-slate-800 mb-1">حذف القالب</h3>
              <p className="text-sm text-slate-500 mb-5">
                هل أنت متأكد من حذف القالب <span className="font-mono font-bold text-slate-700">"{deleteConfirm.name}"</span>؟
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">
                  إلغاء
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 h-11 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {deleteMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  حذف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TemplateFormModal = ({ template, onClose, onSaved }) => {
  const isEdit = !!template;

  const [form, setForm] = useState(() => template ? {
    name:           template.name,
    language:       template.language,
    category:       template.category,
    status:         template.status,
    header_type:    template.header_type === 'text' ? 'text' : 'none',
    header_content: template.header_content ?? '',
    body_text:      template.body_text,
    footer_text:    template.footer_text ?? '',
  } : { ...EMPTY_FORM });

  const varsCount = countVars(form.body_text);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.put(`/templates/${template.id}`, payload)
        : api.post('/templates', payload),
    onSuccess: () => {
      toast.success(isEdit ? 'تم تحديث القالب.' : 'تم إنشاء القالب بنجاح.');
      onSaved();
    },
    onError: (e) => {
      const errs = e?.response?.data?.errors;
      if (errs) {
        const first = Object.values(errs)[0];
        toast.error(first[0]);
      } else {
        toast.error(e?.response?.data?.message || 'حدث خطأ.');
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name:        form.name.trim(),
      language:    form.language,
      category:    form.category,
      status:      form.status,
      header_type: form.header_type,
      body_text:   form.body_text.trim(),
      footer_text: form.footer_text.trim() || null,
    };
    if (form.header_type === 'text') {
      payload.header_content = form.header_content.trim() || null;
    } else {
      payload.header_content = null;
    }
    saveMutation.mutate(payload);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 560, maxHeight: '92vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-black text-slate-800 text-lg">
            {isEdit ? 'تعديل القالب' : 'إنشاء قالب جديد'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form id="template-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">
              اسم القالب <span className="text-rose-500">*</span>
              <span className="font-normal text-slate-400 mr-1">(أحرف إنجليزية صغيرة، أرقام، شرطة سفلية فقط)</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={form.name}
              onChange={e => set('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="my_template_name"
              required
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">اللغة <span className="text-rose-500">*</span></label>
              <select value={form.language} onChange={e => set('language', e.target.value)} required
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">النوع <span className="text-rose-500">*</span></label>
              <select value={form.category} onChange={e => set('category', e.target.value)} required
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                <option value="marketing">تسويقي</option>
                <option value="utility">خدمي</option>
                <option value="authentication">مصادقة</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">الحالة</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                <option value="approved">معتمد</option>
                <option value="pending">قيد المراجعة</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">الهيدر (اختياري)</label>
            <div className="flex gap-2 mb-2">
              {['none', 'text'].map(t => (
                <button key={t} type="button"
                  onClick={() => set('header_type', t)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-bold transition-all border',
                    form.header_type === t
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300',
                  )}>
                  {t === 'none' ? 'بدون' : 'نص'}
                </button>
              ))}
            </div>
            {form.header_type === 'text' && (
              <input
                type="text"
                value={form.header_content}
                onChange={e => set('header_content', e.target.value)}
                placeholder="نص الهيدر..."
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-600">
                نص الرسالة <span className="text-rose-500">*</span>
              </label>
              {varsCount > 0 && (
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {varsCount} متغير محدد
                </span>
              )}
            </div>
            <textarea
              value={form.body_text}
              onChange={e => set('body_text', e.target.value)}
              rows={5}
              required
              placeholder={'مرحباً {{1}}،\nنشكرك على تواصلك معنا.\n\nيمكنك استخدام {{1}} {{2}} ... للمتغيرات القابلة للتخصيص.'}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none leading-relaxed"
            />
            <div className="flex items-start gap-1.5 mt-1.5">
              <Info size={11} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                استخدم {`{{1}}`} {`{{2}}`} ... لإضافة متغيرات قابلة للتخصيص عند الإرسال.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">نص الفوتر (اختياري)</label>
            <input
              type="text"
              value={form.footer_text}
              onChange={e => set('footer_text', e.target.value)}
              placeholder="مثلاً: للإلغاء أرسل STOP"
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {form.body_text && (
            <div>
              <p className="text-xs font-black text-slate-500 mb-2">معاينة</p>
              <div className="bg-[#ECE5DD] rounded-xl p-3">
                <div className="bg-white rounded-xl px-4 py-3 shadow-sm max-w-xs">
                  {form.header_type === 'text' && form.header_content && (
                    <p className="font-black text-slate-800 text-sm mb-2">{form.header_content}</p>
                  )}
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{form.body_text}</p>
                  {form.footer_text && (
                    <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">{form.footer_text}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">
            إلغاء
          </button>
          <button
            type="submit"
            form="template-form"
            disabled={saveMutation.isPending}
            className="flex-1 h-11 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saveMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isEdit ? 'حفظ التعديلات' : 'إنشاء القالب'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const TemplatePreviewModal = ({ template, onClose }) => {
  const categoryLabels = {
    marketing:      'تسويقي',
    utility:        'خدمي',
    authentication: 'مصادقة',
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-black text-slate-800">معاينة القالب</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold font-mono">{template.name}</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{template.language}</span>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">{categoryLabels[template.category]}</span>
          </div>

          <div className="bg-[#ECE5DD] rounded-2xl p-4">
            <div className="bg-white rounded-xl p-4 max-w-sm shadow-sm">
              {template.header_type === 'text' && template.header_content && (
                <p className="font-black text-slate-800 text-sm mb-2">{template.header_content}</p>
              )}
              {template.header_type === 'image' && (
                <div className="w-full h-28 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                  <Image size={22} className="text-slate-300" />
                  <span className="text-xs text-slate-400 mr-2">صورة</span>
                </div>
              )}
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{template.body_text}</p>
              {template.footer_text && (
                <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">{template.footer_text}</p>
              )}
              {template.buttons && template.buttons.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {template.buttons.map((btn, i) => (
                    <button key={i} className="w-full py-2 text-center text-sm font-bold text-indigo-600 border border-indigo-100 rounded-lg">
                      {btn.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {template.variables_count > 0 && (
            <p className="mt-3 text-xs text-slate-500 text-center font-medium">
              هذا القالب يحتوي على {template.variables_count} متغير قابل للتخصيص
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TemplatesPage;
