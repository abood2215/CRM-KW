import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { X, Phone, Mail, Tag, Wallet, StickyNote, ShieldOff, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';
import { contacts as contactsApi } from '../../../api';

const PIPELINE_COLORS = {
  new: 'bg-slate-100 text-slate-500',
  contacted: 'bg-teal-50 text-teal-700',
  qualified: 'bg-amber-50 text-amber-600',
  won: 'bg-emerald-50 text-emerald-600',
  lost: 'bg-rose-50 text-rose-500',
};

const ContactInfoSidebar = ({ contact, onClose }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['contact-timeline', contact?.id],
    queryFn: () => contactsApi.getTimeline(contact.id),
    enabled: !!contact?.id,
  });

  // Blacklisting used to be reachable only from the Contacts page — an agent mid-conversation
  // with a customer they want to block had to leave the chat, find the contact, then come back.
  const blacklistMutation = useMutation({
    mutationFn: () => (contact.is_blacklisted ? contactsApi.unblacklistContact(contact.id) : contactsApi.blacklistContact(contact.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['contact-timeline', contact.id] });
      toast.success(contact.is_blacklisted ? 'تم رفع الحظر عن الرقم' : 'تم إضافة الرقم لقائمة الحظر');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل تحديث حالة الحظر'),
  });

  const timeline = (data?.timeline ?? []).slice(0, 5);

  if (!contact) return null;

  return (
    <div className="w-full sm:w-72 flex-shrink-0 border-r border-slate-100 bg-white h-full flex flex-col">
      <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 flex-shrink-0">
        <h3 className="font-black text-slate-800 text-sm">معلومات جهة الاتصال</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="إغلاق">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h4 className="font-black text-slate-800">{contact.name ?? contact.phone}</h4>
          {contact.pipeline_stage && (
            <span className={`inline-flex mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase ${PIPELINE_COLORS[contact.pipeline_stage] ?? 'bg-slate-100 text-slate-500'}`}>
              {contact.pipeline_stage_label ?? contact.pipeline_stage}
            </span>
          )}
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Phone size={13} className="text-slate-400 flex-shrink-0" />
            <span className="font-medium">{contact.phone}</span>
          </div>
          {contact.email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail size={13} className="text-slate-400 flex-shrink-0" />
              <span className="font-medium truncate">{contact.email}</span>
            </div>
          )}
          {contact.service && (
            <div className="flex items-center gap-2 text-slate-600">
              <Tag size={13} className="text-slate-400 flex-shrink-0" />
              <span className="font-medium">{contact.service}</span>
            </div>
          )}
          {contact.budget != null && (
            <div className="flex items-center gap-2 text-slate-600">
              <Wallet size={13} className="text-slate-400 flex-shrink-0" />
              <span className="font-medium">{contact.budget}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => blacklistMutation.mutate()}
          disabled={blacklistMutation.isPending}
          title={contact.is_blacklisted ? 'رفع الحظر عن الرقم' : 'إضافة الرقم لقائمة الحظر'}
          className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
            contact.is_blacklisted ? 'text-rose-500 bg-rose-50 hover:bg-rose-100' : 'text-slate-400 bg-slate-50 hover:bg-rose-50 hover:text-rose-500'
          }`}
        >
          {contact.is_blacklisted ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
          {contact.is_blacklisted ? 'محظور — اضغط لرفع الحظر' : 'إضافة للحظر'}
        </button>

        {contact.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <span key={tag} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-50 text-slate-500">{tag}</span>
            ))}
          </div>
        )}

        {contact.notes && (
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase mb-1">
              <StickyNote size={12} />
              ملاحظات
            </p>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}

        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase mb-2">آخر نشاط</p>
          {isLoading ? (
            <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-teal-600" /></div>
          ) : timeline.length === 0 ? (
            <p className="text-xs text-slate-400">لا يوجد نشاط مسجّل بعد.</p>
          ) : (
            <ul className="space-y-2">
              {timeline.map((event, i) => (
                <li key={i} className="text-xs">
                  <p className="text-slate-600 font-medium truncate">{event.description ?? event.title ?? event.action}</p>
                  <p className="text-slate-400">{formatDistanceToNow(new Date(event.date), { locale: ar, addSuffix: true })}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          to={`/contacts/${contact.id}`}
          className="flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-200 text-xs font-bold text-teal-600 hover:bg-teal-50"
        >
          <ExternalLink size={13} />
          عرض الملف الكامل
        </Link>
      </div>
    </div>
  );
};

export default ContactInfoSidebar;
