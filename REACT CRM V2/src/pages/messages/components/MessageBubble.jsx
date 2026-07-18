import React from 'react';
import { Check, CheckCheck, AlertCircle, Clock, Lock, FileText, Download, Heart } from 'lucide-react';
import { cn } from '../../../utils/cn';

const STATUS_META = {
  pending: { icon: <Clock size={13} />, label: 'جارِ الإرسال...' },
  sent: { icon: <Check size={13} />, label: 'أُرسلت' },
  delivered: { icon: <CheckCheck size={13} />, label: 'تم التوصيل' },
  read: { icon: <CheckCheck size={13} className="text-teal-600" />, label: 'تمت القراءة' },
  failed: { icon: <AlertCircle size={13} className="text-rose-400" />, label: 'فشل الإرسال' },
};

const MessageBubble = ({ message }) => {
  const isOut = message.direction === 'out';
  const statusMeta = STATUS_META[message.status];
  const statusLabel = message.status === 'failed' && message.error_message ? message.error_message : statusMeta?.label;

  if (message.is_private) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <Lock size={11} />
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === 'reaction') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <Heart size={11} />
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex mb-2', isOut ? 'justify-start' : 'justify-end', message._optimistic && 'opacity-60')}>
      <div className="relative max-w-[70%]">
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm shadow-sm',
            isOut ? 'bg-teal-100 text-slate-800 rounded-bl-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-br-sm'
          )}
        >
          {message.sender_name && isOut && (
            <p className="text-[10px] font-black text-teal-700/80 mb-0.5">{message.sender_name}</p>
          )}
          {message.type === 'image' ? (
            <img src={message.content} alt="" className="rounded-lg max-w-full" />
          ) : message.type === 'audio' ? (
            <audio controls src={message.content} className="max-w-full" />
          ) : message.type === 'video' ? (
            <video controls src={message.content} className="rounded-lg max-w-full max-h-72" />
          ) : message.type === 'file' ? (
            <a
              href={message.content}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 -mx-1 hover:opacity-80 transition-opacity',
                isOut ? 'bg-teal-600/10' : 'bg-slate-50'
              )}
            >
              <FileText size={18} className="flex-shrink-0" />
              <span className="truncate flex-1">مستند مرفق</span>
              <Download size={14} className="flex-shrink-0" />
            </a>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          )}
          <div className={cn('flex items-center gap-1 mt-1 text-[10px]', isOut ? 'text-teal-700/60 justify-end' : 'text-slate-400')}>
            <span>{message.sent_at ? new Date(message.sent_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            {isOut && statusMeta && <span title={statusLabel} aria-label={statusLabel}>{statusMeta.icon}</span>}
          </div>
        </div>

        {/* A hover tooltip alone is easy to miss — a failed send needs to be obvious at a glance. */}
        {isOut && message.status === 'failed' && (
          <p className="text-[11px] font-bold text-rose-500 mt-1">
            {message.error_message ?? 'فشل الإرسال'}
          </p>
        )}

        {message.reaction_emoji && (
          <span
            title={`تفاعل العميل: ${message.reaction_emoji}`}
            className={cn(
              'absolute -bottom-2 w-5 h-5 flex items-center justify-center bg-white border border-slate-100 rounded-full text-[11px] shadow-sm',
              isOut ? 'left-1' : 'right-1'
            )}
          >
            {message.reaction_emoji}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
