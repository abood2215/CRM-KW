import React, { useState } from 'react';
import { Check, CheckCheck, AlertCircle, Clock, Lock, FileText, Download, Heart, SmilePlus, Info } from 'lucide-react';
import { cn } from '../../../utils/cn';

// Meta's own marketing-quality throttling (declined delivery, not a send failure on our
// end — see MessageStatusUpdateService::translateError) reads as an alarming red error
// like any other failure otherwise, when it's really just "not eligible right now".
const isMarketingThrottled = (message) => message.status === 'failed' && message.error_message?.includes('131049');

const STATUS_META = {
  pending: { icon: <Clock size={13} />, label: 'جارِ الإرسال...' },
  sent: { icon: <Check size={13} />, label: 'أُرسلت' },
  delivered: { icon: <CheckCheck size={13} />, label: 'تم التوصيل' },
  read: { icon: <CheckCheck size={13} className="text-teal-600" />, label: 'تمت القراءة' },
  failed: { icon: <AlertCircle size={13} className="text-rose-400" />, label: 'فشل الإرسال' },
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageBubble = ({ message, onReact }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isOut = message.direction === 'out';
  const throttled = isMarketingThrottled(message);
  const statusMeta = throttled
    ? { icon: <Info size={13} className="text-amber-500" />, label: 'غير مؤهل للتسويق حالياً' }
    : STATUS_META[message.status];
  const statusLabel = !throttled && message.status === 'failed' && message.error_message ? message.error_message : statusMeta?.label;
  // Only offered on the customer's own messages — reacting to your own sent message isn't
  // the point here, and it needs a real wamid to target via Meta's reaction message type.
  const canReact = !isOut && !message._optimistic && !!message.whatsapp_message_id && onReact;

  const pickReaction = (emoji) => {
    onReact(emoji === message.reaction_emoji ? '' : emoji);
    setPickerOpen(false);
  };

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
    <div className={cn('flex mb-2 group items-end gap-1.5', isOut ? 'justify-start' : 'justify-end', message._optimistic && 'opacity-60')}>
      {canReact && (
        <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-200 flex items-center justify-center shadow-sm"
            title="تفاعل"
            aria-label="تفاعل"
          >
            <SmilePlus size={14} />
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
              <div className="absolute bottom-9 right-0 bg-white border border-slate-200 rounded-full shadow-lg px-2 py-1.5 flex gap-1 z-20">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => pickReaction(emoji)}
                    className={cn(
                      'text-base w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-transform hover:scale-110',
                      message.reaction_emoji === emoji && 'bg-teal-50'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
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
          {message.media_url && message.type !== 'image' && (
            <img src={message.media_url} alt="" className="rounded-lg max-w-full mb-2" />
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
            {/* Only useful when more than one WhatsApp number is connected — lets an agent tell
                which line a message actually went through without opening the numbers page. */}
            {message.sender_number && (
              <span title="رقم واتساب المستخدم" className="opacity-70">{message.sender_number} ·</span>
            )}
            <span>{message.sent_at ? new Date(message.sent_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            {isOut && statusMeta && <span title={statusLabel} aria-label={statusLabel}>{statusMeta.icon}</span>}
          </div>
        </div>

        {/* A hover tooltip alone is easy to miss — a failed send needs to be obvious at a glance. */}
        {isOut && message.status === 'failed' && (
          <p
            className={cn('text-[11px] font-bold mt-1', throttled ? 'text-amber-600' : 'text-rose-500')}
            title={message.error_message}
          >
            {throttled ? 'غير مؤهل للتسويق حالياً — ميتا لم توصّل الرسالة لهذا الرقم' : message.error_message ?? 'فشل الإرسال'}
          </p>
        )}

        {message.reaction_emoji && (
          <span
            title={isOut ? `تفاعل العميل: ${message.reaction_emoji}` : `تفاعلك: ${message.reaction_emoji}`}
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
