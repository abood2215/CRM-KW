import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { contacts, users, appointments as appointmentsApi } from '../api';
import { useModalA11y } from '../hooks/useModalA11y';

const emptyForm = {
  service: '',
  starts_at: '',
  duration_minutes: 60,
  user_id: '',
  status: 'confirmed',
  notes: '',
};

// datetime-local needs "YYYY-MM-DDTHH:mm" in local time, not the ISO string the API returns.
const toLocalInputValue = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AppointmentFormModal = ({ open, onClose, appointment = null }) => {
  const isEdit = !!appointment;
  const queryClient = useQueryClient();
  const ref = useModalA11y(open, onClose);
  const [form, setForm] = useState(emptyForm);
  const [contactQuery, setContactQuery] = useState('');
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const contactPickerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    if (appointment) {
      setForm({
        service: appointment.service ?? '',
        starts_at: toLocalInputValue(appointment.starts_at),
        duration_minutes: appointment.duration_minutes ?? 60,
        user_id: appointment.user?.id ?? '',
        status: appointment.status ?? 'confirmed',
        notes: appointment.notes ?? '',
      });
      if (appointment.contact) {
        setSelectedContact(appointment.contact);
        setContactQuery(appointment.contact.name);
      } else {
        setSelectedContact(null);
        setContactQuery('');
      }
    } else {
      setForm(emptyForm);
      setSelectedContact(null);
      setContactQuery('');
    }
  }, [open, appointment]);

  const { data: contactsResp, isFetching: contactsFetching } = useQuery({
    queryKey: ['contacts-select', contactQuery],
    queryFn: () => contacts.getContacts({ search: contactQuery || undefined, per_page: 20 }).then((res) => res.data || []),
    enabled: open && contactDropdownOpen,
  });

  const { data: usersList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: users.getUsers,
    enabled: open,
  });

  useEffect(() => {
    if (!contactDropdownOpen) return undefined;
    const handleClickOutside = (e) => {
      if (contactPickerRef.current && !contactPickerRef.current.contains(e.target)) setContactDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contactDropdownOpen]);

  const selectContact = (contact) => {
    setSelectedContact(contact);
    setForm((f) => ({ ...f, contact_id: contact.id }));
    setContactQuery(contact.name);
    setContactDropdownOpen(false);
  };

  const clearContact = () => {
    setSelectedContact(null);
    setContactQuery('');
  };

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        contact_id: selectedContact?.id || undefined,
        user_id: data.user_id ? Number(data.user_id) : undefined,
        duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : undefined,
      };
      return isEdit ? appointmentsApi.updateAppointment(appointment.id, payload) : appointmentsApi.createAppointment(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(isEdit ? 'تم تحديث الموعد' : 'تم إنشاء الموعد بنجاح');
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل حفظ الموعد'),
  });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">{isEdit ? 'تعديل الموعد' : 'موعد جديد'}</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.service.trim()) return toast.error('الخدمة مطلوبة');
                if (!form.starts_at) return toast.error('وقت الموعد مطلوب');
                mutation.mutate(form);
              }}
              className="p-8 space-y-5"
            >
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">الخدمة *</label>
                <input
                  type="text" required
                  value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="مثال: استشارة لغوية"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">وقت الموعد *</label>
                  <input
                    type="datetime-local" required
                    value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">المدة (دقيقة)</label>
                  <input
                    type="number" min={15} max={480} step={15}
                    value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">المستشار</label>
                  <select
                    value={form.user_id} onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">بدون تعيين</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                {isEdit && (
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1.5">الحالة</label>
                    <select
                      value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="pending">قيد الانتظار</option>
                      <option value="confirmed">مؤكد</option>
                      <option value="completed">منجز</option>
                      <option value="cancelled">ملغي</option>
                      <option value="no_show">لم يحضر</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="relative" ref={contactPickerRef}>
                <label className="block text-xs font-black text-slate-600 mb-1.5">جهة اتصال (اختياري)</label>
                <div className="relative">
                  <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={contactQuery}
                    onFocus={() => setContactDropdownOpen(true)}
                    onChange={(e) => {
                      setContactQuery(e.target.value);
                      setContactDropdownOpen(true);
                      setSelectedContact(null);
                    }}
                    placeholder="ابحث بالاسم أو الرقم..."
                    className="w-full h-11 pr-9 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {(selectedContact || contactQuery) && (
                    <button
                      type="button"
                      onClick={clearContact}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {contactDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                    {contactsFetching ? (
                      <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-indigo-600" /></div>
                    ) : contactsResp?.length ? (
                      contactsResp.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectContact(c)}
                          className="w-full text-right px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors"
                        >
                          <span className="font-bold text-slate-800">{c.name}</span>
                          <span className="block text-xs text-slate-400">{c.phone}</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-xs text-slate-400 py-4">لا توجد نتائج</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">ملاحظات</label>
                <textarea
                  rows={2}
                  value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="تفاصيل إضافية..."
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                  إلغاء
                </button>
                <button type="submit" disabled={mutation.isPending}
                  className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                  {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
                  {isEdit ? 'حفظ التعديلات' : 'إنشاء الموعد'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AppointmentFormModal;
