import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';

const DeleteAllContactsModal = ({ open, onClose, onConfirm, total, isPending }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={28} className="text-rose-600" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">مسح جميع جهات الاتصال؟</h2>
        <p className="text-slate-500 text-sm font-medium mb-1">
          سيتم حذف <span className="font-black text-rose-600">{total?.toLocaleString() ?? ''}</span> جهة اتصال بشكل نهائي.
        </p>
        <p className="text-slate-400 text-xs mb-8">هذا الإجراء لا يمكن التراجع عنه.</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isPending} className="flex-1 h-11 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm transition-all">
            إلغاء
          </button>
          <button onClick={onConfirm} disabled={isPending} className="flex-1 h-11 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {isPending && <Loader2 size={16} className="animate-spin" />}
            مسح الكل
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAllContactsModal;
