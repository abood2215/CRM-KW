import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { templates as templatesApi, whatsappNumbers as whatsappNumbersApi } from '../../../api';
import { useModalA11y } from '../../../hooks/useModalA11y';
import TemplateBubblePreview from './TemplateBubblePreview';

const MAX_BUTTONS = 3;

const emptyForm = {
  whatsapp_number_id: '',
  name: '',
  language: 'ar',
  category: 'marketing',
  header_type: 'none',
  header_content: '',
  body_text: '',
  footer_text: '',
  buttons: [],
  examples: [],
};

const TemplateFormModal = ({ open, onClose, template, cloneFrom }) => {
  const queryClient = useQueryClient();
  const ref = useModalA11y(open, onClose);
  const [form, setForm] = useState(emptyForm);
  const isEdit = !!template;

  const { data: numbers = [] } = useQuery({
    queryKey: ['whatsapp-numbers-select'],
    queryFn: whatsappNumbersApi.getWhatsappNumbers,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;

    // Editing an existing template keeps its name; cloning one starts from a blank name
    // (the "name_copy" would just collide-and-retry) but copies everything else as a
    // starting point — same for a fresh template, source is just `emptyForm`.
    const source = template ?? cloneFrom;
    setForm(source ? {
      whatsapp_number_id: source.whatsapp_number_id,
      name: template ? source.name : '',
      language: source.language,
      category: source.category,
      header_type: source.header_type,
      header_content: source.header_content ?? '',
      body_text: source.body_text,
      footer_text: source.footer_text ?? '',
      buttons: (source.buttons ?? []).map((b) => (typeof b === 'string' ? b : b.text ?? '')),
      examples: [],
    } : emptyForm);
  }, [open, template, cloneFrom]);

  const mutation = useMutation({
    mutationFn: () => (isEdit ? templatesApi.updateTemplate(template.id, form) : templatesApi.createTemplate(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(isEdit ? 'تم تحديث القالب' : 'تم إنشاء القالب');
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشلت العملية'),
  });

  const variablesCount = (form.body_text.match(/\{\{\d+\}\}/g) ?? []).length;
  const selectedNumber = numbers.find((n) => String(n.id) === String(form.whatsapp_number_id));
  const isCloudSelected = selectedNumber?.api_type === 'cloud';

  const setButton = (index, value) => setForm((f) => {
    const buttons = [...f.buttons];
    buttons[index] = value;
    return { ...f, buttons };
  });
  const removeButton = (index) => setForm((f) => ({ ...f, buttons: f.buttons.filter((_, i) => i !== index) }));
  const setExample = (index, value) => setForm((f) => {
    const examples = [...f.examples];
    examples[index] = value;
    return { ...f, examples };
  });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div ref={ref} role="dialog" aria-modal="true" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-black text-slate-800">{isEdit ? 'تعديل القالب' : 'قالب جديد'}</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="flex flex-col lg:flex-row overflow-hidden flex-1 min-h-0">
            <form
              onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
              className="p-6 space-y-4 overflow-y-auto flex-1 min-w-0"
            >
              {!isEdit && (
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">رقم واتساب *</label>
                  <select required value={form.whatsapp_number_id} onChange={(e) => setForm((f) => ({ ...f, whatsapp_number_id: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="">اختر رقم</option>
                    {numbers.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">اسم القالب * (حروف صغيرة وأرقام و _ فقط)</label>
                <input required pattern="^[a-z0-9_]+$" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="welcome_offer" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">اللغة</label>
                  <input value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">الفئة</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="marketing">تسويقي</option>
                    <option value="utility">خدمي</option>
                    <option value="authentication">توثيق</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">ترويسة (اختياري)</label>
                <div className="grid grid-cols-2 gap-4">
                  <select value={form.header_type} onChange={(e) => setForm((f) => ({ ...f, header_type: e.target.value, header_content: e.target.value === 'none' ? '' : f.header_content }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="none">بدون ترويسة</option>
                    <option value="text">نص</option>
                  </select>
                  {form.header_type === 'text' && (
                    <input value={form.header_content} onChange={(e) => setForm((f) => ({ ...f, header_content: e.target.value }))}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="نص الترويسة" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">نص القالب * — استخدم {'{{1}}'} {'{{2}}'} للمتغيرات</label>
                <textarea required rows={4} value={form.body_text} onChange={(e) => setForm((f) => ({ ...f, body_text: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" placeholder="مرحباً {{1}}، ..." />
                <p className="text-[11px] text-slate-400 mt-1">{variablesCount} متغير</p>
              </div>

              {!isEdit && variablesCount > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-600">
                    قيم مثال للمتغيرات {isCloudSelected && '* (تطلبها ميتا لمراجعة القالب)'}
                  </label>
                  {Array.from({ length: variablesCount }).map((_, i) => (
                    <input
                      key={i}
                      required={isCloudSelected}
                      value={form.examples[i] ?? ''}
                      onChange={(e) => setExample(i, e.target.value)}
                      placeholder={`مثال للمتغير {{${i + 1}}}`}
                      className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">نص التذييل (اختياري)</label>
                <input value={form.footer_text} onChange={(e) => setForm((f) => ({ ...f, footer_text: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-600">أزرار ردّ سريع (اختياري، حتى {MAX_BUTTONS})</label>
                  {form.buttons.length < MAX_BUTTONS && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, buttons: [...f.buttons, ''] }))} className="text-indigo-600 hover:text-indigo-700">
                      <Plus size={16} />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {form.buttons.map((label, i) => (
                    <div key={i} className="flex gap-2">
                      <input required maxLength={25} value={label} onChange={(e) => setButton(i, e.target.value)}
                        className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="مثال: تواصل معنا" />
                      <button type="button" onClick={() => removeButton(i)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl">إلغاء</button>
                <button type="submit" disabled={mutation.isPending} className="flex-1 h-11 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  {isEdit ? 'حفظ' : 'إنشاء'}
                </button>
              </div>
            </form>

            <div className="lg:w-72 flex-shrink-0 border-t lg:border-t-0 lg:border-r border-slate-100 p-6 overflow-y-auto bg-slate-50/50">
              <p className="text-xs font-black text-slate-500 mb-3">معاينة حية</p>
              <TemplateBubblePreview
                headerType={form.header_type}
                headerContent={form.header_content}
                bodyText={form.body_text}
                footerText={form.footer_text}
                buttons={form.buttons}
                examples={form.examples}
              />
            </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TemplateFormModal;
