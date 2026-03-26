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

// ─── tiny components ──────────────────────────────────────────────────────────
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
    {name.charAt(0).toUpperCase() || '?'}
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const MessagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const echo = useEcho();

  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [message, setMessage]         = useState('');
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState<'open' | 'pending' | 'resolved'>('open');
  const [isPrivate, setIsPrivate]     = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

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

  // ── real-time ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!echo) return;
    echo.private('messages').listen('.NewMessageEvent', (e: { message: Message }) => {
      if (e.message.conversation_id === selectedId)
        queryClient.setQueryData(['messages', selectedId],
          (old: Message[] | undefined) => old ? [...old, e.message] : [e.message]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => echo.leave('messages');
  }, [echo, selectedId, queryClient]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleSelect = (id: number) => { setSelectedId(id); setMobileShowChat(true); };
  const handleSend   = (e?: React.FormEvent) => {
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

  const filterLabels: Record<string, string> = {
    open: 'نشطة', pending: 'معلقة', resolved: 'مكتملة',
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex bg-white rounded-2xl border border-slate-200 shadow-lg font-cairo"
         style={{ height: 'calc(100vh - 8.5rem)', minHeight: 0 }}>

      {/* ════════════════════════════════════════════════════════
          CONVERSATION LIST  (right in RTL)
      ════════════════════════════════════════════════════════ */}
      <div className={cn(
        'flex flex-col border-l border-slate-200 bg-slate-50 flex-shrink-0',
        'w-full lg:w-[330px] xl:w-[360px]',
        mobileShowChat ? 'hidden lg:flex' : 'flex'
      )}>

        {/* header */}
        <div className="h-[60px] flex items-center justify-between px-4 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Av name={user?.name ?? 'U'} size={36} />
            <span className="text-[14px] font-bold text-slate-700">{user?.name ?? 'المستخدم'}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
              <Filter size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* search */}
        <div className="px-3 py-2.5 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في المحادثات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pr-8 pl-3 rounded-xl bg-slate-100 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 border border-transparent focus:border-indigo-300 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* filter tabs */}
        <div className="flex gap-1.5 px-3 py-2 bg-white border-b border-slate-100 flex-shrink-0">
          {(['open','pending','resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                filter === f
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="animate-spin text-indigo-500" size={20} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
              <MessageSquare size={32} className="text-slate-200" />
              <p className="text-[13px]">{search ? 'لا نتائج' : 'لا توجد محادثات'}</p>
            </div>
          ) : filtered.map(conv => {
            const active = selectedId === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 transition-colors text-right border-b border-slate-50',
                  active ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'
                )}
              >
                {/* left accent bar */}
                {active && <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-indigo-600 rounded-l" />}

                <div className="relative flex-shrink-0">
                  <Av name={conv.client?.name ?? ''} size={46} />
                  {/* source dot */}
                  <div className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn('text-[13.5px] truncate', active ? 'font-bold text-indigo-700' : 'font-semibold text-slate-800')}>
                      {conv.client?.name ?? 'مجهول'}
                    </span>
                    <span className={cn('text-[11px] flex-shrink-0 mr-1', conv.unread_count > 0 ? 'text-indigo-600 font-bold' : 'text-slate-400')}>
                      {fmtTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] text-slate-400 truncate">
                      {conv.last_message || 'ابدأ المحادثة...'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center px-1">
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

      {/* ════════════════════════════════════════════════════════
          CHAT AREA  (left in RTL)
      ════════════════════════════════════════════════════════ */}
      <div className={cn('flex-1 flex flex-col min-w-0', mobileShowChat ? 'flex' : 'hidden lg:flex')}>
        {selectedId ? (
          <>
            {/* chat header */}
            <div className="h-[60px] flex items-center justify-between px-4 bg-white border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button onClick={() => setMobileShowChat(false)}
                  className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors">
                  <ArrowRight size={20} />
                </button>
                <Av name={selectedConv?.client?.name ?? ''} size={38} />
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-slate-800 truncate leading-tight">
                    {selectedConv?.client?.name ?? 'محادثة'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {selectedConv?.client?.phone}
                    {selectedConv?.assigned_user && (
                      <span className="text-indigo-500 mr-1">• {selectedConv.assigned_user.name}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {[<Video size={18}/>, <Phone size={18}/>, <Search size={18}/>, <MoreVertical size={18}/>].map((icon, i) => (
                  <button key={i} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto flex flex-col gap-[3px] px-4 lg:px-10 py-4"
              style={{
                backgroundColor: '#f0f2f5',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23cbd5e1' fill-opacity='0.18'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {loadingMsgs ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-indigo-500" size={26} />
                  <p className="text-[13px] text-slate-400">تحميل الرسائل...</p>
                </div>
              ) : msgGroups.map(({ date, msgs }) => (
                <React.Fragment key={date}>
                  {/* date separator */}
                  <div className="flex items-center justify-center my-3">
                    <span className="bg-white/80 backdrop-blur-sm text-slate-500 text-[11.5px] font-medium px-4 py-1 rounded-full shadow-sm">
                      {date}
                    </span>
                  </div>

                  {msgs.map(msg => {
                    const isSent = msg.direction === 'out' && !msg.is_private;
                    const isNote = msg.is_private;

                    if (isNote) return (
                      <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex justify-center my-1">
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[12px] px-4 py-2 rounded-xl flex items-center gap-2 max-w-[80%] italic shadow-sm">
                          <Lock size={11} />
                          ملاحظة داخلية: {msg.content}
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
                        <div className={cn(
                          'relative max-w-[70%] lg:max-w-[58%] px-3 pt-[6px] pb-[6px] shadow-sm',
                          isSent
                            ? 'bg-[#d9fdd3] rounded-2xl rounded-tr-sm'
                            : 'bg-white rounded-2xl rounded-tl-sm border border-slate-100'
                        )}>
                          {/* bubble tail */}
                          {isSent ? (
                            <div className="absolute top-0 -right-[7px] w-0 h-0"
                              style={{ borderLeft: '8px solid #d9fdd3', borderBottom: '8px solid transparent' }} />
                          ) : (
                            <div className="absolute top-0 -left-[7px] w-0 h-0"
                              style={{ borderRight: '8px solid white', borderBottom: '8px solid transparent' }} />
                          )}

                          <p className="text-[13.5px] leading-[1.5] whitespace-pre-wrap break-words text-slate-800">
                            {msg.content}
                          </p>

                          <div className="flex items-center justify-end gap-1 mt-[3px]">
                            <span className="text-[10.5px] text-slate-400">
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
                  <div className="bg-[#d9fdd3] rounded-2xl rounded-tr-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i*150}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* input */}
            <div className={cn(
              'flex-shrink-0 px-3 py-2 flex items-end gap-2 border-t border-slate-100',
              isPrivate ? 'bg-amber-50' : 'bg-white'
            )}>
              {/* emoji + attach */}
              <div className="flex items-center gap-0.5 flex-shrink-0 pb-1">
                <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <Smile size={20} />
                </button>
                <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <Paperclip size={20} />
                </button>
              </div>

              {/* textarea */}
              <div className="flex-1 relative">
                {isPrivate && (
                  <div className="absolute -top-6 right-0 text-[10.5px] text-amber-600 font-medium flex items-center gap-1">
                    <Lock size={9}/> ملاحظة داخلية — لن تُرسل للعميل
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
                  placeholder={isPrivate ? 'اكتب ملاحظة داخلية...' : 'اكتب رسالة'}
                  className={cn(
                    'w-full min-h-[44px] max-h-[120px] px-4 pr-10 py-[11px] rounded-2xl text-[14px] focus:outline-none resize-none leading-snug placeholder:text-slate-400 text-slate-800 transition-all',
                    isPrivate
                      ? 'bg-amber-100 border border-amber-300 focus:border-amber-400'
                      : 'bg-slate-100 border border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10'
                  )}
                />
                {/* private note toggle inside input */}
                <button
                  type="button"
                  onClick={() => setIsPrivate(v => !v)}
                  className={cn(
                    'absolute left-3 bottom-[10px] w-6 h-6 flex items-center justify-center rounded-full transition-colors',
                    isPrivate ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  <Lock size={14} />
                </button>
              </div>

              {/* send / mic */}
              <div className="flex-shrink-0 pb-0.5">
                <AnimatePresence mode="wait">
                  {message.trim() ? (
                    <motion.button
                      key="send"
                      type="button"
                      onClick={() => handleSend()}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      disabled={sendMutation.isPending}
                      className="w-11 h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
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
                      transition={{ duration: 0.1 }}
                      className="w-11 h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      <Mic size={18} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          /* empty state */
          <div className="flex-1 flex-col items-center justify-center gap-5 select-none hidden lg:flex"
               style={{ backgroundColor: '#f0f2f5', backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23cbd5e1' fill-opacity='0.18'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
            <div className="w-36 h-36 rounded-full bg-white flex items-center justify-center shadow-xl shadow-slate-200">
              <MessageSquare size={64} className="text-indigo-200" />
            </div>
            <div className="text-center max-w-xs px-6">
              <h2 className="text-[20px] font-bold text-slate-700 mb-2">صندوق رسائل الفريق</h2>
              <p className="text-[13.5px] text-slate-400 leading-relaxed">
                اختر محادثة من القائمة للتواصل مع العملاء عبر واتساب في الوقت الفعلي.
              </p>
            </div>
            <div className="flex items-center gap-5 mt-1">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 text-[12px] text-slate-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                متصل بواتساب
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 text-[12px] text-slate-500 font-medium">
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
