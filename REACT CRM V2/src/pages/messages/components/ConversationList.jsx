import React from 'react';
import { Search, Plus, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '../../../utils/cn';
import ConversationListItem from './ConversationListItem';

const ConversationList = ({ list, selectedId, onSelect, onNewConversation, className }) => {
  const { conversations, meta, isLoading, status, setStatus, search, setSearch, page, setPage, statusTabs } = list;

  return (
    <div className={cn('w-full lg:max-w-sm flex-col border-l border-slate-100 bg-white h-full', className)}>
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-800">المحادثات</h2>
          <button onClick={onNewConversation} title="محادثة جديدة" aria-label="محادثة جديدة" className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700">
            <Plus size={16} />
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="w-full h-10 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatus(tab.id)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors',
                status === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
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
                  className="h-9 px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={14} />
                  محادثة جديدة
                </button>
              </>
            )}
          </div>
        ) : (
          conversations.map((c) => (
            <ConversationListItem key={c.id} conversation={c} isActive={c.id === selectedId} onClick={() => onSelect(c)} />
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
