import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { whatsappNumbers as whatsappNumbersApi } from '../../../api';
import { useModalA11y } from '../../../hooks/useModalA11y';

/** Pass the WhatsApp number being connected (or null to close). */
const BaileysQrModal = ({ number, onClose }) => {
  const open = !!number;
  const ref = useModalA11y(open, onClose);

  const { data: statusData } = useQuery({
    queryKey: ['whatsapp-number-status', number?.id],
    queryFn: () => whatsappNumbersApi.getWhatsappNumberStatus(number.id),
    enabled: open,
    refetchInterval: open ? 3000 : false,
  });
  const isConnected = !!statusData?.session_status?.connected;

  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['whatsapp-number-qr', number?.id],
    queryFn: () => whatsappNumbersApi.getWhatsappNumberQr(number.id),
    enabled: open && !isConnected,
    // Baileys QR codes expire after ~20s — keep pulling a fresh one until connected.
    refetchInterval: open && !isConnected ? 20000 : false,
  });

  useEffect(() => {
    if (!isConnected) return undefined;
    toast.success('تم ربط الرقم بنجاح!');
    const timer = setTimeout(onClose, 1500);

    return () => clearTimeout(timer);
  }, [isConnected, onClose]);

  const qrValue = qrData?.qr;

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
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">ربط {number?.name}</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="p-8 flex flex-col items-center gap-4">
              {isConnected ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <p className="font-bold text-slate-700">تم الربط بنجاح!</p>
                </>
              ) : qrLoading || !qrValue ? (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
              ) : qrValue.startsWith('data:image') ? (
                <img src={qrValue} alt="QR" className="w-64 h-64 rounded-xl border border-slate-100" />
              ) : (
                <div className="p-3 bg-white rounded-xl border border-slate-100">
                  <QRCodeSVG value={qrValue} size={240} />
                </div>
              )}

              {!isConnected && (
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  افتح واتساب على هاتفك ← الأجهزة المرتبطة ← ربط جهاز، ثم مسح الرمز.
                  <br />
                  يتحدّث الرمز تلقائياً كل 20 ثانية.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BaileysQrModal;
