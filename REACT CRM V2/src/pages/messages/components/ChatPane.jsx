import React, { useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { isSameDay, isToday, isYesterday, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '../../../utils/cn';
import { useChatPane } from '../hooks/useChatPane';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import TemplatePicker from './TemplatePicker';

const dateSeparatorLabel = (date) => {
  if (isToday(date)) return 'اليوم';
  if (isYesterday(date)) return 'أمس';
  return format(date, 'd MMMM yyyy', { locale: ar });
};

const ChatPane = ({ conversationId, onBack, className }) => {
  const { conversation, messages, isLoading, bottomRef, sendMessage, isSending, sendTemplate, updateStatus, assignConversation } = useChatPane(conversationId);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  if (!conversationId) {
    return (
      <div className={cn('flex-1 flex-col items-center justify-center text-center bg-slate-50/50', className)}>
        <MessageSquare size={40} className="text-slate-200 mb-3" />
        <p className="text-slate-400 font-medium">اختر محادثة لعرضها</p>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex-col h-full bg-slate-50/50', className)}>
      <ChatHeader conversation={conversation} onUpdateStatus={updateStatus} onAssign={assignConversation} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
          ) : (
            <>
              {messages.map((m, i) => {
                const date = new Date(m.sent_at ?? m.created_at);
                const prevDate = i > 0 ? new Date(messages[i - 1].sent_at ?? messages[i - 1].created_at) : null;
                const showSeparator = !prevDate || !isSameDay(date, prevDate);

                return (
                  <React.Fragment key={m.id}>
                    {showSeparator && (
                      <div className="flex justify-center my-3">
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100/70 px-3 py-1 rounded-full">
                          {dateSeparatorLabel(date)}
                        </span>
                      </div>
                    )}
                    <MessageBubble message={m} />
                  </React.Fragment>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </div>

      <MessageComposer onSend={sendMessage} isSending={isSending} onOpenTemplatePicker={() => setTemplatePickerOpen(true)} />
      <TemplatePicker open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} onSend={sendTemplate} />
    </div>
  );
};

export default ChatPane;
