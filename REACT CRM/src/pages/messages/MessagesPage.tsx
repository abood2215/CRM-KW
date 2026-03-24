import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Conversation, Message, User } from '../../types';
import { 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  CheckCheck, 
  Check, 
  Clock, 
  User as UserIcon,
  Search as SearchIcon,
  ChevronRight,
  Filter,
  Users,
  Eye,
  Settings2,
  Lock,
  Loader2,
  Trash2,
  Plus,
  MessageSquare,
  CheckSquare
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/useAuthStore';
import { useEcho } from '../../hooks/useEcho';
import { format, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const MessagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const echo = useEcho();
  
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'open' | 'resolved' | 'pending'>('open');
  const [isPrivate, setIsPrivate] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: conversations = [], isLoading: loadingConvs } = useQuery<Conversation[]>({
    queryKey: ['conversations', filter],
    queryFn: async () => {
      const { data } = await api.get('/conversations', { params: { status: filter } });
      return data.conversations;
    },
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', selectedId],
    queryFn: async () => {
      const { data } = await api.get(`/conversations/${selectedId}/messages`);
      return data.messages;
    },
    enabled: !!selectedId,
  });

  // Mutations
  const sendMessage = useMutation({
    mutationFn: async (payload: { content: string; is_private: boolean }) => {
      return api.post(`/conversations/${selectedId}/messages`, payload);
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => toast.error('فشل إرسال الرسالة'),
  });

  // Real-time
  useEffect(() => {
    if (!echo) return;

    const channel = echo.private(`messages`)
      .listen('.NewMessageEvent', (e: { message: Message }) => {
        if (e.message.conversation_id === selectedId) {
          queryClient.setQueryData(['messages', selectedId], (old: Message[] | undefined) => {
            return old ? [...old, e.message] : [e.message];
          });
        }
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });

    return () => {
      echo.leave(`messages`);
    };
  }, [echo, selectedId, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedId) return;
    sendMessage.mutate({ content: message, is_private: isPrivate });
  };

  const selectedConversation = conversations.find(c => c.id === selectedId);

  return (
    <div className="h-[calc(100vh-140px)] bg-white rounded-[2rem] border border-slate-100 shadow-2xl flex overflow-hidden font-cairo">
      {/* 1. Sidebar: Conversation List */}
      <div className="w-[380px] border-l border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-black text-slate-800 mb-4">المحادثات</h2>
          <div className="flex gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100 mb-4">
            {(['open', 'pending', 'resolved'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  filter === s 
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {s === 'open' ? 'نشطة' : s === 'pending' ? 'معلقة' : 'مكتملة'}
              </button>
            ))}
          </div>
          <div className="relative">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="بحث في الأسماء أو الرسائل..."
              className="w-full h-11 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loadingConvs ? (
            <div className="p-10 text-center"><Loader2 className="animate-spin inline-block text-indigo-500" /></div>
          ) : (
            <div className="divide-y divide-slate-50">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "w-full p-5 flex items-start gap-4 transition-all hover:bg-white text-right relative group",
                    selectedId === conv.id && "bg-white shadow-inner"
                  )}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                      {conv.client?.name.charAt(0)}
                    </div>
                    {conv.assigned_user_id && (
                       <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                          <UserIcon size={10} />
                       </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-black text-slate-800 truncate">{conv.client?.name}</h4>
                      <span className="text-[10px] font-bold text-slate-400">
                        {conv.last_message_at ? format(new Date(conv.last_message_at), 'HH:mm', { locale: ar }) : ''}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-400 truncate line-clamp-1">
                      {conv.last_message || 'لا توجد رسائل'}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                  {selectedId === conv.id && (
                     <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Chat Area: Window & Controls */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedId ? (
          <>
            {/* Chat Header */}
            <div className="h-20 px-8 border-b border-slate-100 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-700 font-bold border border-slate-100 shadow-sm">
                  {selectedConversation?.client?.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">{selectedConversation?.client?.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-slate-400">واتساب • {selectedConversation?.client?.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-11 h-11 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center border border-slate-100">
                  <Phone size={20} />
                </button>
                <button className="w-11 h-11 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center border border-slate-100">
                  <Plus size={20} />
                </button>
                <button className="w-11 h-11 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center border border-slate-100">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#fafbfc] scrollbar-thin"
              style={{ backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)', backgroundSize: '30px 30px' }}
            >
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                   <Loader2 className="animate-spin text-indigo-500 h-8 w-8" />
                   <p className="text-slate-400 text-sm font-medium">تحميل الرسائل والمرفقات...</p>
                </div>
              ) : messages.map((msg, idx) => {
                const isSystem = msg.direction === 'out' && msg.is_private;
                const isMe = msg.direction === 'out' && !msg.is_private;
                const isFromClient = msg.direction === 'in';

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[75%]",
                      isMe ? "self-end items-end" : isFromClient ? "self-start items-start" : "self-center w-full max-w-[90%] items-center"
                    )}
                  >
                    {isSystem ? (
                      <div className="bg-amber-50/80 border border-amber-100 text-amber-800 text-[10px] font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-sm italic">
                        <Lock size={12} />
                        <span>ملاحظة داخلية: {msg.content}</span>
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "px-6 py-4 rounded-[1.5rem] shadow-[0_4px_15px_-3px_rgba(0,0,0,0.05)] relative group",
                          isMe 
                            ? "bg-indigo-600 text-white rounded-tl-[0.25rem] shadow-indigo-600/10" 
                            : "bg-white text-slate-800 border border-slate-100 rounded-tr-[0.25rem]"
                        )}>
                          <p className="text-sm font-medium leading-[1.6] whitespace-pre-wrap">{msg.content}</p>
                          <div className={cn(
                            "absolute bottom-2 hidden group-hover:block transition-all",
                            isMe ? "left-2" : "right-2"
                          )}>
                             <CheckCheck size={14} className={isMe ? "text-indigo-200" : "text-slate-200"} />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1.5 uppercase tracking-wider">
                           {format(new Date(msg.sent_at), 'HH:mm')}
                           {isMe && <CheckCheck size={12} className="text-emerald-500" />}
                        </span>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Message Input Controls */}
            <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-3 mb-4">
                 <button 
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={cn(
                    "h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border",
                    isPrivate 
                      ? "bg-amber-600 text-white border-amber-700 shadow-lg shadow-amber-600/20" 
                      : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                  )}
                 >
                  <Lock size={14} />
                  <span>ملاحظة داخلية</span>
                 </button>
                 <div className="h-4 w-px bg-slate-100" />
                 <button className="h-9 px-4 rounded-xl bg-slate-50 text-slate-500 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 transition-all flex items-center gap-2">
                    <CheckSquare size={14} />
                    <span>الردود الجاهزة (/)</span>
                 </button>
              </div>

              <form onSubmit={handleSend} className="flex items-end gap-3">
                <div className="flex-1 relative flex flex-col">
                  <textarea
                    rows={1}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    placeholder={isPrivate ? "اكتب ملاحظة داخلية لن تظهر للعميل..." : "اكتب رسالتك لمركز مطمئنة..."}
                    className={cn(
                      "w-full h-14 max-h-32 px-6 py-4 rounded-2xl text-sm font-medium focus:outline-none transition-all placeholder:text-slate-300 scrollbar-thin resize-none",
                      isPrivate 
                        ? "bg-amber-50 border border-amber-200 focus:ring-4 focus:ring-amber-500/10" 
                        : "bg-slate-100 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    )}
                  />
                  <div className="absolute left-4 bottom-3 flex items-center gap-2">
                    <button type="button" className="p-1 px-2 text-slate-400 hover:text-indigo-600"><Paperclip size={18} /></button>
                    <button type="button" className="p-1 px-2 text-slate-400 hover:text-indigo-600"><Smile size={18} /></button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!message.trim() || sendMessage.isPending}
                  className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Send size={22} className="-rotate-45 ml-1" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 p-12 text-center">
            <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/5 mb-10 group animate-bounce-slow">
               <MessageSquare size={80} className="text-indigo-100 group-hover:text-indigo-200 transition-colors" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4">اختيار محادثة للبدء</h2>
            <p className="text-slate-400 max-w-sm font-medium leading-relaxed">
              قم باختيار محادثة من القائمة الجانبية للتواصل مع العميل في الوقت الفعلي. 
              جميع المحادثات موثقة ومحمية في نظامنا.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
               <div className="px-5 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-xs font-bold text-slate-500 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                  <span>نظام الواتساب متصل الآن</span>
               </div>
               <div className="px-5 py-3 bg-indigo-600 border border-indigo-700 rounded-2xl shadow-xl text-xs font-bold text-white flex items-center gap-3 cursor-pointer hover:bg-indigo-700 transition-all">
                  <Search size={14} />
                  <span>البحث عن عميل قديم</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
