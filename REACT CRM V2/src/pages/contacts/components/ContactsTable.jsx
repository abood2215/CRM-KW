import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Users, ShieldOff, ShieldCheck, Trash2, Loader2, Plus, Upload } from 'lucide-react';

const STAGE_LABELS = {
  new: 'جديد',
  contacted: 'تم التواصل',
  interested: 'مهتم',
  booked: 'محجوز',
  active: 'نشط',
  following: 'متابعة',
};

const StatusBadge = ({ contact }) => {
  if (contact.is_blacklisted) return <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold w-fit block">محظور</span>;
  if (contact.opt_in) return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold w-fit block">مشترك</span>;
  return <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold w-fit block">غير مشترك</span>;
};

const RowActions = ({ contact, onOptOut, onToggleBlacklist, onDelete }) => (
  <div className="flex items-center gap-2 justify-end">
    {contact.opt_in && !contact.opt_out && (
      <button
        onClick={() => onOptOut(contact.id)}
        className="text-xs text-amber-600 hover:text-amber-800 font-bold px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
      >
        إلغاء اشتراك
      </button>
    )}
    <button
      title={contact.is_blacklisted ? 'رفع الحظر' : 'إضافة للحظر'}
      onClick={() => onToggleBlacklist(contact)}
      className={`p-1.5 rounded-lg transition-colors ${contact.is_blacklisted ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
    >
      {contact.is_blacklisted ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
    </button>
    <button onClick={() => onDelete(contact.id)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors">
      <Trash2 size={15} />
    </button>
  </div>
);

const Checkbox = ({ checked, onChange }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={onChange}
    onClick={(e) => e.stopPropagation()}
    className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
  />
);

const ContactsTable = ({ contacts, isLoading, onOptOut, onToggleBlacklist, onDelete, selectedIds = [], onToggleSelect, onToggleSelectAll, onAddContact, onImport }) => {
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
        <p className="text-slate-500 font-black mb-1">لا توجد جهات اتصال بعد</p>
        <p className="text-slate-400 text-sm mb-5">أضف أول جهة اتصال أو استورد قائمة كاملة من ملف CSV.</p>
        <div className="flex items-center justify-center gap-2">
          {onImport && (
            <button onClick={onImport} className="h-9 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-all">
              <Upload size={14} />
              استيراد CSV
            </button>
          )}
          {onAddContact && (
            <button onClick={onAddContact} className="h-9 px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-indigo-700 transition-all">
              <Plus size={14} />
              جهة اتصال جديدة
            </button>
          )}
        </div>
      </div>
    );
  }

  const allSelected = contacts.length > 0 && contacts.every((c) => selectedIds.includes(c.id));

  return (
    <>
      {/* Mobile: card list */}
      <div className="sm:hidden space-y-3">
        {contacts.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                {onToggleSelect && <div className="pt-1"><Checkbox checked={selectedIds.includes(c.id)} onChange={() => onToggleSelect(c.id)} /></div>}
                <div className="min-w-0">
                  <Link to={`/contacts/${c.id}`} className="font-bold text-slate-800 hover:text-indigo-600 truncate block">{c.name}</Link>
                  <span className="flex items-center gap-1.5 text-slate-500 text-sm font-mono mt-0.5">
                    <Phone size={12} className="text-slate-400" />
                    {c.phone}
                  </span>
                </div>
              </div>
              <StatusBadge contact={c} />
            </div>
            {c.pipeline_stage && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 inline-block">
                {STAGE_LABELS[c.pipeline_stage] ?? c.pipeline_stage}
              </span>
            )}
            <div className="pt-2 border-t border-slate-50">
              <RowActions contact={c} onOptOut={onOptOut} onToggleBlacklist={onToggleBlacklist} onDelete={onDelete} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop/tablet: table */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {onToggleSelectAll && (
                <th className="p-4 w-10">
                  <Checkbox checked={allSelected} onChange={() => onToggleSelectAll(!allSelected)} />
                </th>
              )}
              <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider">الاسم</th>
              <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider">الهاتف</th>
              <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">المرحلة</th>
              <th className="text-right p-4 font-black text-slate-500 text-xs uppercase tracking-wider">الحالة</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {contacts.map((c) => (
              <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(c.id) ? 'bg-indigo-50/40' : ''}`}>
                {onToggleSelect && (
                  <td className="p-4">
                    <Checkbox checked={selectedIds.includes(c.id)} onChange={() => onToggleSelect(c.id)} />
                  </td>
                )}
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
                  <StatusBadge contact={c} />
                </td>
                <td className="p-4">
                  <RowActions contact={c} onOptOut={onOptOut} onToggleBlacklist={onToggleBlacklist} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ContactsTable;
