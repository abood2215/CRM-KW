import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { templates as templatesApi } from '../../../api';
import { useModalA11y } from '../../../hooks/useModalA11y';

// Meta's accepted header media formats per header_type — mirrors the backend's per-type rules.
const HEADER_MEDIA_ACCEPT = { image: 'image/jpeg,image/png,image/webp', video: 'video/mp4,video/3gpp', document: 'application/pdf' };
const HEADER_MEDIA_LABEL = { image: 'صورة', video: 'فيديو', document: 'ملف PDF' };

const TemplatePicker = ({ open, onClose, onSend }) => {
  const ref = useModalA11y(open, onClose);
  const [selected, setSelected] = useState(null);
  const [variables, setVariables] = useState([]);
  const [headerFile, setHeaderFile] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', 'approved'],
    queryFn: () => templatesApi.getTemplates({ status: 'approved' }),
    enabled: open,
  });

  const handlePick = (template) => {
    setSelected(template);
    setVariables(Array(template.variables_count).fill(''));
    setHeaderFile(null);
  };

  const handleSend = () => {
    onSend({ templateId: selected.id, variables, headerFile });
    setSelected(null);
    setVariables([]);
    setHeaderFile(null);
    onClose();
  };

  const needsHeaderMedia = !!selected && !!HEADER_MEDIA_ACCEPT[selected.header_type];
  // A media-header template can't be sent without a file: either one attached here, or the
  // template's stored default (header_content) uploaded by an admin on the templates page.
  const missingHeaderMedia = needsHeaderMedia && !headerFile && !selected.header_content;

  const preview = selected
    ? variables.reduce((body, v, i) => body.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`), selected.body_text)
    : '';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div ref={ref} role="dialog" aria-modal="true" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">{selected ? selected.name : 'اختر قالب'}</h2>
              <button onClick={() => { setSelected(null); onClose(); }} title="إغلاق" aria-label="إغلاق" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!selected ? (
                isLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-600" size={24} /></div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <FileText size={32} className="text-slate-100 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm font-bold">لا توجد قوالب معتمدة</p>
                    <p className="text-slate-400 text-xs mt-1">أضف قالباً من صفحة "القوالب" وانتظر اعتماده من Meta لاستخدامه هنا.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((t) => (
                      <button key={t.id} onClick={() => handlePick(t)} className="w-full text-right p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
                        <p className="font-bold text-sm text-slate-800">{t.name}</p>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{t.body_text}</p>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {needsHeaderMedia && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">
                        هذا القالب يتطلب {HEADER_MEDIA_LABEL[selected.header_type]} في الهيدر
                        {selected.header_content && !headerFile ? ' — سيتم استخدام الملف المحفوظ للقالب ما لم ترفق غيره' : ''}
                      </label>
                      <input
                        type="file"
                        accept={HEADER_MEDIA_ACCEPT[selected.header_type]}
                        onChange={(e) => setHeaderFile(e.target.files[0] ?? null)}
                        className="w-full text-sm text-slate-600 file:ml-3 file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-600 file:text-xs file:font-bold file:cursor-pointer"
                      />
                      {missingHeaderMedia && (
                        <p className="text-xs text-amber-600 font-medium">لا يوجد ملف محفوظ لهذا القالب — أرفق الملف لتتمكن من الإرسال.</p>
                      )}
                    </div>
                  )}
                  {variables.map((v, i) => (
                    <input
                      key={i}
                      placeholder={`متغير {{${i + 1}}}`}
                      value={v}
                      onChange={(e) => setVariables((vars) => vars.map((x, idx) => (idx === i ? e.target.value : x)))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  ))}
                  <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 whitespace-pre-wrap">{preview}</div>
                </div>
              )}
            </div>

            {selected && (
              <div className="p-6 pt-0 flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl">رجوع</button>
                <button onClick={handleSend} disabled={missingHeaderMedia} className="flex-1 h-11 bg-teal-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">إرسال</button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TemplatePicker;
