import React from 'react';
import toast from 'react-hot-toast';

/**
 * Delays the actual destructive call behind a toast with a "تراجع" button — nothing
 * hits the API until the window elapses, so undo is a real cancel, not a compensating
 * re-create. Replaces a plain confirm() dialog: faster for the common case (no popup
 * to click through), with a real safety net for the rare mis-click.
 */
export function runWithUndo({ message, delayMs = 5000, onConfirm, onUndo }) {
  let settled = false;

  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      onConfirm();
    }
  }, delayMs);

  const toastId = toast.custom(
    (t) => (
      <div className="bg-slate-800 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-4 text-sm font-bold" style={{ opacity: t.visible ? 1 : 0 }}>
        <span>{message}</span>
        <button
          onClick={() => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            onUndo?.();
            toast.dismiss(t.id);
          }}
          className="text-teal-300 hover:text-teal-200 flex-shrink-0"
        >
          تراجع
        </button>
      </div>
    ),
    { duration: delayMs }
  );

  return () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    toast.dismiss(toastId);
  };
}
