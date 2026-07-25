import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNewConversationForm } from '../hooks/useNewConversationForm';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { templates as templatesApi, whatsappNumbers as whatsappNumbersApi } from '../../../api';

// Meta's accepted header media formats per header_type — mirrors the backend's per-type rules.
const HEADER_MEDIA_ACCEPT = { image: 'image/jpeg,image/png,image/webp', video: 'video/mp4,video/3gpp', document: 'application/pdf' };
const HEADER_MEDIA_LABEL = { image: 'صورة', video: 'فيديو', document: 'ملف PDF' };

const NewConversationModal = ({ open, onClose, onCreated }) => {
  const ref = useModalA11y(open, onClose);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const { form, setForm, submit, isSubmitting } = useNewConversationForm((conversation) => {
    onCreated(conversation);
    onClose();
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates', 'approved'],
    queryFn: () => templatesApi.getTemplates({ status: 'approved' }),
    enabled: open && useTemplate,
  });

  const { data: whatsappNumbers = [] } = useQuery({
    queryKey: ['whatsapp-numbers'],
    queryFn: whatsappNumbersApi.getWhatsappNumbers,
    enabled: open,
  });
  const connectedNumbers = whatsappNumbers.filter((n) => n.api_type === 'cloud' && n.status === 'connected');
  // Only worth a picker once there's an actual choice — a single connected number (the
  // common case) just uses the backend's existing auto-pick with no extra UI.
  const showNumberPicker = connectedNumbers.length > 1;

  const visibleTemplates = templates.filter(
    (t) => !form.whatsapp_number_id || t.whatsapp_number_id === Number(form.whatsapp_number_id)
  );

  const toggleTemplateMode = (on) => {
    setUseTemplate(on);
    setSelectedTemplate(null);
    setForm((f) => ({ ...f, message: '', template_name: '', template_language: '', variables: [], header_media: null }));
  };

  const pickTemplate = (template) => {
    setSelectedTemplate(template);
    const variables = Array(template.variables_count || 0).fill('');
    setForm((f) => ({ ...f, template_name: template.name, template_language: template.language, variables, message: template.body_text, header_media: null }));
  };

  const needsHeaderMedia = !!selectedTemplate && !!HEADER_MEDIA_ACCEPT[selectedTemplate.header_type];
  // A media-header template can't be sent without a file: either one attached here, or the
  // template's stored default (header_content) uploaded by an admin on the templates page.
  const missingHeaderMedia = needsHeaderMedia && !form.header_media && !selectedTemplate.header_content;

  const setVariable = (index, value) => {
    setForm((f) => {
      const variables = f.variables.map((v, i) => (i === index ? value : v));
      const message = variables.reduce((body, v, i) => body.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`), selectedTemplate.body_text);
      return { ...f, variables, message };
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div ref={ref} role="dialog" aria-modal="true" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">محادثة جديدة</h2>
              <button onClick={onClose} title="إغلاق" aria-label="إغلاق" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              <input
                required placeholder="رقم الهاتف (9xxxxxxx)"
                value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
              <input
                placeholder="الاسم (اختياري)"
                value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
              <div className="flex items-start gap-2 bg-teal-50 text-teal-700 text-xs font-medium p-3 rounded-xl">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <span>لو هذا الرقم لم يتواصل معك من قبل، واتساب لا يسمح برسالة نصية حرة — استخدم قالباً معتمداً بدلاً من ذلك.</span>
              </div>

              {showNumberPicker && (
                <select
                  value={form.whatsapp_number_id}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp_number_id: e.target.value, template_name: '', template_language: '' }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="">أرسل من أي رقم متصل</option>
                  {connectedNumbers.map((n) => (
                    <option key={n.id} value={n.id}>{n.name} ({n.phone})</option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={useTemplate} onChange={(e) => toggleTemplateMode(e.target.checked)} />
                <span className="text-sm font-bold text-slate-700">استخدام قالب (لرقم جديد)</span>
              </label>

              {useTemplate ? (
                !selectedTemplate ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {visibleTemplates.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">لا توجد قوالب معتمدة</p>
                    ) : (
                      visibleTemplates.map((t) => (
                        <button
                          key={t.id} type="button" onClick={() => pickTemplate(t)}
                          className="w-full text-right p-2.5 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors"
                        >
                          <p className="font-bold text-xs text-slate-800">{t.name}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{t.body_text}</p>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button type="button" onClick={() => setSelectedTemplate(null)} className="text-xs font-bold text-teal-600">‹ اختيار قالب آخر</button>
                    {needsHeaderMedia && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600">
                          هذا القالب يتطلب {HEADER_MEDIA_LABEL[selectedTemplate.header_type]} في الهيدر
                          {selectedTemplate.header_content && !form.header_media ? ' — سيتم استخدام الملف المحفوظ للقالب ما لم ترفق غيره' : ''}
                        </label>
                        <input
                          type="file"
                          accept={HEADER_MEDIA_ACCEPT[selectedTemplate.header_type]}
                          onChange={(e) => setForm((f) => ({ ...f, header_media: e.target.files[0] ?? null }))}
                          className="w-full text-sm text-slate-600 file:ml-3 file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-600 file:text-xs file:font-bold file:cursor-pointer"
                        />
                        {missingHeaderMedia && (
                          <p className="text-xs text-amber-600 font-medium">لا يوجد ملف محفوظ لهذا القالب — أرفق الملف لتتمكن من الإرسال.</p>
                        )}
                      </div>
                    )}
                    {form.variables.map((v, i) => (
                      <input
                        key={i} placeholder={`متغير {{${i + 1}}}`} value={v}
                        onChange={(e) => setVariable(i, e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      />
                    ))}
                    <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 whitespace-pre-wrap">{form.message}</div>
                  </div>
                )
              ) : (
                <textarea
                  required rows={3} placeholder="نص الرسالة"
                  value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"
                />
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl">إلغاء</button>
                <button type="submit" disabled={isSubmitting || missingHeaderMedia} className="flex-1 h-11 bg-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  بدء المحادثة
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NewConversationModal;
