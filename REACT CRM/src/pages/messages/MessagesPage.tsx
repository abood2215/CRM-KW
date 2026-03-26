import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Conversation, Message } from '../../types';
import {
  Search, Send, Paperclip, Smile, MoreVertical, Phone,
  CheckCheck, Check, Clock, Loader2, MessageSquare, Lock,
  ArrowRight, Users, Mic, Plus, Video, ChevronDown
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/useAuthStore';
import { useEcho } from '../../hooks/useEcho';
import { format, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── Avatar color palette ─────────────────────────────────────────────────────
const PALETTE = [
  '#e17055', '#00b894', '#0984e3', '#6c5ce7',
  '#fd79a8', '#00cec9', '#fdcb6e', '#d63031',
];
const getColor = (name = '') => PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmtConvTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'أمس';
  return format(d, 'dd/MM/yy');
};

const fmtDateSep = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return 'اليوم';
  if (isYesterday(d)) return 'أمس';
  return format(d, 'EEEE، d MMMM', { locale: ar });
};

// ─── Tick icon ────────────────────────────────────────────────────────────────
const Tick = ({ status }: { status?: string }) => {
  if (status === 'read') return <CheckCheck size={14} className="text-[#53bdeb]" />;
  if (status === 'delivered') return <CheckCheck size={14} className="text-[#8696a0]" />;
  if (status === 'sent' || status === 'received') return <Check size={14} className="text-[#8696a0]" />;
  return <Clock size={11} className="text-[#8696a0]" />;
};

// ─── WhatsApp-style Avatar ────────────────────────────────────────────────────
const WaAvatar = ({ name = '', size = 40 }: { name?: string; size?: number }) => (
  <div
    className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
    style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: getColor(name) }}
  >
    {name.charAt(0).toUpperCase() || '?'}
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const MessagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const echo = useEcho();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'open' | 'pending' | 'resolved'>('open');
  const [isPrivate, setIsPrivate] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: conversations = [], isLoading: loadingConvs } = useQuery<Conversation[]>({
    queryKey: ['conversations', filter],
    queryFn: async () => {
      const { data } = await api.get('/conversations', { params: { status: filter } });
      return data.conversations;
    },
    refetchInterval: 30_000,
  });

  const { data: messages = [], isLoading: loadingMsgs } = useQuery<Message[]>({
    queryKey: ['messages', selectedId],
    queryFn: async () => {
      const { data } = await api.get(`/conversations/${selectedId}/messages`);
      return data.messages;
    },
    enabled: !!selectedId,
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { content: string; is_private: boolean }) =>
      api.post(`/conversations/${selectedId}/messages`, payload),
    onSuccess: () => {
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '42px';
      }
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => toast.error('فشل إرسال الرسالة'),
  });

  // ── Real-time ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!echo) return;
    echo.private('messages').listen('.NewMessageEvent', (e: { message: Message }) => {
      if (e.message.conversation_id === selectedId) {
        queryClient.setQueryData(
          ['messages', selectedId],
          (old: Message[] | undefined) => (old ? [...old, e.message] : [e.message])
        );
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => echo.leave('messages');
  }, [echo, selectedId, queryClient]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelect = (id: number) => {
    setSelectedId(id);
    setMobileShowChat(true);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || !selectedId || sendMutation.isPending) return;
    sendMutation.mutate({ content: message, is_private: isPrivate });
  };

  // ── Derived data ──────────────────────────────────────────────────────────────
  const selectedConv = conversations.find((c) => c.id === selectedId);

  const filtered = useMemo(
    () =>
      conversations.filter((c) =>
        !search ||
        c.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.client?.phone?.includes(search) ||
        c.last_message?.toLowerCase().includes(search.toLowerCase())
      ),
    [conversations, search]
  );

  const msgGroups = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    messages.forEach((m) => {
      const d = fmtDateSep(m.sent_at);
      const last = groups[groups.length - 1];
      if (last?.date === d) last.msgs.push(m);
      else groups.push({ date: d, msgs: [m] });
    });
    return groups;
  }, [messages]);

  const filterMap = {
    open: { label: 'نشطة', color: 'bg-[#00a884] text-white' },
    pending: { label: 'معلقة', color: 'bg-amber-500 text-white' },
    resolved: { label: 'مكتملة', color: 'bg-slate-400 text-white' },
  } as const;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200 font-cairo"
      style={{ height: 'calc(100vh - 9rem)' }}
    >

      {/* ═══════════════════════════════════════════════════════════════════════
          RIGHT PANEL — Conversation List  (in RTL this appears on the right)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          'flex-shrink-0 flex flex-col border-l border-[#d1d7db]',
          'w-full lg:w-[360px] xl:w-[390px]',
          mobileShowChat ? 'hidden lg:flex' : 'flex'
        )}
        style={{ backgroundColor: '#111b21' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ backgroundColor: '#202c33' }}
        >
          <div className="flex items-center gap-3">
            <WaAvatar name={user?.name ?? 'U'} size={40} />
            <span className="text-[15px] font-semibold text-[#e9edef]">
              {user?.name ?? 'أنت'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="w-9 h-9 flex items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10 transition-colors">
              <Users size={19} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10 transition-colors">
              <MessageSquare size={19} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10 transition-colors">
              <MoreVertical size={19} />
            </button>
          </div>
        </div>

        {/* ── Filter chips ── */}
        <div
          className="flex items-center gap-2 px-4 py-2 flex-shrink-0 overflow-x-auto scrollbar-hide"
          style={{ backgroundColor: '#111b21' }}
        >
          {(['open', 'pending', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-shrink-0 px-4 py-1 rounded-full text-[12.5px] font-semibold transition-all border',
                filter === f
                  ? filterMap[f].color + ' border-transparent'
                  : 'text-[#8696a0] border-[#8696a0]/40 hover:border-[#8696a0]/80'
              )}
            >
              {filterMap[f].label}
            </button>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="px-3 pb-2 flex-shrink-0" style={{ backgroundColor: '#111b21' }}>
          <div className="relative">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#8696a0' }}
            />
            <input
              type="text"
              placeholder="بحث أو بدء محادثة جديدة"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[35px] pr-9 pl-4 rounded-lg text-[14px] focus:outline-none placeholder:text-[#8696a0] text-[#d1d7db]"
              style={{ backgroundColor: '#202c33' }}
            />
          </div>
        </div>

        {/* ── Conversation List ── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111b21' }}>
          {loadingConvs ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="animate-spin" size={22} style={{ color: '#00a884' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
              <MessageSquare size={40} style={{ color: '#8696a0' }} />
              <p className="text-[13px]" style={{ color: '#8696a0' }}>
                {search ? 'لا توجد نتائج' : 'لا توجد محادثات'}
              </p>
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = selectedId === conv.id;
              const color = getColor(conv.client?.name ?? '');
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 transition-colors text-right relative"
                  style={{
                    backgroundColor: isActive ? '#2a3942' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = '#202c33';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Divider */}
                  <div
                    className="absolute bottom-0 right-[72px] left-0 h-px"
                    style={{ backgroundColor: '#ffffff0f' }}
                  />

                  {/* Avatar */}
                  <div
                    className="w-[49px] h-[49px] rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-lg"
                    style={{ backgroundColor: color }}
                  >
                    {conv.client?.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-[2px]">
                      <span className="text-[15px] font-normal truncate" style={{ color: '#e9edef' }}>
                        {conv.client?.name ?? 'مجهول'}
                      </span>
                      <span
                        className="text-[11.5px] flex-shrink-0 mr-1"
                        style={{ color: conv.unread_count > 0 ? '#00a884' : '#8696a0' }}
                      >
                        {fmtConvTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className="text-[13px] truncate leading-snug"
                        style={{ color: '#8696a0' }}
                      >
                        {conv.last_message || 'ابدأ المحادثة...'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span
                          className="flex-shrink-0 min-w-[20px] h-5 rounded-full text-[11px] font-semibold flex items-center justify-center px-1"
                          style={{ backgroundColor: '#00a884', color: '#111b21' }}
                        >
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
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT PANEL — Chat Area  (in RTL this appears on the left)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0',
          mobileShowChat ? 'flex' : 'hidden lg:flex'
        )}
      >
        {selectedId ? (
          <>
            {/* ── Chat Header ── */}
            <div
              className="flex items-center justify-between px-4 py-[10px] flex-shrink-0"
              style={{ backgroundColor: '#202c33' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile back */}
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="lg:hidden w-8 h-8 flex items-center justify-center text-[#aebac1]"
                >
                  <ArrowRight size={22} />
                </button>
                <WaAvatar name={selectedConv?.client?.name ?? ''} size={40} />
                <div className="min-w-0 cursor-pointer">
                  <p className="text-[15px] font-medium text-[#e9edef] truncate leading-tight">
                    {selectedConv?.client?.name ?? 'محادثة'}
                  </p>
                  <p className="text-[12px] truncate" style={{ color: '#8696a0' }}>
                    {selectedConv?.client?.phone ?? ''}
                    {selectedConv?.assigned_user && (
                      <span style={{ color: '#00a884' }}>
                        {' '}• {selectedConv.assigned_user.name}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10 transition-colors">
                  <Video size={20} />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10 transition-colors">
                  <Phone size={20} />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10 transition-colors">
                  <Search size={20} />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* ── Messages Area ── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-[5%] lg:px-[8%] py-4 flex flex-col gap-[2px]"
              style={{
                backgroundColor: '#0b141a',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
              }}
            >
              {loadingMsgs ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-3">
                  <Loader2 className="animate-spin" size={28} style={{ color: '#00a884' }} />
                  <p className="text-[13px]" style={{ color: '#8696a0' }}>تحميل...</p>
                </div>
              ) : (
                msgGroups.map(({ date, msgs }) => (
                  <React.Fragment key={date}>
                    {/* Date separator */}
                    <div className="flex items-center justify-center my-4">
                      <span
                        className="px-4 py-[5px] rounded-lg text-[12px] font-medium shadow-sm"
                        style={{ backgroundColor: '#182229', color: '#8696a0' }}
                      >
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
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-center my-1"
                          >
                            <div
                              className="flex items-center gap-2 px-4 py-2 rounded-lg max-w-[80%] text-[12px] italic"
                              style={{ backgroundColor: '#2a2f32', color: '#8696a0' }}
                            >
                              <Lock size={11} style={{ color: '#8696a0' }} />
                              ملاحظة: {msg.content}
                            </div>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.12 }}
                          className={cn('flex mb-[2px]', isSent ? 'justify-start' : 'justify-end')}
                        >
                          <div
                            className={cn(
                              'relative max-w-[65%] lg:max-w-[55%] px-[9px] pt-[6px] pb-[8px] rounded-[7.5px] shadow-sm',
                              isSent ? 'rounded-tr-none' : 'rounded-tl-none'
                            )}
                            style={{
                              backgroundColor: isSent ? '#005c4b' : '#202c33',
                            }}
                          >
                            {/* Bubble tail */}
                            {isSent ? (
                              <div
                                className="absolute top-0 -right-[8px] w-0 h-0"
                                style={{
                                  borderLeft: '8px solid #005c4b',
                                  borderBottom: '8px solid transparent',
                                }}
                              />
                            ) : (
                              <div
                                className="absolute top-0 -left-[8px] w-0 h-0"
                                style={{
                                  borderRight: '8px solid #202c33',
                                  borderBottom: '8px solid transparent',
                                }}
                              />
                            )}

                            {/* Message text */}
                            <p
                              className="text-[14.2px] leading-[1.45] whitespace-pre-wrap break-words"
                              style={{ color: '#e9edef' }}
                            >
                              {msg.content}
                            </p>

                            {/* Footer: time + tick */}
                            <div className="flex items-center justify-end gap-1 mt-[4px] -mb-[2px]">
                              <span className="text-[11px]" style={{ color: '#8696a0' }}>
                                {format(new Date(msg.sent_at), 'HH:mm')}
                              </span>
                              {isSent && <Tick status={msg.status} />}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </React.Fragment>
                ))
              )}

              {/* Sending indicator */}
              {sendMutation.isPending && (
                <div className="flex justify-start">
                  <div
                    className="flex items-center gap-1.5 px-4 py-3 rounded-[7.5px] rounded-tr-none"
                    style={{ backgroundColor: '#005c4b' }}
                  >
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ backgroundColor: '#8696a0', animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Input Area ── */}
            <div
              className="flex-shrink-0 px-3 py-2 flex items-end gap-2"
              style={{ backgroundColor: '#202c33' }}
            >
              {/* Left icons */}
              <div className="flex items-center gap-1 flex-shrink-0 pb-[5px]">
                <button
                  type="button"
                  className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                  style={{ color: '#8696a0' }}
                >
                  <Smile size={22} />
                </button>
                <button
                  type="button"
                  className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                  style={{ color: '#8696a0' }}
                >
                  <Paperclip size={22} />
                </button>
              </div>

              {/* Textarea */}
              <div className="flex-1 relative">
                {isPrivate && (
                  <div
                    className="absolute -top-7 right-0 text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ backgroundColor: '#2a2f32', color: '#8696a0' }}
                  >
                    <Lock size={9} />
                    ملاحظة داخلية — لن تُرسل للعميل
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isPrivate ? 'اكتب ملاحظة داخلية...' : 'اكتب رسالة'}
                  className="w-full min-h-[42px] max-h-[140px] px-4 py-[11px] rounded-lg text-[15px] focus:outline-none resize-none leading-[1.35] placeholder:text-[#8696a0]"
                  style={{
                    backgroundColor: isPrivate ? '#2d2a22' : '#2a3942',
                    color: '#d1d7db',
                    border: isPrivate ? '1px solid #6b5900' : 'none',
                  }}
                />
                {/* Private note toggle — small icon inside input */}
                <button
                  type="button"
                  onClick={() => setIsPrivate((v) => !v)}
                  className="absolute left-3 bottom-[9px] w-6 h-6 flex items-center justify-center rounded-full transition-colors"
                  style={{ color: isPrivate ? '#f59e0b' : '#8696a0' }}
                  title="ملاحظة داخلية"
                >
                  <Lock size={15} />
                </button>
              </div>

              {/* Send / Mic */}
              <div className="flex-shrink-0 pb-[2px]">
                <AnimatePresence mode="wait">
                  {message.trim() ? (
                    <motion.button
                      key="send"
                      type="button"
                      onClick={() => handleSend()}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      disabled={sendMutation.isPending}
                      className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-60"
                      style={{ backgroundColor: '#00a884' }}
                    >
                      <Send size={20} className="-rotate-45 translate-x-0.5" style={{ color: '#fff' }} />
                    </motion.button>
                  ) : (
                    <motion.button
                      key="mic"
                      type="button"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                      style={{ backgroundColor: '#00a884' }}
                    >
                      <Mic size={22} style={{ color: '#fff' }} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          /* ── Empty state — desktop only ── */
          <div
            className="flex-1 flex-col items-center justify-center gap-5 select-none hidden lg:flex"
            style={{ backgroundColor: '#0b141a' }}
          >
            {/* WhatsApp Web–style center badge */}
            <div
              className="w-[200px] h-[200px] rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#182229' }}
            >
              <MessageSquare size={80} style={{ color: '#00a884', opacity: 0.7 }} />
            </div>
            <div className="text-center px-8 max-w-sm">
              <h2 className="text-[22px] font-light mb-2" style={{ color: '#e9edef' }}>
                صندوق الوارد للفريق
              </h2>
              <p className="text-[14px] leading-relaxed" style={{ color: '#8696a0' }}>
                أرسل واستقبل الرسائل مع عملائك عبر واتساب.<br />
                اختر محادثة للبدء.
              </p>
            </div>
            <div
              className="flex items-center gap-2 px-5 py-2 rounded-full text-[12.5px] font-medium mt-2"
              style={{ backgroundColor: '#182229', color: '#8696a0' }}
            >
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#00a884' }} />
              مشفّر ومحمي
              <Lock size={12} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
