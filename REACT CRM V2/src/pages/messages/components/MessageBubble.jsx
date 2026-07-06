import React from 'react';
import { Check, CheckCheck, Clock, Lock } from 'lucide-react';
import { cn } from '../../../utils/cn';

const STATUS_ICON = {
  sent: <Check size={13} />,
  delivered: <CheckCheck size={13} />,
  read: <CheckCheck size={13} className="text-sky-400" />,
  failed: <Clock size={13} className="text-rose-300" />,
};

const MessageBubble = ({ message }) => {
  const isOut = message.direction === 'out';

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

  return (
    <div className={cn('flex mb-2', isOut ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
          isOut ? 'bg-indigo-600 text-white rounded-bl-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-br-sm'
        )}
      >
        {message.sender_name && isOut && (
          <p className="text-[10px] font-black opacity-70 mb-0.5">{message.sender_name}</p>
        )}
        {message.type === 'image' ? (
          <img src={message.content} alt="" className="rounded-lg max-w-full" />
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <div className={cn('flex items-center gap-1 mt-1 text-[10px]', isOut ? 'text-indigo-200 justify-end' : 'text-slate-400')}>
          <span>{message.sent_at ? new Date(message.sent_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          {isOut && STATUS_ICON[message.status]}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
