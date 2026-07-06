import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { conversations as conversationsApi } from '../../../api';
import { useEcho } from '../../../hooks/useEcho';

const STATUS_TABS = [
  { id: 'open', label: 'مفتوحة' },
  { id: 'pending', label: 'معلقة' },
  { id: 'resolved', label: 'منتهية' },
];

export function useConversationList() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const echo = useEcho();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', status, search, page],
    queryFn: () => conversationsApi.getConversations({ status, search: search || undefined, page, per_page: 25 }),
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!echo) return undefined;

    const channel = echo.channel('conversations');
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
  };
}
