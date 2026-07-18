import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { conversations as conversationsApi } from '../../../api';
import { useEcho } from '../../../hooks/useEcho';
import { useAuthStore } from '../../../store/useAuthStore';

const PER_PAGE = 100;
const TYPING_THROTTLE_MS = 3000;
const TYPING_EXPIRE_MS = 5000;

export function useChatPane(conversationId) {
  const queryClient = useQueryClient();
  const echo = useEcho();
  const bottomRef = useRef(null);
  const lastTypingSentAt = useRef(0);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [typingUser, setTypingUser] = useState(null);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationsApi.getConversation(conversationId),
    enabled: !!conversationId,
  });

  // No `page` on the first fetch — the backend defaults that to the LAST page (most
  // recent messages). Older pages are only fetched on demand via fetchPreviousPage(),
  // so a conversation with >100 messages always opens showing the latest activity
  // instead of the oldest 100 (the bug this replaces: plain per_page=100 with no page
  // param always landed on page 1 = oldest messages, hiding anything newer).
  const {
    data: messagesData,
    isLoading,
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam }) =>
      conversationsApi.getMessages(conversationId, pageParam ? { per_page: PER_PAGE, page: pageParam } : { per_page: PER_PAGE }),
    enabled: !!conversationId,
    initialPageParam: undefined,
    getNextPageParam: () => undefined,
    getPreviousPageParam: (firstPage) => (firstPage.meta.current_page > 1 ? firstPage.meta.current_page - 1 : undefined),
  });

  const messages = (messagesData?.pages ?? []).flatMap((page) => page.messages);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
    // Only auto-scroll on the initial load / a genuinely new message, not when older
    // history is prepended via "load older" (that would yank the view to the bottom).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesData?.pages?.at(-1)?.messages?.length]);

  useEffect(() => {
    if (!echo || !conversationId) return undefined;

    const channel = echo.channel(`conversations.${conversationId}`);
    let typingExpiry;

    const onNewMessage = () => {
      // Resets (not just invalidates) so the query re-anchors on whatever the backend
      // now considers "the last page" — a plain invalidate would re-request the same
      // page numbers already cached, which can now be stale once a new message pushes
      // the total past a page boundary.
      queryClient.resetQueries({ queryKey: ['messages', conversationId], exact: true });
      // Re-fetching ['conversation', id] re-hits the `show` endpoint, which resets
      // unread_count server-side — without this, a message arriving while this
      // conversation is already open bumps the unread badge and it never clears.
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };
    const onStatusUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    };
    const onTyping = (payload) => {
      if (payload.user_id === currentUserId) return; // don't show your own typing back to you

      setTypingUser(payload.user_name);
      clearTimeout(typingExpiry);
      typingExpiry = setTimeout(() => setTypingUser(null), TYPING_EXPIRE_MS);
    };

    channel.listen('.NewMessageEvent', onNewMessage);
    channel.listen('.MessageStatusUpdatedEvent', onStatusUpdate);
    channel.listen('.UserTypingEvent', onTyping);

    return () => {
      channel.stopListening('.NewMessageEvent');
      channel.stopListening('.MessageStatusUpdatedEvent');
      channel.stopListening('.UserTypingEvent');
      clearTimeout(typingExpiry);
      setTypingUser(null);
    };
  }, [echo, conversationId, queryClient, currentUserId]);

  // Throttled — the composer calls this on every keystroke, but there's no need to hit
  // the network more than once every few seconds while the agent keeps typing.
  const notifyTyping = () => {
    if (!conversationId) return;
    const now = Date.now();
    if (now - lastTypingSentAt.current < TYPING_THROTTLE_MS) return;
    lastTypingSentAt.current = now;
    conversationsApi.sendTyping(conversationId).catch(() => {});
  };

  const invalidateAll = () => {
    // reset, not invalidate — see onNewMessage above for why (page boundaries shift).
    queryClient.resetQueries({ queryKey: ['messages', conversationId], exact: true });
    queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const sendMessageMutation = useMutation({
    mutationFn: ({ content, isPrivate, type, filename }) =>
      conversationsApi.sendMessage(conversationId, { content, is_private: isPrivate, type, filename }),
    // Shows the message immediately with a "sending" clock icon instead of waiting on the
    // round trip — previously the composer just sat there with no feedback until the
    // response came back, which read as "did that even go through?" on a slow connection.
    onMutate: async ({ content, isPrivate, type }) => {
      const key = ['messages', conversationId];
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (old) => {
        if (!old?.pages?.length) return old;
        const optimisticMessage = {
          id: `optimistic-${Date.now()}`,
          content,
          type: type ?? 'text',
          direction: 'out',
          is_private: !!isPrivate,
          status: 'pending',
          sent_at: new Date().toISOString(),
          _optimistic: true,
        };
        const lastIndex = old.pages.length - 1;
        const pages = old.pages.map((page, i) =>
          i === lastIndex ? { ...page, messages: [...page.messages, optimisticMessage] } : page
        );
        return { ...old, pages };
      });

      return { previous };
    },
    onError: (e, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['messages', conversationId], context.previous);
      }
      toast.error(e?.response?.data?.message || 'فشل إرسال الرسالة');
    },
    onSuccess: invalidateAll,
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

  const assignMutation = useMutation({
    mutationFn: (userId) => conversationsApi.assignConversation(conversationId, userId),
    onSuccess: invalidateAll,
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل تعيين المحادثة'),
  });

  const reactMutation = useMutation({
    mutationFn: ({ messageId, emoji }) => conversationsApi.reactToMessage(conversationId, messageId, emoji),
    onSuccess: invalidateAll,
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إرسال التفاعل'),
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
    assignConversation: assignMutation.mutate,
    reactToMessage: (messageId, emoji) => reactMutation.mutate({ messageId, emoji }),
    loadOlderMessages: fetchPreviousPage,
    hasOlderMessages: !!hasPreviousPage,
    isLoadingOlderMessages: isFetchingPreviousPage,
    typingUser,
    notifyTyping,
  };
}
