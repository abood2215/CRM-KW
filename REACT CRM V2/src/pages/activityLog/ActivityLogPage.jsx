import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { History, Loader2 } from 'lucide-react';
import { activityLogs as activityLogsApi } from '../../api';

const SUBJECT_LABELS = {
  contact: 'جهة اتصال',
  task: 'مهمة',
  campaign: 'حملة',
  contact_list: 'قائمة تواصل',
  whatsapp_number: 'رقم واتساب',
  conversation: 'محادثة',
  message: 'رسالة',
  user: 'مستخدم',
};

const ActivityLogPage = () => {
  const [subjectType, setSubjectType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', subjectType, page],
    queryFn: () => activityLogsApi.getActivityLogs({ subject_type: subjectType || undefined, page }),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;
  const subjectTypes = data?.subject_types ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-black text-slate-800">سجل النشاط</h1>
        <p className="text-slate-500 mt-1 text-sm">كل التغييرات المهمة في النظام بترتيب زمني.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setSubjectType(''); setPage(1); }}
          className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${!subjectType ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'}`}
        >
          الكل
        </button>
        {subjectTypes.map((type) => (
          <button
            key={type}
            onClick={() => { setSubjectType(type); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${subjectType === type ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'}`}
          >
            {SUBJECT_LABELS[type] ?? type}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <History size={32} className="text-slate-100 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">لا يوجد نشاط مسجل</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-4 border-b border-slate-50 last:border-0">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <History size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800">
                  <span className="font-black">{log.user?.name ?? 'النظام'}</span> — {log.description}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {SUBJECT_LABELS[log.subject_type] ?? log.subject_type} · {formatDistanceToNow(new Date(log.created_at), { locale: ar, addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 font-medium">صفحة {meta.current_page} من {meta.last_page} — {meta.total} حدث</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 px-4 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50">السابق</button>
            <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="h-9 px-4 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50">التالي</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogPage;
