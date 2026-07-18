import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Megaphone } from 'lucide-react';
import { cn } from '../../../utils/cn';

/** First letter of each of the first two words (e.g. "سارة الجميل" → "سج"); falls back to the first two characters for a single word or a bare phone number. */
const initialsOf = (label) => {
  if (!label) return '#';
  const words = label.trim().split(/\s+/);
  return words.length >= 2 ? words[0][0] + words[1][0] : label.slice(0, 2);
};

const ConversationListItem = ({ conversation, isActive, onClick }) => {
  const hasUnread = conversation.unread_count > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full text-right px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50/80 transition-colors flex gap-3',
        isActive && 'bg-teal-50/70 hover:bg-teal-50/70'
      )}
    >
      {hasUnread && <span className="absolute right-0 top-2 bottom-2 w-1 rounded-full bg-teal-500" />}
      <div
        className={cn(
          'w-11 h-11 rounded-full flex items-center justify-center font-black flex-shrink-0 text-sm transition-colors',
          isActive ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700'
        )}
      >
        {initialsOf(conversation.contact?.name ?? conversation.contact?.phone)}
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
            <span className="bg-teal-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
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
