import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, RotateCcw, Megaphone, ChevronRight, UserCircle2, ChevronDown } from 'lucide-react';
import { users as usersApi } from '../../../api';
import { usePermission } from '../../../hooks/usePermission';

const AssigneePicker = ({ conversation, onAssign }) => {
  const [open, setOpen] = useState(false);
  const canAssign = usePermission('conversations.assign');

  const { data: users = [] } = useQuery({
    queryKey: ['users-select'],
    queryFn: usersApi.getUsers,
    enabled: open,
  });

  if (!canAssign) {
    return (
      <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-400 flex-shrink-0">
        <UserCircle2 size={14} />
        {conversation.assigned_user?.name ?? 'غير معيّنة'}
      </span>
    );
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
      >
        <UserCircle2 size={14} />
        <span className="hidden sm:inline max-w-[100px] truncate">{conversation.assigned_user?.name ?? 'غير معيّنة'}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 max-h-60 overflow-y-auto">
            <button
              onClick={() => { onAssign(null); setOpen(false); }}
              className="w-full text-right px-3 py-2 text-xs font-bold hover:bg-slate-50 text-slate-400"
            >
              غير معيّنة
            </button>
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => { onAssign(u.id); setOpen(false); }}
                className="w-full text-right px-3 py-2 text-xs font-bold hover:bg-indigo-50 text-slate-700 truncate"
              >
                {u.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ChatHeader = ({ conversation, onUpdateStatus, onAssign, onBack }) => {
  if (!conversation) return null;

  const isResolved = conversation.status === 'resolved';

  return (
    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-3 lg:px-5 bg-white flex-shrink-0 gap-2">
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

      <div className="flex items-center gap-2 flex-shrink-0">
        <AssigneePicker conversation={conversation} onAssign={onAssign} />

        <button
          onClick={() => onUpdateStatus(isResolved ? 'open' : 'resolved')}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex-shrink-0"
        >
          {isResolved ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
          <span className="hidden sm:inline">{isResolved ? 'إعادة فتح المحادثة' : 'إنهاء المحادثة'}</span>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
