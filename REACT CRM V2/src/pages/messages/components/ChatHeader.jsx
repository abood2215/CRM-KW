import React from 'react';
import { CheckCircle2, RotateCcw, Megaphone, ChevronRight } from 'lucide-react';

const ChatHeader = ({ conversation, onUpdateStatus, onBack }) => {
  if (!conversation) return null;

  const isResolved = conversation.status === 'resolved';

  return (
    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-3 lg:px-5 bg-white flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="lg:hidden w-9 h-9 -mr-1 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 flex-shrink-0"
            aria-label="رجوع"
          >
            <ChevronRight size={20} />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-800 truncate">{conversation.contact?.name ?? conversation.contact?.phone}</h3>
            {conversation.is_campaign_origin && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
                <Megaphone size={10} />
                حملة
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium truncate">{conversation.contact?.phone}</p>
        </div>
      </div>

      <button
        onClick={() => onUpdateStatus(isResolved ? 'open' : 'resolved')}
        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex-shrink-0"
      >
        {isResolved ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
        <span className="hidden sm:inline">{isResolved ? 'إعادة فتح' : 'إنهاء'}</span>
      </button>
    </div>
  );
};

export default ChatHeader;
