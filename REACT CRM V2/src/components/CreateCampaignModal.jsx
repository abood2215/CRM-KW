import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Image as ImageIcon, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { campaigns as campaignsApi, contacts as contactsApi, contactLists as contactListsApi, whatsappNumbers as whatsappNumbersApi, templates as templatesApi } from '../api';
import { useModalA11y } from '../hooks/useModalA11y';

const emptyForm = {
  name: '',
  whatsapp_number_id: '',
  contact_list_id: '',
  template_name: '',
  template_language: '',
  image_path: '',
  delay_seconds: 30,
};

const emptySegment = {
  pipeline_stages: [],
  sources: [],
  tags: '',
  last_contacted_before: '',
  last_contacted_after: '',
};

const PIPELINE_STAGES = [
  { id: 'new', label: 'جديد' },
  { id: 'contacted', label: 'تم التواصل' },
  { id: 'interested', label: 'مهتم' },
  { id: 'booked', label: 'محجوز' },
  { id: 'active', label: 'نشط' },
  { id: 'following', label: 'متابعة' },
];

const SOURCES = [
  { id: 'whatsapp', label: 'واتساب' },
  { id: 'instagram', label: 'انستغرام' },
  { id: 'referral', label: 'إحالة' },
  { id: 'google', label: 'جوجل' },
];

const CreateCampaignModal = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const ref = useModalA11y(open, onClose);
  const [form, setForm] = useState(emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [targetMode, setTargetMode] = useState('list'); // 'list' | 'segment'
  const [segment, setSegment] = useState(emptySegment);

  const segmentPayload = useMemo(() => {
    const tags = segment.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = {
      pipeline_stages: segment.pipeline_stages,
      sources: segment.sources,
      tags,
      last_contacted_before: segment.last_contacted_before || undefined,
      last_contacted_after: segment.last_contacted_after || undefined,
    };
    const hasAnyFilter = payload.pipeline_stages.length || payload.sources.length || tags.length
      || payload.last_contacted_before || payload.last_contacted_after;

    return hasAnyFilter ? payload : null;
  }, [segment]);

  const { data: segmentCount, isFetching: isCountingSegment } = useQuery({
    queryKey: ['segment-count', segmentPayload],
    queryFn: () => contactsApi.getSegmentCount(segmentPayload),
    enabled: open && targetMode === 'segment' && !!segmentPayload,
  });

  const toggleInArray = (key, value) => setSegment((s) => ({
    ...s,
    [key]: s[key].includes(value) ? s[key].filter((v) => v !== value) : [...s[key], value],
  }));

  const { data: numbers = [] } = useQuery({
    queryKey: ['whatsapp-numbers-select'],
    queryFn: whatsappNumbersApi.getWhatsappNumbers,
    enabled: open,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['contact-lists-select'],
    queryFn: contactListsApi.getContactLists,
    enabled: open,
  });

  const { data: allTemplates = [] } = useQuery({
    queryKey: ['templates-select'],
    queryFn: () => templatesApi.getTemplates(),
    enabled: open,
  });

  const availableTemplates = useMemo(
    () => allTemplates.filter((t) => !form.whatsapp_number_id || t.whatsapp_number_id === Number(form.whatsapp_number_id)),
    [allTemplates, form.whatsapp_number_id]
  );

  const selectedTemplate = useMemo(
    () => availableTemplates.find((t) => t.name === form.template_name),
    [availableTemplates, form.template_name]
  );
  const needsImage = selectedTemplate?.header_type === 'image';

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await campaignsApi.uploadCampaignImage(file);
      setForm((f) => ({ ...f, image_path: res.url }));
    } catch {
      toast.error('فشل رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const mutation = useMutation({
    mutationFn: (data) =>
      campaignsApi.createCampaign({
        ...data,
        whatsapp_number_id: data.whatsapp_number_id ? Number(data.whatsapp_number_id) : undefined,
        contact_list_id: data.contact_list_id ? Number(data.contact_list_id) : undefined,
        delay_seconds: Number(data.delay_seconds),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(res.skipped_message ?? 'تم إنشاء الحملة بنجاح');
      onClose();
      setForm(emptyForm);
      setSegment(emptySegment);
      setTargetMode('list');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إنشاء الحملة'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('اسم الحملة مطلوب');
    if (targetMode === 'list' && !form.contact_list_id) return toast.error('اختر قائمة جهات اتصال');
    if (targetMode === 'segment' && !segmentPayload) return toast.error('حدّد معيار استهداف واحد على الأقل');
    if (!form.template_name) return toast.error('اختر قالب رسالة');
    if (needsImage && !form.image_path) return toast.error('هذا القالب يتطلب صورة بالرأس — ارفع صورة أولاً');

    mutation.mutate({
      ...form,
      contact_list_id: targetMode === 'list' ? form.contact_list_id : '',
      segment_filters: targetMode === 'segment' ? segmentPayload : undefined,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl relative max-h-[85vh] flex flex-col"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-black text-slate-800">حملة جديدة</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">اسم الحملة *</label>
                <input
                  type="text" required
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="مثال: عرض نهاية الأسبوع"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">رقم الإرسال *</label>
                <select
                  required value={form.whatsapp_number_id}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp_number_id: e.target.value, template_name: '', template_language: '' }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">اختر رقم واتساب</option>
                  {numbers.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.phone})</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-600">الجمهور المستهدف *</label>
                  <div className="flex gap-1 bg-slate-50 rounded-lg p-0.5">
                    <button type="button" onClick={() => setTargetMode('list')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${targetMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>
                      قائمة تواصل
                    </button>
                    <button type="button" onClick={() => setTargetMode('segment')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${targetMode === 'segment' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>
                      معايير ذكية
                    </button>
                  </div>
                </div>

                {targetMode === 'list' ? (
                  <select
                    required value={form.contact_list_id}
                    onChange={(e) => setForm((f) => ({ ...f, contact_list_id: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">اختر قائمة</option>
                    {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.count})</option>)}
                  </select>
                ) : (
                  <div className="space-y-3 bg-slate-50/70 border border-slate-100 rounded-xl p-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 mb-1.5">مرحلة المسار</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PIPELINE_STAGES.map((s) => (
                          <button key={s.id} type="button" onClick={() => toggleInArray('pipeline_stages', s.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${segment.pipeline_stages.includes(s.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-slate-500 mb-1.5">المصدر</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SOURCES.map((s) => (
                          <button key={s.id} type="button" onClick={() => toggleInArray('sources', s.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${segment.sources.includes(s.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-slate-500 mb-1.5">الوسوم (افصل بفاصلة)</p>
                      <input
                        value={segment.tags}
                        onChange={(e) => setSegment((s) => ({ ...s, tags: e.target.value }))}
                        placeholder="مثال: كبار السن, دورة صيفية"
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">لم يُتواصل معه منذ</p>
                        <input
                          type="date"
                          value={segment.last_contacted_before}
                          onChange={(e) => setSegment((s) => ({ ...s, last_contacted_before: e.target.value }))}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">تواصل معه بعد</p>
                        <input
                          type="date"
                          value={segment.last_contacted_after}
                          onChange={(e) => setSegment((s) => ({ ...s, last_contacted_after: e.target.value }))}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
                      <Users size={13} />
                      {!segmentPayload ? 'حدّد معياراً واحداً على الأقل' : isCountingSegment ? 'جارِ الحساب...' : `${segmentCount ?? 0} جهة اتصال مطابقة`}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">القالب *</label>
                <select
                  required value={form.template_name}
                  onChange={(e) => {
                    const selected = availableTemplates.find((t) => t.name === e.target.value);
                    setForm((f) => ({ ...f, template_name: e.target.value, template_language: selected?.language ?? '', image_path: '' }));
                  }}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">اختر قالب</option>
                  {availableTemplates.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              {needsImage && (
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">صورة القالب * (هذا القالب يتطلب صورة بالرأس)</label>
                  {form.image_path ? (
                    <div className="flex items-center gap-3">
                      <img src={form.image_path} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, image_path: '' }))} className="text-xs font-bold text-rose-600 hover:underline">
                        إزالة الصورة
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 h-11 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 cursor-pointer hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                      {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                      {uploadingImage ? 'جارِ الرفع...' : 'اختر صورة'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploadingImage} />
                    </label>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">التأخير بين الرسائل (ثانية)</label>
                <input
                  type="number" min="1" max="3600"
                  value={form.delay_seconds} onChange={(e) => setForm((f) => ({ ...f, delay_seconds: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                  إلغاء
                </button>
                <button type="submit" disabled={mutation.isPending || uploadingImage} className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                  {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
                  إنشاء الحملة
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateCampaignModal;
