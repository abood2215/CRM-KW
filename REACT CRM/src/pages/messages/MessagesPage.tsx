import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Conversation, Message } from '../../types';
import {
  Search, Send, Paperclip, Smile, MoreVertical, Phone,
  CheckCheck, Check, Clock, Loader2, MessageSquare, Lock,
  ArrowRight, Mic, Video, Filter
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/useAuthStore';
import { useEcho } from '../../hooks/useEcho';
import { format, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── helpers ──────────────────────────────────────────────────────────────────
const PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];
const avatarBg = (name = '') => PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];

const fmtTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'أمس';
  return format(d, 'dd/MM/yy');
};

const fmtSep = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return 'اليوم';
  if (isYesterday(d)) return 'أمس';
  return format(d, 'EEEE، d MMMM', { locale: ar });
};

const Tick = ({ status }: { status?: string }) => {
  if (status === 'read')      return <CheckCheck size={14} className="text-indigo-400 flex-shrink-0" />;
  if (status === 'delivered') return <CheckCheck size={14} className="text-slate-400 flex-shrink-0" />;
  if (status === 'sent' || status === 'received') return <Check size={14} className="text-slate-400 flex-shrink-0" />;
  return <Clock size={11} className="text-slate-300 flex-shrink-0" />;
};

const Av = ({ name = '', size = 42 }: { name?: string; size?: number }) => (
  <div
    className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 select-none"
    style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: avatarBg(name) }}
  >
    {(name.charAt(0) || '?').toUpperCase()}
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const MessagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const echo = useEcho();

  const [selectedId, setSelectedId]     = useState<number | null>(null);
  const [message, setMessage]           = useState('');
  const [search, setSearch]             = useState('');
  const [filter, setFilter]             = useState<'open' | 'pending' | 'resolved'>('open');
  const [isPrivate, setIsPrivate]       = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  // Track whether we're on desktop (≥1024px) — bypasses Tailwind JIT issue
  const [isDesktop, setIsDesktop]       = useState(window.innerWidth >= 1024);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── queries ──────────────────────────────────────────────────────────────
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
    mutationFn: (p: { content: string; is_private: boolean }) =>
      api.post(`/conversations/${selectedId}/messages`, p),
    onSuccess: () => {
      setMessage('');
      if (inputRef.current) inputRef.current.style.height = '44px';
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => toast.error('فشل إرسال الرسالة'),
  });

  // ── realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!echo) return;
    const channel = echo.channel('conversations');
    channel.listen('.NewMessageEvent', (e: { message: Message }) => {
      if (e.message.conversation_id === selectedId)
        queryClient.setQueryData(['messages', selectedId],
          (old: Message[] | undefined) => old ? [...old, e.message] : [e.message]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => {
      channel.stopListening('.NewMessageEvent');
    };
  }, [echo, selectedId, queryClient]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleSelect = (id: number) => { setSelectedId(id); setMobileShowChat(true); };
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || !selectedId || sendMutation.isPending) return;
    sendMutation.mutate({ content: message, is_private: isPrivate });
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const selectedConv = conversations.find(c => c.id === selectedId);

  const filtered = useMemo(() =>
    conversations.filter(c =>
      !search ||
      c.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.client?.phone?.includes(search) ||
      c.last_message?.toLowerCase().includes(search.toLowerCase())
    ), [conversations, search]);

  const msgGroups = useMemo(() => {
    const g: { date: string; msgs: Message[] }[] = [];
    messages.forEach(m => {
      const d = fmtSep(m.sent_at);
      const last = g[g.length - 1];
      if (last?.date === d) last.msgs.push(m);
      else g.push({ date: d, msgs: [m] });
    });
    return g;
  }, [messages]);

  // Visibility logic (works without Tailwind JIT)
  const showSidebar = isDesktop || !mobileShowChat;
  const showChat    = isDesktop || mobileShowChat;

  // Container height: header(4rem) + padding top(2rem on desktop / 1rem mobile) + padding bottom(2rem desktop / 6rem mobile)
  const containerHeight = isDesktop ? 'calc(100vh - 8rem)' : 'calc(100vh - 11rem)';

  // Chat background pattern
  const chatBg = {
    backgroundColor: '#f0f2f5',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23cbd5e1' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex bg-white rounded-2xl border border-slate-200 shadow-lg font-cairo overflow-hidden"
      style={{ height: containerHeight }}
    >

      {/* ════════════════════════════════════════════════
          SIDEBAR — Conversation List
      ════════════════════════════════════════════════ */}
      <div
        className="flex flex-col border-l border-slate-200 bg-white flex-shrink-0"
        style={{
          width: isDesktop ? '320px' : '100%',
          display: showSidebar ? 'flex' : 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 border-b border-slate-100 flex-shrink-0" style={{ height: 60 }}>
          <div className="flex items-center gap-2">
            <Av name={user?.name ?? 'U'} size={36} />
            <span className="text-sm font-bold text-slate-700 truncate">{user?.name ?? ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
              <Filter size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث في المحادثات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pr-8 pl-3 bg-slate-100 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition-all border border-transparent"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-slate-100 flex-shrink-0">
          {(['open', 'pending', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-1 rounded-lg text-xs font-semibold transition-all',
                filter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              {f === 'open' ? 'نشطة' : f === 'pending' ? 'معلقة' : 'مكتملة'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="animate-spin text-indigo-500" size={20} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
              <MessageSquare size={32} className="text-slate-200" />
              <p className="text-xs">{search ? 'لا نتائج' : 'لا توجد محادثات'}</p>
            </div>
          ) : filtered.map(conv => {
            const active = selectedId === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className="w-full flex items-center gap-3 px-3 py-3 border-b border-slate-50 text-right transition-colors"
                style={{ backgroundColor: active ? '#eef2ff' : 'white' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'white'; }}
              >
                <div className="relative flex-shrink-0">
                  <Av name={conv.client?.name ?? ''} size={46} />
                  <div className="absolute bottom-0 left-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn('text-sm truncate', active ? 'font-bold text-indigo-700' : 'font-semibold text-slate-800')}>
                      {conv.client?.name ?? 'مجهول'}
                    </span>
                    <span className={cn('text-xs flex-shrink-0 mr-2', conv.unread_count > 0 ? 'text-indigo-600 font-bold' : 'text-slate-400')}>
                      {fmtTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-slate-400 truncate">{conv.last_message || 'ابدأ المحادثة...'}</p>
                    {conv.unread_count > 0 && (
                      <span className="flex-shrink-0 bg-indigo-600 text-white rounded-full font-bold flex items-center justify-center"
                        style={{ minWidth: 18, height: 18, fontSize: 10, padding: '0 4px' }}>
                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          CHAT AREA
      ════════════════════════════════════════════════ */}
      <div
        className="flex flex-col min-w-0"
        style={{ flex: 1, display: showChat ? 'flex' : 'none' }}
      >
        {selectedId ? (
          <>
            {/* Chat header */}
            <div
              className="flex items-center justify-between px-4 bg-white border-b border-slate-100 flex-shrink-0"
              style={{ height: 60 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {!isDesktop && (
                  <button onClick={() => setMobileShowChat(false)}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors flex-shrink-0">
                    <ArrowRight size={20} />
                  </button>
                )}
                <Av name={selectedConv?.client?.name ?? ''} size={38} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {selectedConv?.client?.name ?? 'محادثة'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {selectedConv?.client?.phone}
                    {selectedConv?.assigned_user && (
                      <span className="text-indigo-500"> • {selectedConv.assigned_user.name}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {([<Video size={17}/>, <Phone size={17}/>, <Search size={17}/>, <MoreVertical size={17}/>] as React.ReactNode[]).map((icon, i) => (
                  <button key={i} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto flex flex-col gap-0.5 py-4"
              style={{ ...chatBg, paddingRight: isDesktop ? 60 : 16, paddingLeft: isDesktop ? 60 : 16 }}
            >
              {loadingMsgs ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-indigo-500" size={26} />
                  <p className="text-sm text-slate-400">تحميل الرسائل...</p>
                </div>
              ) : msgGroups.map(({ date, msgs }) => (
                <React.Fragment key={date}>
                  <div className="flex items-center justify-center my-3">
                    <span className="bg-white/80 backdrop-blur-sm text-slate-500 text-xs font-medium px-4 py-1 rounded-full shadow-sm">
                      {date}
                    </span>
                  </div>

                  {msgs.map(msg => {
                    const isSent = msg.direction === 'out' && !msg.is_private;
                    const isNote = msg.is_private;

                    if (isNote) return (
                      <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex justify-center my-1">
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2 rounded-xl flex items-center gap-2 italic shadow-sm" style={{ maxWidth: '80%' }}>
                          <Lock size={11} className="flex-shrink-0" />
                          ملاحظة: {msg.content}
                        </div>
                      </motion.div>
                    );

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.12 }}
                        className={cn('flex', isSent ? 'justify-start' : 'justify-end')}
                      >
                        <div
                          className={cn(
                            'relative px-3 pt-1.5 pb-1.5 shadow-sm',
                            isSent ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'
                          )}
                          style={{
                            maxWidth: isDesktop ? '58%' : '80%',
                            backgroundColor: isSent ? '#d9fdd3' : '#ffffff',
                            border: isSent ? 'none' : '1px solid #e2e8f0',
                          }}
                        >
                          {/* tail */}
                          {isSent ? (
                            <div className="absolute top-0 -right-2 w-0 h-0"
                              style={{ borderLeft: '8px solid #d9fdd3', borderBottom: '8px solid transparent' }} />
                          ) : (
                            <div className="absolute top-0 -left-2 w-0 h-0"
                              style={{ borderRight: '8px solid #ffffff', borderBottom: '8px solid transparent' }} />
                          )}
                          {isSent && msg.sender_name && (
                            <p className="text-[10px] font-bold text-emerald-700 mb-0.5">
                              {msg.sender_name}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-800">
                            {msg.content}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-slate-400" style={{ fontSize: 10 }}>
                              {format(new Date(msg.sent_at), 'HH:mm')}
                            </span>
                            {isSent && <Tick status={msg.status} />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </React.Fragment>
              ))}

              {sendMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i*150}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div
              className={cn('flex-shrink-0 flex items-end gap-2 px-3 py-2 border-t border-slate-100', isPrivate ? 'bg-amber-50' : 'bg-white')}
            >
              <div className="flex items-center gap-0.5 flex-shrink-0 pb-1">
                <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <Smile size={20} />
                </button>
                <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <Paperclip size={20} />
                </button>
              </div>

              <div className="flex-1 relative">
                {isPrivate && (
                  <div className="absolute -top-6 right-0 text-xs text-amber-600 font-medium flex items-center gap-1">
                    <Lock size={9}/> ملاحظة داخلية
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={message}
                  onChange={e => {
                    setMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder={isPrivate ? 'اكتب ملاحظة داخلية...' : 'اكتب رسالة...'}
                  className={cn(
                    'w-full min-h-11 max-h-28 px-4 py-2.5 rounded-2xl text-sm focus:outline-none resize-none leading-snug transition-all placeholder-slate-400 text-slate-800',
                    isPrivate
                      ? 'bg-amber-100 border border-amber-300'
                      : 'bg-slate-100 border border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'
                  )}
                  style={{ paddingLeft: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setIsPrivate(v => !v)}
                  className={cn('absolute bottom-2.5 flex items-center justify-center rounded-full transition-colors', isPrivate ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600')}
                  style={{ left: 10, width: 20, height: 20 }}
                >
                  <Lock size={13} />
                </button>
              </div>

              <div className="flex-shrink-0 pb-0.5">
                <AnimatePresence mode="wait">
                  {message.trim() ? (
                    <motion.button key="send" type="button" onClick={() => handleSend()}
                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.1 }}
                      disabled={sendMutation.isPending}
                      className="w-11 h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60">
                      <Send size={18} className="-rotate-45 translate-x-0.5" />
                    </motion.button>
                  ) : (
                    <motion.button key="mic" type="button"
                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.1 }}
                      className="w-11 h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">
                      <Mic size={18} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-5 select-none" style={chatBg}>
            <div className="rounded-full bg-white flex items-center justify-center shadow-xl shadow-slate-200"
              style={{ width: 130, height: 130 }}>
              <MessageSquare size={58} className="text-indigo-300" />
            </div>
            <div className="text-center px-6" style={{ maxWidth: 320 }}>
              <h2 className="text-xl font-bold text-slate-700 mb-2">صندوق رسائل الفريق</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                اختر محادثة من القائمة للتواصل مع عملائك عبر واتساب في الوقت الفعلي.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 text-xs text-slate-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                متصل بواتساب
              </div>
              <div className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 text-xs text-slate-500 font-medium">
                <Lock size={11} className="text-slate-400" />
                مشفّر
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
