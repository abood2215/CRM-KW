import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Client } from '../../types';
import {
  ArrowRight,
  MessageSquare,
  CheckSquare,
  Megaphone,
  Activity,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  Send,
  Inbox,
  XCircle,
  ClipboardList,
  BadgeAlert,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

// نوع حدث الـ timeline
interface TimelineEvent {
  type: 'message' | 'task_created' | 'task_completed' | 'campaign' | 'activity';
  date: string;
  // رسالة
  direction?: 'in' | 'out';
  content?: string;
  sender?: string;
  status?: string;
  // مهمة
  title?: string;
  task_type?: string;
  priority?: string;
  // حملة
  campaign_name?: string;
  campaign_id?: number;
  // نشاط
  action?: string;
  description?: string;
}

interface TimelineResponse {
  client: Client;
  timeline: TimelineEvent[];
}

// ألوان وأيقونات لكل نوع حدث
const eventConfig: Record<
  TimelineEvent['type'],
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  message: {
    icon: <MessageSquare size={14} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    label: 'رسالة',
  },
  task_created: {
    icon: <ClipboardList size={14} />,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    label: 'مهمة جديدة',
  },
  task_completed: {
    icon: <CheckCircle2 size={14} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    label: 'مهمة مكتملة',
  },
  campaign: {
    icon: <Megaphone size={14} />,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    label: 'حملة',
  },
  activity: {
    icon: <Activity size={14} />,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    label: 'نشاط',
  },
};

// بطاقة معلومات العميل
const ClientInfoCard: React.FC<{ client: Client }> = ({ client }) => {
  const statusLabels: Record<string, string> = {
    new: 'جديد', contacted: 'تم التواصل', interested: 'مهتم',
    booked: 'محجوز', active: 'نشط', following: 'متابعة',
  };
  const statusColors: Record<string, string> = {
    new: 'bg-indigo-50 text-indigo-700',
    contacted: 'bg-emerald-50 text-emerald-700',
    interested: 'bg-amber-50 text-amber-700',
    booked: 'bg-blue-50 text-blue-700',
    active: 'bg-purple-50 text-purple-700',
    following: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
      {/* صورة رمزية واسم */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-black flex-shrink-0">
          {client.name.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">{client.name}</h2>
          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full mt-1 inline-block', statusColors[client.status])}>
            {statusLabels[client.status] || client.status}
          </span>
        </div>
      </div>

      {/* بيانات الاتصال */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Phone size={15} className="text-emerald-500 flex-shrink-0" />
          <span className="font-medium" dir="ltr">{client.phone}</span>
        </div>
        {client.email && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Mail size={15} className="text-indigo-500 flex-shrink-0" />
            <span className="font-medium">{client.email}</span>
          </div>
        )}
        {client.user && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <User size={15} className="text-slate-400 flex-shrink-0" />
            <span className="font-medium">مسؤول: {client.user.name}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Calendar size={15} className="text-slate-400 flex-shrink-0" />
          <span className="font-medium">
            أُضيف {format(parseISO(client.created_at), 'dd MMMM yyyy', { locale: ar })}
          </span>
        </div>
      </div>

      {/* إضافية */}
      {(client.service || client.budget) && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
          {client.service && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-black text-slate-400 uppercase">الخدمة</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">{client.service}</p>
            </div>
          )}
          {client.budget && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-black text-slate-400 uppercase">الميزانية</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">{client.budget} ر.س</p>
            </div>
          )}
        </div>
      )}

      {client.notes && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">ملاحظات</p>
          <p className="text-sm text-slate-600 leading-relaxed">{client.notes}</p>
        </div>
      )}
    </div>
  );
};

// عنصر واحد في الـ timeline
const TimelineItem: React.FC<{ event: TimelineEvent; isLast: boolean }> = ({ event, isLast }) => {
  const config = eventConfig[event.type];

  const renderContent = () => {
    switch (event.type) {
      case 'message':
        return (
          <div className={cn(
            'rounded-xl p-3 text-sm max-w-sm',
            event.direction === 'out'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700'
          )}>
            <div className="flex items-center gap-1.5 mb-1">
              {event.direction === 'out'
                ? <Send size={11} className="opacity-70" />
                : <Inbox size={11} className="opacity-70" />}
              <span className="text-[10px] font-bold opacity-70">
                {event.direction === 'out' ? (event.sender || 'أنت') : 'العميل'}
              </span>
            </div>
            <p className="leading-relaxed">{event.content || '(ملف مرفق)'}</p>
          </div>
        );

      case 'task_created':
        return (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-sm font-bold text-amber-800">{event.title}</p>
            {event.priority && (
              <span className={cn(
                'text-[10px] font-black px-2 py-0.5 rounded-full mt-1 inline-block',
                event.priority === 'high' ? 'bg-red-100 text-red-700' :
                event.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              )}>
                {event.priority === 'high' ? 'عاجل' : event.priority === 'medium' ? 'متوسط' : 'منخفض'}
              </span>
            )}
          </div>
        );

      case 'task_completed':
        return (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <p className="text-sm font-bold text-emerald-800">✓ اكتملت: {event.title}</p>
          </div>
        );

      case 'campaign':
        return (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
            <p className="text-sm font-bold text-purple-800">{event.campaign_name || 'حملة'}</p>
            <span className={cn(
              'text-[10px] font-black px-2 py-0.5 rounded-full mt-1 inline-flex items-center gap-1',
              event.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
              event.status === 'replied' ? 'bg-blue-100 text-blue-700' :
              event.status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-600'
            )}>
              {event.status === 'sent' ? <CheckCircle2 size={10} /> :
               event.status === 'failed' ? <XCircle size={10} /> :
               event.status === 'replied' ? <MessageSquare size={10} /> : null}
              {event.status === 'sent' ? 'تم الإرسال' :
               event.status === 'replied' ? 'رد العميل' :
               event.status === 'failed' ? 'فشل الإرسال' :
               event.status === 'blocked' ? 'محظور' : event.status}
            </span>
          </div>
        );

      case 'activity':
        return (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <p className="text-sm text-slate-600">{event.description || event.action}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-4">
      {/* خط الـ timeline + نقطة */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          config.bg, config.color
        )}>
          {config.icon}
        </div>
        {!isLast && <div className="w-0.5 bg-slate-100 flex-1 mt-1 min-h-[24px]" />}
      </div>

      {/* المحتوى */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full', config.bg, config.color)}>
            {config.label}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock size={10} />
            {format(parseISO(event.date), 'dd MMM yyyy - hh:mm a', { locale: ar })}
          </span>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

// الصفحة الرئيسية
const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | TimelineEvent['type']>('all');

  const { data, isLoading, isError } = useQuery<TimelineResponse>({
    queryKey: ['client-timeline', id],
    queryFn: async () => {
      const { data } = await api.get(`/clients/${id}/timeline`);
      return data;
    },
    enabled: !!id,
  });

  const filterOptions: { id: 'all' | TimelineEvent['type']; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'message', label: 'الرسائل' },
    { id: 'task_created', label: 'المهام' },
    { id: 'campaign', label: 'الحملات' },
    { id: 'activity', label: 'النشاطات' },
  ];

  const filteredTimeline = (data?.timeline || []).filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'task_created') return e.type === 'task_created' || e.type === 'task_completed';
    return e.type === filter;
  });

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* زر الرجوع */}
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowRight size={16} />
        العودة لسجل العملاء
      </button>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
          <p className="text-slate-500 font-medium">جاري تحميل بيانات العميل...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-32">
          <AlertCircle className="text-rose-400 h-12 w-12 mb-3" />
          <p className="text-slate-500 font-medium">تعذّر تحميل البيانات</p>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* عمود معلومات العميل */}
          <div className="lg:col-span-1">
            <ClientInfoCard client={data.client} />
          </div>

          {/* عمود الـ Timeline */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
              {/* عنوان + فلاتر */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-800">سجل التفاعلات</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {filteredTimeline.length} حدث مسجّل
                  </p>
                </div>

                {/* فلاتر */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setFilter(opt.id)}
                      className={cn(
                        'h-8 px-3 rounded-lg text-xs font-bold transition-all',
                        filter === opt.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* الأحداث */}
              {filteredTimeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <BadgeAlert size={48} className="text-slate-100 mb-4" />
                  <p className="text-slate-400 font-medium">لا توجد تفاعلات مسجّلة</p>
                </div>
              ) : (
                <div className="mt-2">
                  {filteredTimeline.map((event, index) => (
                    <TimelineItem
                      key={`${event.type}-${event.date}-${index}`}
                      event={event}
                      isLast={index === filteredTimeline.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ClientDetailPage;
