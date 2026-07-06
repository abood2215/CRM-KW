import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Users, ShieldOff, ShieldCheck, Trash2, Loader2 } from 'lucide-react';

const STAGE_LABELS = {
  new: 'جديد',
  contacted: 'تم التواصل',
  interested: 'مهتم',
  booked: 'محجوز',
  active: 'نشط',
  following: 'متابعة',
};

const ContactsTable = ({ contacts, isLoading, onOptOut, onToggleBlacklist, onDelete }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600 h-8 w-8" />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-20">
        <Users size={32} className="text-slate-200 mx-auto mb-3" />
        <p className="text-slate-400 font-medium">لا توجد جهات اتصال</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider">الاسم</th>
            <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider">الهاتف</th>
            <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">المرحلة</th>
            <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider">الحالة</th>
            <th className="p-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {contacts.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="p-4 font-bold text-slate-800">
                <Link to={`/contacts/${c.id}`} className="hover:text-indigo-600">{c.name}</Link>
              </td>
              <td className="p-4">
                <span className="flex items-center gap-1.5 text-slate-600 font-mono">
                  <Phone size={13} className="text-slate-400" />
                  {c.phone}
                </span>
              </td>
              <td className="p-4 hidden md:table-cell">
                {c.pipeline_stage ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600">
                    {STAGE_LABELS[c.pipeline_stage] ?? c.pipeline_stage}
                  </span>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </td>
              <td className="p-4">
                {c.is_blacklisted ? (
                  <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold w-fit block">محظور</span>
                ) : c.opt_in ? (
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold w-fit block">مشترك</span>
                ) : (
                  <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold w-fit block">غير مشترك</span>
                )}
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2 justify-end">
                  {c.opt_in && !c.opt_out && (
                    <button
                      onClick={() => onOptOut(c.id)}
                      className="text-xs text-amber-600 hover:text-amber-800 font-bold px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      إلغاء اشتراك
                    </button>
                  )}
                  <button
                    title={c.is_blacklisted ? 'رفع الحظر' : 'إضافة للحظر'}
                    onClick={() => onToggleBlacklist(c)}
                    className={`p-1.5 rounded-lg transition-colors ${c.is_blacklisted ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                  >
                    {c.is_blacklisted ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
                  </button>
                  <button onClick={() => onDelete(c.id)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContactsTable;
