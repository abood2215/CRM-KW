import React from 'react';
import { Search, Plus, Loader2, MessageSquare } from 'lucide-react';
import { isToday, isYesterday, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '../../../utils/cn';
import ConversationListItem from './ConversationListItem';

const CONNECTION_META = {
  connected: { label: 'متصل مباشر', cls: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
  connecting: { label: 'جاري إعادة الاتصال...', cls: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500 animate-pulse' },
  disconnected: { label: 'غير متصل', cls: 'bg-rose-50 text-rose-500', dot: 'bg-rose-400' },
};

const ConnectionBadge = ({ status }) => {
  const meta = CONNECTION_META[status] ?? CONNECTION_META.disconnected;

  return (
    <span
      className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0', meta.cls)}
      title={meta.label}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
      <span className="hidden lg:inline">{meta.label}</span>
    </span>
  );
};

const dayLabel = (dateString) => {
  if (!dateString) return 'أقدم';
  const date = new Date(dateString);
  if (isToday(date)) return 'اليوم';
  if (isYesterday(date)) return 'أمس';
  return format(date, 'd MMMM', { locale: ar });
};

const groupByDay = (conversations) => {
  const groups = [];
  for (const c of conversations) {
    const label = dayLabel(c.last_message_at);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.label === label) {
      lastGroup.items.push(c);
    } else {
      groups.push({ label, items: [c] });
    }
  }
  return groups;
};

const ConversationList = ({ list, selectedId, onSelect, onNewConversation, className }) => {
  const { conversations, meta, isLoading, status, setStatus, search, setSearch, page, setPage, statusTabs, connectionStatus } = list;
  const groups = groupByDay(conversations);

  return (
    <div className={cn('w-full md:max-w-[280px] lg:max-w-sm flex-col border-l border-slate-100 bg-white h-full', className)}>
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-black text-slate-800 flex-shrink-0">المحادثات</h2>
            {connectionStatus && <ConnectionBadge status={connectionStatus} />}
          </div>
          <button onClick={onNewConversation} title="محادثة جديدة" aria-label="محادثة جديدة" className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 flex-shrink-0">
            <Plus size={16} />
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="w-full h-10 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div className="flex gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatus(tab.id)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors',
                status === tab.id ? 'bg-teal-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-600" size={24} /></div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <MessageSquare size={32} className="text-slate-100 mb-3" />
            {search ? (
              <p className="text-slate-400 text-sm font-medium">لا توجد نتائج مطابقة لبحثك</p>
            ) : (
              <>
                <p className="text-slate-500 text-sm font-bold mb-1">لا توجد محادثات هنا بعد</p>
                <p className="text-slate-400 text-xs mb-4 max-w-[220px]">ابدأ محادثة جديدة مع أحد جهات الاتصال، أو انتظر رسالة واردة عبر واتساب.</p>
                <button
                  onClick={onNewConversation}
                  className="h-9 px-4 bg-teal-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-teal-700 transition-colors"
                >
                  <Plus size={14} />
                  محادثة جديدة
                </button>
              </>
            )}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <p className="sticky top-0 z-[1] px-4 pt-3 pb-1.5 text-[11px] font-black text-slate-400 bg-white/95 backdrop-blur-sm">{group.label}</p>
              {group.items.map((c) => (
                <ConversationListItem key={c.id} conversation={c} isActive={c.id === selectedId} onClick={() => onSelect(c)} />
              ))}
            </div>
          ))
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40 font-bold">السابق</button>
          <span className="text-slate-400">{meta.current_page} / {meta.last_page}</span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40 font-bold">التالي</button>
        </div>
      )}
    </div>
  );
};

export default ConversationList;
