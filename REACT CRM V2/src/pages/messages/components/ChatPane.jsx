import React, { useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useChatPane } from '../hooks/useChatPane';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import TemplatePicker from './TemplatePicker';

const ChatPane = ({ conversationId, onBack, className }) => {
  const { conversation, messages, isLoading, bottomRef, sendMessage, isSending, sendTemplate, updateStatus } = useChatPane(conversationId);
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
      <ChatHeader conversation={conversation} onUpdateStatus={updateStatus} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
        ) : (
          <>
            {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <MessageComposer onSend={sendMessage} isSending={isSending} onOpenTemplatePicker={() => setTemplatePickerOpen(true)} />
      <TemplatePicker open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} onSend={sendTemplate} />
    </div>
  );
};

export default ChatPane;
