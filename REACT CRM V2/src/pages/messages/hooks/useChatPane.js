import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { conversations as conversationsApi } from '../../../api';
import { useEcho } from '../../../hooks/useEcho';

export function useChatPane(conversationId) {
  const queryClient = useQueryClient();
  const echo = useEcho();
  const bottomRef = useRef(null);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationsApi.getConversation(conversationId),
    enabled: !!conversationId,
  });

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationsApi.getMessages(conversationId, { per_page: 100 }),
    enabled: !!conversationId,
  });

  const messages = messagesData?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  useEffect(() => {
    if (!echo || !conversationId) return undefined;

    const channel = echo.channel(`conversations.${conversationId}`);
    const onNewMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    };
    const onStatusUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    };

    channel.listen('.NewMessageEvent', onNewMessage);
    channel.listen('.MessageStatusUpdatedEvent', onStatusUpdate);

    return () => {
      channel.stopListening('.NewMessageEvent');
      channel.stopListening('.MessageStatusUpdatedEvent');
    };
  }, [echo, conversationId, queryClient]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const sendMessageMutation = useMutation({
    mutationFn: ({ content, isPrivate, type }) =>
      conversationsApi.sendMessage(conversationId, { content, is_private: isPrivate, type }),
    onSuccess: invalidateAll,
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إرسال الرسالة'),
  });

  const sendTemplateMutation = useMutation({
    mutationFn: ({ templateId, variables }) =>
      conversationsApi.sendTemplateMessage(conversationId, { template_id: templateId, variables }),
    onSuccess: invalidateAll,
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إرسال القالب'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => conversationsApi.updateStatus(conversationId, status),
    onSuccess: invalidateAll,
  });

  return {
    conversation,
    messages,
    isLoading,
    bottomRef,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    sendTemplate: sendTemplateMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
  };
}
