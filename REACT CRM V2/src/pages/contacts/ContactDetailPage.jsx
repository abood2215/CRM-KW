import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2, Phone, Mail, Briefcase } from 'lucide-react';
import { contacts as contactsApi } from '../../api';

const STAGE_LABELS = {
  new: 'جديد',
  contacted: 'تم التواصل',
  interested: 'مهتم',
  booked: 'محجوز',
  active: 'نشط',
  following: 'متابعة',
};

const ContactDetailPage = () => {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['contact-timeline', id],
    queryFn: () => contactsApi.getTimeline(id),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10" />
      </div>
    );
  }

  const contact = data?.contact;
  const timeline = data?.timeline ?? [];

  return (
    <div className="space-y-6">
      <Link to="/pipeline" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600">
        <ArrowRight size={16} />
        رجوع للوحة المتابعة
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-xl font-black text-slate-800">{contact?.name}</h2>
          {contact?.pipeline_stage && (
            <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600">
              {STAGE_LABELS[contact.pipeline_stage] ?? contact.pipeline_stage}
            </span>
          )}
          <div className="space-y-2 text-sm text-slate-600 font-medium">
            <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" />{contact?.phone}</div>
            {contact?.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" />{contact.email}</div>}
            {contact?.service && <div className="flex items-center gap-2"><Briefcase size={14} className="text-slate-400" />{contact.service}</div>}
          </div>
          {contact?.notes && <p className="text-xs text-slate-400 border-t border-slate-50 pt-3">{contact.notes}</p>}
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-4">السجل الزمني</h3>
          {timeline.length === 0 ? (
            <p className="text-slate-400 text-sm">لا يوجد نشاط بعد.</p>
          ) : (
            <ul className="space-y-3">
              {timeline.map((event, i) => (
                <li key={i} className="text-sm border-b border-slate-50 last:border-0 pb-3">
                  <span className="font-bold text-slate-700">
                    {event.type === 'task_created' && `مهمة جديدة: ${event.title}`}
                    {event.type === 'task_completed' && `تمت المهمة: ${event.title}`}
                    {event.type === 'activity' && event.description}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">{new Date(event.date).toLocaleString('ar-EG')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactDetailPage;
