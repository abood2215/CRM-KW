import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Conversation, Message } from '../../types';
import {
  Search, Send, Paperclip, Smile, MoreVertical, Phone,
  CheckCheck, Check, Clock, Loader2, MessageSquare, Lock,
  ArrowRight, Filter, X, Users, Wifi, ChevronDown,
  Image, Mic, Plus
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/useAuthStore';
import { useEcho } from '../../hooks/useEcho';
import { format, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: '#dbeafe', fg: '#1e40af' },
  { bg: '#d1fae5', fg: '#065f46' },
  { bg: '#fce7f3', fg: '#be185d' },
  { bg: '#fef3c7', fg: '#92400e' },
  { bg: '#ede9fe', fg: '#6d28d9' },
  { bg: '#fee2e2', fg: '#991b1b' },
  { bg: '#e0f2fe', fg: '#0369a1' },
  { bg: '#ecfdf5', fg: '#065f46' },
];

const avatarColor = (name = '') =>
  AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length];

const formatConvTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'أمس';
  return format(d, 'dd/MM', { locale: ar });
};

const formatMsgDate = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return 'اليوم';
  if (isYesterday(d)) return 'أمس';
  return format(d, 'EEEE، dd MMMM yyyy', { locale: ar });
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const MsgStatus = ({ status }: { status?: string }) => {
  if (status === 'read')
    return <CheckCheck size={14} className="text-[#53bdeb] flex-shrink-0" />;
  if (status === 'delivered')
    return <CheckCheck size={14} className="text-slate-400 flex-shrink-0" />;
  if (status === 'sent' || status === 'received')
    return <Check size={14} className="text-slate-400 flex-shrink-0" />;
  return <Clock size={11} className="text-slate-300 flex-shrink-0" />;
};

const Avatar = ({ name = '', size = 'md' }: { name?: string; size?: 'sm' | 'md' | 'lg' }) => {
  const { bg, fg } = avatarColor(name);
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold flex-shrink-0', dim)}
      style={{ backgroundColor: bg, color: fg }}
    >
      {name.charAt(0)}
    </div>
  );
};

const SourceBadge = ({ source }: { source?: string }) => {
  if (source === 'whatsapp')
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
        <Wifi size={8} /> واتساب
      </span>
    );
  if (source === 'instagram')
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-full">
        <Users size={8} /> انستقرام
      </span>
    );
  return null;
};

// ─── Main Component ──────────────────────────────────────────────────────────

const MessagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const echo = useEcho();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'open' | 'pending' | 'resolved'>('open');
  const [isPrivate, setIsPrivate] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: conversations = [], isLoading: loadingConvs } = useQuery<Conversation[]>({
    queryKey: ['conversations', filter],
    queryFn: async () => {
      const { data } = await api.get('/conversations', { params: { status: filter } });
      return data.conversations;
    },
    refetchInterval: 30_000,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', selectedId],
    queryFn: async () => {
      const { data } = await api.get(`/conversations/${selectedId}/messages`);
      return data.messages;
    },
    enabled: !!selectedId,
  });

  const sendMessage = useMutation({
    mutationFn: (payload: { content: string; is_private: boolean }) =>
      api.post(`/conversations/${selectedId}/messages`, payload),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => toast.error('فشل إرسال الرسالة'),
  });

  // ── Real-time ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!echo) return;
    const channel = echo.private('messages').listen('.NewMessageEvent', (e: { message: Message }) => {
      if (e.message.conversation_id === selectedId) {
        queryClient.setQueryData(['messages', selectedId], (old: Message[] | undefined) =>
          old ? [...old, e.message] : [e.message]
        );
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => echo.leave('messages');
  }, [echo, selectedId, queryClient]);

  // ── Scroll to bottom on new messages ─────────────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectConversation = (id: number) => {
    setSelectedId(id);
    setMobileShowChat(true);
    inputRef.current?.focus();
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || !selectedId || sendMessage.isPending) return;
    sendMessage.mutate({ content: message, is_private: isPrivate });
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedConv = conversations.find((c) => c.id === selectedId);

  const filteredConvs = useMemo(
    () =>
      conversations.filter((c) =>
        !searchTerm ||
        c.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.client?.phone.includes(searchTerm) ||
        c.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [conversations, searchTerm]
  );

  // Group messages by date for separators
  const messageGroups = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    messages.forEach((msg) => {
      const d = formatMsgDate(msg.sent_at);
      const last = groups[groups.length - 1];
      if (last?.date === d) last.msgs.push(msg);
      else groups.push({ date: d, msgs: [msg] });
    });
    return groups;
  }, [messages]);

  const filterLabels = { open: 'نشطة', pending: 'معلقة', resolved: 'مكتملة' } as const;

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex overflow-hidden font-cairo rounded-2xl border border-slate-200 shadow-xl"
      style={{ height: 'calc(100dvh - 8.75rem)' }}
    >

      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR — Conversation List
      ═══════════════════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          'flex-shrink-0 flex flex-col bg-[#f0f2f5]',
          'w-full lg:w-[360px] xl:w-[400px]',
          'border-l border-slate-200',
          mobileShowChat ? 'hidden lg:flex' : 'flex'
        )}
      >
        {/* Sidebar Header */}
        <div className="bg-[#f0f2f5] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name ?? 'U'} size="md" />
            <h2 className="text-base font-black text-slate-800">المحادثات</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-black/5 transition-colors"
            >
              {showSearch ? <X size={18} /> : <Search size={18} />}
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-black/5 transition-colors">
              <Filter size={17} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden px-3 pb-2 bg-[#f0f2f5]"
            >
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="بحث أو بدء محادثة جديدة"
                  className="w-full h-9 pr-9 pl-4 bg-white rounded-lg text-sm focus:outline-none border-none shadow-sm placeholder:text-slate-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Tabs */}
        <div className="px-3 pb-2 bg-[#f0f2f5] flex-shrink-0">
          <div className="flex gap-1.5">
            {(['open', 'pending', 'resolved'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  'flex-1 py-1.5 text-xs font-bold rounded-full transition-all',
                  filter === s
                    ? 'bg-[#00a884] text-white shadow-sm'
                    : 'bg-white/70 text-slate-500 hover:bg-white'
                )}
              >
                {filterLabels[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto bg-white">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-[#00a884]" size={24} />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400 px-6 text-center">
              <MessageSquare size={36} className="text-slate-200" />
              <p className="text-sm font-medium">لا توجد محادثات</p>
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const isActive = selectedId === conv.id;
              const { bg, fg } = avatarColor(conv.client?.name ?? '');
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-right border-b border-slate-50',
                    isActive ? 'bg-[#f0f2f5]' : 'bg-white hover:bg-[#f5f6f6]'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      {conv.client?.name?.charAt(0) ?? '?'}
                    </div>
                    {conv.source === 'whatsapp' && (
                      <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full bg-[#25d366] flex items-center justify-center border-2 border-white">
                        <Wifi size={10} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[13px] font-bold text-slate-800 truncate">
                        {conv.client?.name ?? 'مجهول'}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-medium flex-shrink-0 mr-1',
                          conv.unread_count > 0 ? 'text-[#00a884] font-bold' : 'text-slate-400'
                        )}
                      >
                        {formatConvTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] text-slate-500 truncate leading-snug">
                        {conv.last_message || 'لا توجد رسائل'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="flex-shrink-0 min-w-[20px] h-5 bg-[#00a884] text-white rounded-full text-[11px] font-bold flex items-center justify-center px-1">
                          {conv.unread_count > 99 ? '99+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          CHAT AREA
      ═══════════════════════════════════════════════════════════════════ */}
      <main
        className={cn(
          'flex-1 flex flex-col min-w-0',
          mobileShowChat ? 'flex' : 'hidden lg:flex'
        )}
      >
        {selectedId ? (
          <>
            {/* ── Chat Header ── */}
            <div className="h-[60px] px-3 lg:px-4 bg-[#f0f2f5] flex items-center justify-between gap-3 flex-shrink-0 border-b border-slate-200">
              {/* Left: back + avatar + info */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors flex-shrink-0"
                >
                  <ArrowRight size={22} />
                </button>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 cursor-pointer"
                  style={{
                    backgroundColor: avatarColor(selectedConv?.client?.name ?? '').bg,
                    color: avatarColor(selectedConv?.client?.name ?? '').fg,
                  }}
                >
                  {selectedConv?.client?.name?.charAt(0) ?? '?'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-slate-800 truncate leading-tight">
                    {selectedConv?.client?.name ?? 'محادثة'}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {selectedConv?.client?.phone}
                    {selectedConv?.assigned_user && (
                      <span className="mr-2 text-[#00a884]">• {selectedConv.assigned_user.name}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-black/5 transition-colors">
                  <Phone size={18} />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-black/5 transition-colors">
                  <Search size={18} />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-black/5 transition-colors">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* ── Messages Area ── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto flex flex-col gap-1 px-3 lg:px-6 py-4"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23b2bec3' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                backgroundColor: '#efeae2',
              }}
            >
              {loadingMessages ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-[#00a884]" size={28} />
                  <p className="text-slate-500 text-sm font-medium">تحميل الرسائل...</p>
                </div>
              ) : (
                <>
                  {messageGroups.map(({ date, msgs }) => (
                    <React.Fragment key={date}>
                      {/* Date separator */}
                      <div className="flex items-center justify-center my-3">
                        <span className="bg-white/80 backdrop-blur-sm text-slate-500 text-[11px] font-semibold px-4 py-1 rounded-full shadow-sm border border-white/50">
                          {date}
                        </span>
                      </div>

                      {msgs.map((msg) => {
                        const isSent = msg.direction === 'out' && !msg.is_private;
                        const isNote = msg.is_private;

                        if (isNote) {
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex justify-center my-1"
                            >
                              <div className="bg-[#fff3cd] border border-[#ffc107]/30 text-[#856404] text-[12px] font-medium px-4 py-2 rounded-xl flex items-center gap-2 max-w-[85%] shadow-sm">
                                <Lock size={11} className="flex-shrink-0" />
                                <span className="italic">{msg.content}</span>
                              </div>
                            </motion.div>
                          );
                        }

                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                            className={cn('flex mb-0.5', isSent ? 'justify-start' : 'justify-end')}
                          >
                            <div
                              className={cn(
                                'max-w-[75%] lg:max-w-[65%] flex flex-col',
                                isSent ? 'items-start' : 'items-end'
                              )}
                            >
                              <div
                                className={cn(
                                  'relative px-3 py-2 shadow-sm',
                                  isSent
                                    ? 'bg-[#d9fdd3] rounded-2xl rounded-tr-sm text-slate-800'
                                    : 'bg-white rounded-2xl rounded-tl-sm text-slate-800'
                                )}
                              >
                                {/* Bubble tail */}
                                {isSent ? (
                                  <div
                                    className="absolute top-0 -right-[7px] w-0 h-0"
                                    style={{
                                      borderLeft: '8px solid #d9fdd3',
                                      borderBottom: '8px solid transparent',
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="absolute top-0 -left-[7px] w-0 h-0"
                                    style={{
                                      borderRight: '8px solid #ffffff',
                                      borderBottom: '8px solid transparent',
                                    }}
                                  />
                                )}

                                <p className="text-[13.5px] leading-[1.5] whitespace-pre-wrap break-words">
                                  {msg.content}
                                </p>

                                {/* Time + status */}
                                <div className="flex items-center gap-1 justify-end mt-1 -mb-0.5">
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {format(new Date(msg.sent_at), 'HH:mm')}
                                  </span>
                                  {isSent && <MsgStatus status={msg.status} />}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {/* Typing indicator space */}
                  {sendMessage.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Input Area ── */}
            <div
              className={cn(
                'flex-shrink-0 bg-[#f0f2f5] border-t border-slate-200',
                isPrivate ? 'bg-amber-50' : ''
              )}
            >
              {/* Private Note Toggle */}
              <div className="px-3 pt-2 flex items-center gap-2">
                <button
                  onClick={() => setIsPrivate((v) => !v)}
                  className={cn(
                    'h-7 px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all border',
                    isPrivate
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  )}
                >
                  <Lock size={10} />
                  ملاحظة داخلية
                </button>
                {isPrivate && (
                  <span className="text-[11px] text-amber-600 font-medium">
                    لن تُرسل للعميل
                  </span>
                )}
              </div>

              {/* Message row */}
              <form onSubmit={handleSend} className="flex items-end gap-2 px-3 py-2">
                {/* Attachment / Emoji */}
                <div className="flex items-center gap-1 flex-shrink-0 pb-2">
                  <button
                    type="button"
                    className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-black/5 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* Textarea */}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      // Auto-grow
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={isPrivate ? 'اكتب ملاحظة داخلية...' : 'اكتب رسالة'}
                    className={cn(
                      'w-full min-h-[42px] max-h-[120px] px-4 py-2.5 rounded-3xl text-[13.5px] font-medium focus:outline-none resize-none leading-relaxed placeholder:text-slate-400 transition-colors',
                      isPrivate
                        ? 'bg-amber-100 border border-amber-200 focus:bg-amber-50'
                        : 'bg-white border-none shadow-sm'
                    )}
                  />
                  <button
                    type="button"
                    className="absolute left-3 bottom-2.5 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Smile size={18} />
                  </button>
                </div>

                {/* Send / Mic button */}
                <div className="flex-shrink-0 pb-0.5">
                  <AnimatePresence mode="wait">
                    {message.trim() ? (
                      <motion.button
                        key="send"
                        type="submit"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        disabled={sendMessage.isPending}
                        className="w-11 h-11 bg-[#00a884] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#00956e] active:scale-95 transition-all disabled:opacity-60"
                      >
                        <Send size={18} className="-rotate-45 translate-x-0.5" />
                      </motion.button>
                    ) : (
                      <motion.button
                        key="mic"
                        type="button"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="w-11 h-11 bg-[#00a884] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#00956e] active:scale-95 transition-all"
                      >
                        <Mic size={18} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </div>
          </>
        ) : (
          /* ── Empty State ── */
          <div
            className="flex-1 flex flex-col items-center justify-center gap-5 select-none"
            style={{ backgroundColor: '#f8f9fa' }}
          >
            <div className="w-24 h-24 lg:w-36 lg:h-36 rounded-full bg-white flex items-center justify-center shadow-lg">
              <MessageSquare size={48} className="text-[#00a884] lg:hidden" />
              <MessageSquare size={72} className="text-[#00a884] hidden lg:block" />
            </div>
            <div className="text-center px-8 max-w-sm">
              <h2 className="text-xl lg:text-2xl font-black text-slate-700 mb-2">
                ابدأ محادثة
              </h2>
              <p className="text-slate-400 text-sm lg:text-base leading-relaxed">
                اختر محادثة من القائمة للتواصل مع العميل عبر واتساب.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 text-xs font-bold text-slate-500">
                <div className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse" />
                نظام الواتساب متصل
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 text-xs font-bold text-slate-500">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                {conversations.length} محادثة
              </div>
            </div>
            {/* Decorative lock icon */}
            <div className="mt-8 flex items-center gap-2 text-slate-300">
              <Lock size={12} />
              <p className="text-[11px]">رسائلك محمية ومشفرة</p>
              <Lock size={12} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MessagesPage;
