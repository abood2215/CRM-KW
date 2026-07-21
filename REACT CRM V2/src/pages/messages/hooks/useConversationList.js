import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { conversations as conversationsApi } from '../../../api';
import { useEcho, useEchoConnectionStatus } from '../../../hooks/useEcho';

const STATUS_TABS = [
  { id: 'open', label: 'مفتوحة' },
  { id: 'pending', label: 'معلقة' },
  { id: 'resolved', label: 'منتهية' },
];

export function useConversationList() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const echo = useEcho();
  const connectionStatus = useEchoConnectionStatus();

  // The input updates `search` (and the UI) immediately; the actual query only reacts to
  // `debouncedSearch` — without this, every keystroke fired its own network request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', status, debouncedSearch, page],
    queryFn: () => conversationsApi.getConversations({ status, search: debouncedSearch || undefined, page, per_page: 25 }),
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!echo) return undefined;

    const channel = echo.private('conversations');
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['conversations'] });

    channel.listen('.NewMessageEvent', invalidate);
    channel.listen('.ConversationUpdatedEvent', invalidate);

    return () => {
      channel.stopListening('.NewMessageEvent');
      channel.stopListening('.ConversationUpdatedEvent');
    };
  }, [echo, queryClient]);

  return {
    conversations: data?.conversations ?? [],
    meta: data?.meta,
    isLoading,
    status,
    setStatus,
    search,
    setSearch,
    page,
    setPage,
    statusTabs: STATUS_TABS,
    connectionStatus,
  };
}
