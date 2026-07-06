import React from 'react';
import { CheckCircle2, RotateCcw, Megaphone } from 'lucide-react';

const ChatHeader = ({ conversation, onUpdateStatus }) => {
  if (!conversation) return null;

  const isResolved = conversation.status === 'resolved';

  return (
    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-5 bg-white flex-shrink-0">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-black text-slate-800">{conversation.contact?.name ?? conversation.contact?.phone}</h3>
          {conversation.is_campaign_origin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              <Megaphone size={10} />
              حملة
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 font-medium">{conversation.contact?.phone}</p>
      </div>

      <button
        onClick={() => onUpdateStatus(isResolved ? 'open' : 'resolved')}
        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
      >
        {isResolved ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
        {isResolved ? 'إعادة فتح' : 'إنهاء'}
      </button>
    </div>
  );
};

export default ChatHeader;
