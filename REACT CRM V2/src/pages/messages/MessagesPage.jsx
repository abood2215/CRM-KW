import React, { useState } from 'react';
import { useConversationList } from './hooks/useConversationList';
import ConversationList from './components/ConversationList';
import ChatPane from './components/ChatPane';
import NewConversationModal from './components/NewConversationModal';

const MessagesPage = () => {
  const list = useConversationList();
  const [selectedId, setSelectedId] = useState(null);
  const [newConvOpen, setNewConvOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <ChatPane conversationId={selectedId} />
      <ConversationList
        list={list}
        selectedId={selectedId}
        onSelect={(conversation) => setSelectedId(conversation.id)}
        onNewConversation={() => setNewConvOpen(true)}
      />
      <NewConversationModal
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onCreated={(conversation) => setSelectedId(conversation.id)}
      />
    </div>
  );
};

export default MessagesPage;
