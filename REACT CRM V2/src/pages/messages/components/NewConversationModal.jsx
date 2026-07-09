import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNewConversationForm } from '../hooks/useNewConversationForm';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { templates as templatesApi } from '../../../api';

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

  const toggleTemplateMode = (on) => {
    setUseTemplate(on);
    setSelectedTemplate(null);
    setForm((f) => ({ ...f, message: '', template_name: '', template_language: '', variables: [] }));
  };

  const pickTemplate = (template) => {
    setSelectedTemplate(template);
    const variables = Array(template.variables_count || 0).fill('');
    setForm((f) => ({ ...f, template_name: template.name, template_language: template.language, variables, message: template.body_text }));
  };

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
              <div className="flex items-start gap-2 bg-indigo-50 text-indigo-700 text-xs font-medium p-3 rounded-xl">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <span>لو هذا الرقم لم يتواصل معك من قبل، واتساب لا يسمح برسالة نصية حرة — استخدم قالباً معتمداً بدلاً من ذلك.</span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={useTemplate} onChange={(e) => toggleTemplateMode(e.target.checked)} />
                <span className="text-sm font-bold text-slate-700">استخدام قالب (لرقم جديد)</span>
              </label>

              {useTemplate ? (
                !selectedTemplate ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {templates.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">لا توجد قوالب معتمدة</p>
                    ) : (
                      templates.map((t) => (
                        <button
                          key={t.id} type="button" onClick={() => pickTemplate(t)}
                          className="w-full text-right p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                        >
                          <p className="font-bold text-xs text-slate-800">{t.name}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{t.body_text}</p>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button type="button" onClick={() => setSelectedTemplate(null)} className="text-xs font-bold text-indigo-600">‹ اختيار قالب آخر</button>
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
                <button type="submit" disabled={isSubmitting} className="flex-1 h-11 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
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
