import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

const ConfirmDialog = ({ open, title = 'تأكيد', message, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', danger = true, isPending = false, onConfirm, onCancel }) => {
  const ref = useModalA11y(open, onCancel);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-rose-100' : 'bg-indigo-100'}`}>
              <AlertTriangle size={28} className={danger ? 'text-rose-600' : 'text-indigo-600'} />
            </div>
            <h2 id="confirm-dialog-title" className="text-xl font-black text-slate-800 mb-2">{title}</h2>
            <p className="text-slate-500 text-sm font-medium mb-8">{message}</p>
            <div className="flex gap-3">
              <button onClick={onCancel} disabled={isPending} className="flex-1 h-11 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm transition-all">
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={isPending}
                className={`flex-1 h-11 rounded-xl font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-white ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {isPending && <Loader2 size={16} className="animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
