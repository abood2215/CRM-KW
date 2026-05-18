import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Conversation, Message, WhatsappTemplate } from '../../types';
import {
  Search, Send, Paperclip, Smile, MoreVertical, Phone,
  CheckCheck, Check, Clock, Loader2, MessageSquare, Lock,
  ArrowRight, Mic, Video, Filter, Plus, X, LayoutTemplate, ChevronLeft, ChevronDown, RefreshCw
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/useAuthStore';
import { useEcho } from '../../hooks/useEcho';
import { format, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── countries (no Israel) ────────────────────────────────────────────────────
const flag = (c: string) => [...c.toUpperCase()].map(l => String.fromCodePoint(l.charCodeAt(0) + 127397)).join('');
const COUNTRIES = [
  // خليج وعرب
  { name: 'الكويت',        code: 'KW', dial: '965' },
  { name: 'السعودية',      code: 'SA', dial: '966' },
  { name: 'الإمارات',      code: 'AE', dial: '971' },
  { name: 'قطر',           code: 'QA', dial: '974' },
  { name: 'البحرين',       code: 'BH', dial: '973' },
  { name: 'عُمان',         code: 'OM', dial: '968' },
  { name: 'مصر',           code: 'EG', dial: '20'  },
  { name: 'الأردن',        code: 'JO', dial: '962' },
  { name: 'لبنان',         code: 'LB', dial: '961' },
  { name: 'سوريا',         code: 'SY', dial: '963' },
  { name: 'العراق',        code: 'IQ', dial: '964' },
  { name: 'اليمن',         code: 'YE', dial: '967' },
  { name: 'ليبيا',         code: 'LY', dial: '218' },
  { name: 'تونس',          code: 'TN', dial: '216' },
  { name: 'الجزائر',       code: 'DZ', dial: '213' },
  { name: 'المغرب',        code: 'MA', dial: '212' },
  { name: 'السودان',       code: 'SD', dial: '249' },
  { name: 'موريتانيا',     code: 'MR', dial: '222' },
  { name: 'الصومال',       code: 'SO', dial: '252' },
  { name: 'جيبوتي',        code: 'DJ', dial: '253' },
  { name: 'جزر القمر',     code: 'KM', dial: '269' },
  { name: 'فلسطين',        code: 'PS', dial: '970' },
  // آسيا
  { name: 'تركيا',         code: 'TR', dial: '90'  },
  { name: 'إيران',         code: 'IR', dial: '98'  },
  { name: 'باكستان',       code: 'PK', dial: '92'  },
  { name: 'الهند',         code: 'IN', dial: '91'  },
  { name: 'بنغلاديش',     code: 'BD', dial: '880' },
  { name: 'الفلبين',       code: 'PH', dial: '63'  },
  { name: 'إندونيسيا',    code: 'ID', dial: '62'  },
  { name: 'ماليزيا',       code: 'MY', dial: '60'  },
  { name: 'سريلانكا',      code: 'LK', dial: '94'  },
  { name: 'نيبال',         code: 'NP', dial: '977' },
  { name: 'أفغانستان',    code: 'AF', dial: '93'  },
  { name: 'الصين',         code: 'CN', dial: '86'  },
  { name: 'اليابان',       code: 'JP', dial: '81'  },
  { name: 'كوريا الجنوبية',code: 'KR', dial: '82'  },
  { name: 'تايلاند',       code: 'TH', dial: '66'  },
  { name: 'فيتنام',        code: 'VN', dial: '84'  },
  { name: 'سنغافورة',      code: 'SG', dial: '65'  },
  { name: 'هونج كونج',     code: 'HK', dial: '852' },
  { name: 'تايوان',        code: 'TW', dial: '886' },
  { name: 'كازاخستان',     code: 'KZ', dial: '7'   },
  { name: 'أوزبكستان',    code: 'UZ', dial: '998' },
  { name: 'أذربيجان',     code: 'AZ', dial: '994' },
  { name: 'أرمينيا',      code: 'AM', dial: '374' },
  { name: 'جورجيا',        code: 'GE', dial: '995' },
  { name: 'قبرص',          code: 'CY', dial: '357' },
  // أوروبا
  { name: 'المملكة المتحدة',code:'GB', dial: '44'  },
  { name: 'ألمانيا',       code: 'DE', dial: '49'  },
  { name: 'فرنسا',         code: 'FR', dial: '33'  },
  { name: 'إيطاليا',      code: 'IT', dial: '39'  },
  { name: 'إسبانيا',      code: 'ES', dial: '34'  },
  { name: 'هولندا',        code: 'NL', dial: '31'  },
  { name: 'بلجيكا',        code: 'BE', dial: '32'  },
  { name: 'سويسرا',        code: 'CH', dial: '41'  },
  { name: 'السويد',        code: 'SE', dial: '46'  },
  { name: 'النرويج',       code: 'NO', dial: '47'  },
  { name: 'الدنمارك',      code: 'DK', dial: '45'  },
  { name: 'فنلندا',        code: 'FI', dial: '358' },
  { name: 'البرتغال',      code: 'PT', dial: '351' },
  { name: 'اليونان',       code: 'GR', dial: '30'  },
  { name: 'النمسا',        code: 'AT', dial: '43'  },
  { name: 'بولندا',        code: 'PL', dial: '48'  },
  { name: 'رومانيا',       code: 'RO', dial: '40'  },
  { name: 'المجر',         code: 'HU', dial: '36'  },
  { name: 'التشيك',        code: 'CZ', dial: '420' },
  { name: 'سلوفاكيا',     code: 'SK', dial: '421' },
  { name: 'كرواتيا',       code: 'HR', dial: '385' },
  { name: 'صربيا',         code: 'RS', dial: '381' },
  { name: 'أوكرانيا',     code: 'UA', dial: '380' },
  { name: 'روسيا',         code: 'RU', dial: '7'   },
  { name: 'بيلاروسيا',    code: 'BY', dial: '375' },
  { name: 'لتوانيا',       code: 'LT', dial: '370' },
  { name: 'لاتفيا',        code: 'LV', dial: '371' },
  { name: 'إستونيا',      code: 'EE', dial: '372' },
  { name: 'أيرلندا',      code: 'IE', dial: '353' },
  { name: 'لوكسمبورغ',    code: 'LU', dial: '352' },
  { name: 'مالطا',         code: 'MT', dial: '356' },
  { name: 'أيسلندا',      code: 'IS', dial: '354' },
  { name: 'ألبانيا',      code: 'AL', dial: '355' },
  { name: 'مقدونيا',       code: 'MK', dial: '389' },
  { name: 'البوسنة',       code: 'BA', dial: '387' },
  { name: 'الجبل الأسود',  code: 'ME', dial: '382' },
  { name: 'سلوفينيا',     code: 'SI', dial: '386' },
  { name: 'بلغاريا',      code: 'BG', dial: '359' },
  { name: 'مولدوفا',       code: 'MD', dial: '373' },
  // أمريكا
  { name: 'الولايات المتحدة',code:'US', dial: '1'  },
  { name: 'كندا',          code: 'CA', dial: '1'   },
  { name: 'المكسيك',       code: 'MX', dial: '52'  },
  { name: 'البرازيل',      code: 'BR', dial: '55'  },
  { name: 'الأرجنتين',    code: 'AR', dial: '54'  },
  { name: 'كولومبيا',      code: 'CO', dial: '57'  },
  { name: 'تشيلي',         code: 'CL', dial: '56'  },
  { name: 'بيرو',          code: 'PE', dial: '51'  },
  { name: 'فنزويلا',       code: 'VE', dial: '58'  },
  { name: 'الإكوادور',    code: 'EC', dial: '593' },
  { name: 'بوليفيا',       code: 'BO', dial: '591' },
  { name: 'باراغواي',      code: 'PY', dial: '595' },
  { name: 'أوروغواي',     code: 'UY', dial: '598' },
  { name: 'كوبا',          code: 'CU', dial: '53'  },
  { name: 'جامايكا',       code: 'JM', dial: '1876'},
  { name: 'هايتي',         code: 'HT', dial: '509' },
  { name: 'الدومينيكان',   code: 'DO', dial: '1809'},
  { name: 'غواتيمالا',    code: 'GT', dial: '502' },
  { name: 'هندوراس',       code: 'HN', dial: '504' },
  { name: 'السلفادور',     code: 'SV', dial: '503' },
  { name: 'نيكاراغوا',    code: 'NI', dial: '505' },
  { name: 'كوستاريكا',    code: 'CR', dial: '506' },
  { name: 'بنما',          code: 'PA', dial: '507' },
  // أفريقيا
  { name: 'نيجيريا',       code: 'NG', dial: '234' },
  { name: 'إثيوبيا',      code: 'ET', dial: '251' },
  { name: 'كينيا',         code: 'KE', dial: '254' },
  { name: 'تنزانيا',       code: 'TZ', dial: '255' },
  { name: 'أوغندا',       code: 'UG', dial: '256' },
  { name: 'غانا',          code: 'GH', dial: '233' },
  { name: 'رواندا',        code: 'RW', dial: '250' },
  { name: 'الكاميرون',     code: 'CM', dial: '237' },
  { name: 'ساحل العاج',    code: 'CI', dial: '225' },
  { name: 'السنغال',       code: 'SN', dial: '221' },
  { name: 'زيمبابوي',      code: 'ZW', dial: '263' },
  { name: 'زامبيا',        code: 'ZM', dial: '260' },
  { name: 'موزمبيق',       code: 'MZ', dial: '258' },
  { name: 'مدغشقر',        code: 'MG', dial: '261' },
  { name: 'أنغولا',       code: 'AO', dial: '244' },
  { name: 'ناميبيا',       code: 'NA', dial: '264' },
  { name: 'بوتسوانا',      code: 'BW', dial: '267' },
  { name: 'جنوب أفريقيا', code: 'ZA', dial: '27'  },
  { name: 'مالي',          code: 'ML', dial: '223' },
  { name: 'بوركينافاسو',   code: 'BF', dial: '226' },
  { name: 'النيجر',        code: 'NE', dial: '227' },
  { name: 'تشاد',          code: 'TD', dial: '235' },
  { name: 'إريتريا',      code: 'ER', dial: '291' },
  { name: 'جنوب السودان',  code: 'SS', dial: '211' },
  // أوقيانوسيا
  { name: 'أستراليا',     code: 'AU', dial: '61'  },
  { name: 'نيوزيلندا',    code: 'NZ', dial: '64'  },
];

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
  const [showNewConv, setShowNewConv]         = useState(false);
  const [newPhone, setNewPhone]               = useState('');
  const [newName, setNewName]                 = useState('');
  const [newMsg, setNewMsg]                   = useState('');
  const [newMsgMode, setNewMsgMode]           = useState<'template' | 'text'>('template');
  const [newTemplate, setNewTemplate]         = useState<WhatsappTemplate | null>(null);
  const [showNewTemplateDrop, setShowNewTemplateDrop] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate]   = useState<WhatsappTemplate | null>(null);
  const [templateVars, setTemplateVars]           = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [countrySearch, setCountrySearch]   = useState('');
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

  const { data: approvedTemplates = [], isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery<WhatsappTemplate[]>({
    queryKey: ['templates-approved'],
    queryFn: async () => {
      const { data } = await api.get('/templates', { params: { status: 'approved' } });
      return data.templates;
    },
    enabled: showTemplateModal || (showNewConv && newMsgMode === 'template'),
    staleTime: 5 * 60_000,
  });

  // Auto-select first template when opening new conv in template mode
  useEffect(() => {
    if (showNewConv && newMsgMode === 'template' && approvedTemplates.length > 0 && !newTemplate) {
      setNewTemplate(approvedTemplates[0]);
    }
  }, [showNewConv, newMsgMode, approvedTemplates, newTemplate]);

  const syncTemplatesMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/whatsapp-numbers');
      const numbers: any[] = data.whatsapp_numbers ?? [];
      const cloud = numbers.find((n: any) => n.phone_number_id && n.status === 'connected');
      if (!cloud) throw new Error('لا يوجد رقم Cloud API متصل');
      await api.post('/templates/sync', { whatsapp_number_id: cloud.id });
    },
    onSuccess: () => {
      toast.success('تمت المزامنة');
      refetchTemplates();
    },
    onError: (e: any) => toast.error(e?.message || 'فشلت المزامنة'),
  });

  const sendTemplateMutation = useMutation({
    mutationFn: (p: { template_id: number; variables: string[] }) =>
      api.post(`/conversations/${selectedId}/send-template`, p),
    onSuccess: () => {
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateVars([]);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('تم إرسال القالب بنجاح');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إرسال القالب'),
  });

  const sendMutation = useMutation({
    mutationFn: (p: { content: string; is_private: boolean }) =>
      api.post(`/conversations/${selectedId}/messages`, p),
    onMutate: async (vars) => {
      // Clear input instantly
      setMessage('');
      if (inputRef.current) inputRef.current.style.height = '44px';

      await queryClient.cancelQueries({ queryKey: ['messages', selectedId] });
      const prev = queryClient.getQueryData<Message[]>(['messages', selectedId]);

      queryClient.setQueryData<Message[]>(['messages', selectedId], (old = []) => [
        ...old,
        {
          id: -Date.now(),
          conversation_id: selectedId!,
          content: vars.content,
          type: 'text',
          direction: 'out',
          is_private: vars.is_private,
          sender_name: user?.name ?? '',
          status: undefined,
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        } as Message,
      ]);

      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev !== undefined)
        queryClient.setQueryData(['messages', selectedId], ctx.prev);
      toast.error('فشل إرسال الرسالة');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
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

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const isInitialLoad = prevMsgCountRef.current === 0 && messages.length > 0;
    prevMsgCountRef.current = messages.length;
    el.scrollTo({ top: el.scrollHeight, behavior: isInitialLoad ? 'instant' : 'smooth' });
  }, [messages]);

  // ── handlers ─────────────────────────────────────────────────────────────
  const newConvMutation = useMutation({
    mutationFn: (data: any) => api.post('/conversations', data),
    onSuccess: (res) => {
      const conv = res.data.conversation;
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowNewConv(false);
      setNewPhone(''); setNewName(''); setNewMsg('');
      setNewTemplate(null); setNewMsgMode('template');
      setTimeout(() => { setSelectedId(conv.id); setMobileShowChat(true); }, 300);
      toast.success('تم إنشاء المحادثة وإرسال الرسالة');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إرسال الرسالة'),
  });

  const handleNewConv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return toast.error('رقم الهاتف مطلوب');
    const fullPhone = selectedCountry.dial + newPhone.trim().replace(/^0+/, '');
    if (newMsgMode === 'template') {
      if (!newTemplate) return toast.error('اختر قالباً');
      newConvMutation.mutate({
        phone: fullPhone,
        name: newName.trim(),
        message: newTemplate.body_text,
        template_name: newTemplate.name,
        template_language: newTemplate.language,
      });
    } else {
      if (!newMsg.trim()) return toast.error('الرسالة مطلوبة');
      newConvMutation.mutate({ phone: fullPhone, name: newName.trim(), message: newMsg.trim() });
    }
  };

  const handleSelect = (id: number) => {
    prevMsgCountRef.current = 0;
    setSelectedId(id);
    setMobileShowChat(true);
  };
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
    <>
    {/* New Conversation Modal */}
    <AnimatePresence>
      {showNewConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">محادثة جديدة</h3>
              <button onClick={() => setShowNewConv(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleNewConv} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">رقم الهاتف *</label>
                <div className="flex gap-2">
                  {/* Country picker */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowCountryDrop(v => !v); setCountrySearch(''); }}
                      className="h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm flex items-center gap-1.5 hover:border-indigo-400 transition-colors whitespace-nowrap"
                    >
                      <span className="text-lg leading-none">{flag(selectedCountry.code)}</span>
                      <span className="text-slate-600 font-medium">+{selectedCountry.dial}</span>
                    </button>
                    {showCountryDrop && (
                      <div className="absolute top-12 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-64 overflow-hidden">
                        <div className="p-2 border-b border-slate-100">
                          <input
                            autoFocus
                            type="text"
                            value={countrySearch}
                            onChange={e => setCountrySearch(e.target.value)}
                            placeholder="ابحث عن دولة..."
                            className="w-full h-8 px-3 bg-slate-50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {COUNTRIES.filter(c =>
                            !countrySearch || c.name.includes(countrySearch) || c.dial.includes(countrySearch)
                          ).map(c => (
                            <button
                              key={c.code + c.dial}
                              type="button"
                              onClick={() => { setSelectedCountry(c); setShowCountryDrop(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-right transition-colors"
                            >
                              <span className="text-base leading-none">{flag(c.code)}</span>
                              <span className="text-xs text-slate-700 flex-1 text-right">{c.name}</span>
                              <span className="text-xs text-slate-400 font-mono">+{c.dial}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Phone number */}
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="5XXXXXXXX"
                    className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الاسم (اختياري)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="اسم العميل"
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Message type toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-600">الرسالة *</label>
                  <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
                    <button type="button" onClick={() => setNewMsgMode('template')}
                      className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all',
                        newMsgMode === 'template' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500')}>
                      <LayoutTemplate size={11} /> قالب
                    </button>
                    <button type="button" onClick={() => setNewMsgMode('text')}
                      className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all',
                        newMsgMode === 'text' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500')}>
                      <MessageSquare size={11} /> نص
                    </button>
                  </div>
                </div>

                {newMsgMode === 'template' ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <button type="button"
                        onClick={() => setShowNewTemplateDrop(v => !v)}
                        className={cn(
                          'w-full h-11 px-4 bg-slate-50 border rounded-xl text-sm flex items-center justify-between transition-colors',
                          newTemplate ? 'border-indigo-300 text-slate-800' : 'border-slate-200 text-slate-400'
                        )}>
                        <span className="font-medium truncate">
                          {newTemplate ? newTemplate.name : (loadingTemplates ? 'جاري التحميل...' : 'اختر قالباً...')}
                        </span>
                        <ChevronDown size={15} className="text-slate-400 flex-shrink-0" />
                      </button>
                      {showNewTemplateDrop && (
                        <div className="absolute top-12 right-0 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-44 overflow-y-auto">
                          {approvedTemplates.length === 0 ? (
                            <p className="text-center text-slate-400 text-xs py-4">لا توجد قوالب معتمدة</p>
                          ) : approvedTemplates.map(t => (
                            <button key={t.id} type="button"
                              onClick={() => { setNewTemplate(t); setShowNewTemplateDrop(false); }}
                              className="w-full flex items-start justify-between gap-2 px-4 py-2.5 hover:bg-indigo-50 text-right border-b border-slate-50 last:border-0 transition-colors">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800">{t.name}</p>
                                <p className="text-xs text-slate-400 truncate">{t.body_text}</p>
                              </div>
                              {newTemplate?.id === t.id && <Check size={14} className="text-indigo-600 flex-shrink-0 mt-1" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {newTemplate && (
                      <div className="px-3 py-2 bg-indigo-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-indigo-100">
                        {newTemplate.body_text}
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNewConv(false)}
                  className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={newConvMutation.isPending}
                  className="flex-1 h-11 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm">
                  {newConvMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                  إرسال
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    {/* ── Template Picker Modal ── */}
    <AnimatePresence>
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
            style={{ maxHeight: '85vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              {selectedTemplate ? (
                <button onClick={() => { setSelectedTemplate(null); setTemplateVars([]); }}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium">
                  <ChevronLeft size={16} />
                  رجوع
                </button>
              ) : (
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <LayoutTemplate size={16} className="text-indigo-600" />
                  اختر قالباً
                </h3>
              )}
              <button onClick={() => { setShowTemplateModal(false); setSelectedTemplate(null); setTemplateVars([]); }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                <X size={18} />
              </button>
            </div>

            {!selectedTemplate ? (
              /* Template List */
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-indigo-500" size={28} />
                  </div>
                ) : approvedTemplates.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm space-y-4">
                    <LayoutTemplate size={32} className="mx-auto text-slate-200" />
                    <p>لا توجد قوالب معتمدة بعد.</p>
                    <button
                      onClick={() => syncTemplatesMutation.mutate()}
                      disabled={syncTemplatesMutation.isPending}
                      className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-60"
                    >
                      {syncTemplatesMutation.isPending
                        ? <Loader2 size={14} className="animate-spin" />
                        : <RefreshCw size={14} />}
                      مزامنة القوالب من Meta
                    </button>
                  </div>
                ) : approvedTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTemplate(t); setTemplateVars(Array(t.variables_count).fill('')); }}
                    className="w-full text-right p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">{t.name}</span>
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                        t.category === 'marketing' ? 'bg-purple-100 text-purple-700' :
                        t.category === 'utility'   ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {t.category === 'marketing' ? 'تسويق' : t.category === 'utility' ? 'خدمات' : 'مصادقة'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{t.body_text}</p>
                    {t.variables_count > 0 && (
                      <p className="text-xs text-indigo-500 mt-1 font-medium">{t.variables_count} متغير</p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              /* Variable Inputs + Preview */
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">معاينة القالب</p>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedTemplate.body_text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
                      const val = templateVars[parseInt(n) - 1];
                      return val ? `[${val}]` : `{{${n}}}`;
                    })}
                  </div>
                  {selectedTemplate.footer_text && (
                    <p className="text-xs text-slate-400 mt-1 px-1">{selectedTemplate.footer_text}</p>
                  )}
                </div>

                {selectedTemplate.variables_count > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">تعبئة المتغيرات</p>
                    {Array.from({ length: selectedTemplate.variables_count }, (_, i) => (
                      <div key={i}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">المتغير {`{{${i + 1}}}`}</label>
                        <input
                          type="text"
                          value={templateVars[i] ?? ''}
                          onChange={e => setTemplateVars(v => { const n = [...v]; n[i] = e.target.value; return n; })}
                          placeholder={`قيمة المتغير ${i + 1}`}
                          className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button"
                    onClick={() => { setShowTemplateModal(false); setSelectedTemplate(null); setTemplateVars([]); }}
                    className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={sendTemplateMutation.isPending || (selectedTemplate.variables_count > 0 && templateVars.some(v => !v.trim()))}
                    onClick={() => sendTemplateMutation.mutate({ template_id: selectedTemplate.id, variables: templateVars })}
                    className="flex-1 h-11 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                  >
                    {sendTemplateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                    إرسال القالب
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <div
      className="flex bg-white rounded-2xl border border-slate-200 shadow-lg font-cairo overflow-hidden"
      style={{ height: containerHeight }}
    >

      {/* ════════════════════════════════════════════════
          SIDEBAR — Conversation List
      ════════════════════════════════════════════════ */}
      <div
        className="flex flex-col bg-white flex-shrink-0"
        style={{
          width: isDesktop ? '340px' : '100%',
          display: showSidebar ? 'flex' : 'none',
          borderLeft: '1px solid #f1f5f9',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 flex-shrink-0" style={{ height: 64, borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <Av name={user?.name ?? 'U'} size={38} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate leading-tight">{user?.name ?? ''}</p>
              <p className="text-[10px] text-slate-400 font-medium">
                {conversations.filter(c => c.unread_count > 0).length > 0
                  ? `${conversations.filter(c => c.unread_count > 0).length} غير مقروءة`
                  : 'كل شيء مقروء'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNewConv(true)}
            title="محادثة جديدة"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/30"
          >
            <Plus size={17} />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <div className="relative">
            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث باسم أو رقم أو رسالة..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pr-8 pl-3 bg-slate-100 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/60 focus:bg-white transition-all border border-transparent focus:border-indigo-200"
            />
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex px-3 pb-2 gap-1 flex-shrink-0">
          {([
            { id: 'open',     label: 'نشطة' },
            { id: 'pending',  label: 'معلقة' },
            { id: 'resolved', label: 'مكتملة' },
          ] as const).map(f => {
            const count = conversations.filter(c => c.status === f.id).length;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                  filter === f.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                )}>
                {f.label}
                {count > 0 && (
                  <span className={cn('text-[9px] font-black px-1 rounded-full leading-4',
                    filter === f.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Conversation List ── */}
        <div className="flex-1 overflow-y-auto" style={{ borderTop: '1px solid #f8fafc' }}>
          {loadingConvs ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Loader2 className="animate-spin text-indigo-400" size={22} />
              <p className="text-xs text-slate-400">جاري التحميل...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
              <MessageSquare size={28} className="text-slate-200" />
              <p className="text-xs font-medium">{search ? 'لا توجد نتائج' : 'لا توجد محادثات'}</p>
            </div>
          ) : filtered.map(conv => {
            const active  = selectedId === conv.id;
            const hasUnread = conv.unread_count > 0;
            const name    = conv.client?.name ?? 'مجهول';
            const phone   = conv.client?.phone ?? '';
            const preview = conv.last_message || '—';

            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 text-right transition-all relative',
                  active
                    ? 'bg-indigo-50'
                    : 'hover:bg-slate-50/80'
                )}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-indigo-600 rounded-full" />
                )}

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Av name={name} size={44} />
                  <div className={cn(
                    'absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full border-2 border-white',
                    conv.source === 'whatsapp' ? 'bg-emerald-400' : 'bg-sky-400'
                  )} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: name + time */}
                  <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <span className={cn(
                      'text-sm truncate leading-snug',
                      hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700',
                      active && 'text-indigo-700'
                    )}>
                      {name}
                    </span>
                    <span className={cn(
                      'text-[10px] flex-shrink-0 tabular-nums',
                      hasUnread ? 'font-bold text-indigo-600' : 'text-slate-400'
                    )}>
                      {fmtTime(conv.last_message_at)}
                    </span>
                  </div>

                  {/* Row 2: phone */}
                  {phone && (
                    <p className="text-[10px] text-slate-400 truncate mb-0.5" dir="ltr">{phone}</p>
                  )}

                  {/* Row 3: preview + badge */}
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn(
                      'text-xs truncate leading-relaxed',
                      hasUnread ? 'text-slate-600 font-medium' : 'text-slate-400'
                    )}>
                      {preview}
                    </p>
                    {hasUnread && (
                      <span className="flex-shrink-0 bg-indigo-600 text-white rounded-full font-bold flex items-center justify-center"
                        style={{ minWidth: 18, height: 18, fontSize: 9, padding: '0 5px' }}>
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

                  {msgs.map((msg, msgIdx) => {
                    const isSent = msg.direction === 'out' && !msg.is_private;
                    const isNote = msg.is_private;
                    const isOptimistic = msg.id < 0;
                    const prevMsg = msgs[msgIdx - 1];
                    const isFirstInGroup = !prevMsg || prevMsg.direction !== msg.direction || prevMsg.is_private !== msg.is_private;

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
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: isOptimistic ? 0.75 : 1, y: 0 }}
                        transition={{ duration: 0.1 }}
                        className={cn('flex', isSent ? 'justify-end' : 'justify-start')}
                        style={{ marginTop: isFirstInGroup ? 6 : 2 }}
                      >
                        <div
                          className={cn(
                            'relative px-3 pt-1.5 pb-1.5 shadow-sm',
                            isSent
                              ? isFirstInGroup ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl'
                              : isFirstInGroup ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl'
                          )}
                          style={{
                            maxWidth: isDesktop ? '58%' : '80%',
                            backgroundColor: isSent ? '#d9fdd3' : '#ffffff',
                            border: isSent ? 'none' : '1px solid #e2e8f0',
                          }}
                        >
                          {isSent && msg.sender_name && isFirstInGroup && (
                            <p className="text-[10px] font-bold text-emerald-700 mb-0.5">
                              {msg.sender_name}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-800">
                            {msg.content}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
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
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  title="إرسال قالب"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <LayoutTemplate size={18} />
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
    </>
  );
};

export default MessagesPage;
