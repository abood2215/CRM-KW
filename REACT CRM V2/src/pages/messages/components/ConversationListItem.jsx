import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Megaphone } from 'lucide-react';
import { cn } from '../../../utils/cn';

const ConversationListItem = ({ conversation, isActive, onClick }) => {
  const hasUnread = conversation.unread_count > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-right p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3',
        isActive && 'bg-indigo-50 hover:bg-indigo-50'
      )}
    >
      <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black flex-shrink-0">
        {conversation.contact?.name?.[0] ?? '#'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm truncate', hasUnread ? 'font-black text-slate-800' : 'font-bold text-slate-600')}>
            {conversation.contact?.name ?? conversation.contact?.phone ?? 'بدون اسم'}
          </span>
          {conversation.last_message_at && (
            <span className="text-[10px] text-slate-400 flex-shrink-0">
              {formatDistanceToNow(new Date(conversation.last_message_at), { locale: ar, addSuffix: true })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className={cn('text-xs truncate', hasUnread ? 'text-slate-700 font-bold' : 'text-slate-400')}>
            {conversation.last_message ?? '—'}
          </p>
          {hasUnread && (
            <span className="bg-indigo-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
              {conversation.unread_count}
            </span>
          )}
        </div>
        {/* Fixes the old app's bug: campaign-originated conversations now visually distinct */}
        {conversation.is_campaign_origin && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
            <Megaphone size={10} />
            من حملة
          </span>
        )}
      </div>
    </button>
  );
};

export default ConversationListItem;
