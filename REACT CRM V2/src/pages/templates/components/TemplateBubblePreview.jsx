import React from 'react';
import { ChevronLeft } from 'lucide-react';

/** Renders a template exactly like it'll appear as a real WhatsApp message — a live
 * preview beats staring at raw `{{1}}` placeholders while writing a template. */
const TemplateBubblePreview = ({ headerType, headerContent, bodyText, footerText, buttons, examples = [] }) => {
  const renderedBody = (bodyText || '').replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const example = examples[Number(n) - 1];
    return example?.trim() ? example : `[مثال ${n}]`;
  });

  return (
    <div className="rounded-2xl p-4 bg-[#efe9df]">
      <div className="max-w-[280px] mr-auto">
        <div className="bg-white rounded-2xl rounded-br-sm shadow-sm overflow-hidden">
          {headerType === 'image' && headerContent && (
            <img src={headerContent} alt="" className="w-full h-36 object-cover" />
          )}
          <div className="px-3.5 pt-3 pb-2.5">
            {headerType === 'text' && headerContent && (
              <p className="font-black text-sm text-slate-800 mb-1">{headerContent}</p>
            )}
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {renderedBody || <span className="text-slate-300">سيظهر نص القالب هنا...</span>}
            </p>
            {footerText && <p className="text-[12px] text-slate-400 mt-1.5">{footerText}</p>}
            <p className="text-[10px] text-slate-300 text-left mt-1.5">{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          {buttons?.length > 0 && (
            <div className="border-t border-slate-100">
              {buttons.map((label, i) => (
                <div key={i} className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-sky-600 border-t border-slate-100 first:border-t-0">
                  <ChevronLeft size={13} />
                  {label || `زر ${i + 1}`}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateBubblePreview;
