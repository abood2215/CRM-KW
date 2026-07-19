import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { CalendarClock, Loader2, CheckCircle2, Phone, User as UserIcon, Briefcase, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { appointments as appointmentsApi } from '../../api';

const today = () => format(new Date(), 'yyyy-MM-dd');
const maxDate = () => format(addDays(new Date(), 30), 'yyyy-MM-dd');

const BookingPage = () => {
  const [form, setForm] = useState({ name: '', phone: '', service: '', date: today(), notes: '' });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [result, setResult] = useState(null);

  const { data: slotsData, isFetching: slotsLoading } = useQuery({
    queryKey: ['public-booking-slots', form.date],
    queryFn: () => appointmentsApi.getPublicSlots({ date: form.date }).then((res) => res.slots || []),
    enabled: !!form.date,
  });

  const slots = slotsData ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      appointmentsApi.createPublicBooking({
        name: form.name,
        phone: form.phone,
        service: form.service,
        starts_at: `${form.date}T${selectedSlot}`,
        notes: form.notes || undefined,
      }),
    onSuccess: (data) => setResult(data),
    onError: (e) => toast.error(e?.response?.data?.message || 'تعذّر إتمام الحجز، حاول مجدداً.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('الاسم مطلوب');
    if (!form.phone.trim()) return toast.error('رقم الهاتف مطلوب');
    if (!form.service.trim()) return toast.error('نوع الخدمة مطلوب');
    if (!selectedSlot) return toast.error('اختر وقتاً متاحاً');
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-cairo" dir="rtl">
      <header style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)' }} className="text-white py-10 px-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <CalendarClock className="w-7 h-7 text-white" />
          </div>
          <div className="text-right">
            <div className="text-xl font-black">مركز مطمئنة</div>
            <div className="text-sm text-white/70">احجز موعد استشارتك</div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {result ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-lg font-black text-slate-800 mb-2">تم استلام طلب حجزك!</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">{result.message}</p>
            <div className="bg-slate-50 rounded-xl p-4 text-sm font-bold text-slate-700">
              {format(new Date(result.starts_at), 'yyyy-MM-dd HH:mm')}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">
                <UserIcon size={12} className="inline ml-1" />
                الاسم الكامل *
              </label>
              <input
                type="text" required
                value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="اسمك الكامل"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">
                <Phone size={12} className="inline ml-1" />
                رقم الهاتف (واتساب) *
              </label>
              <input
                type="tel" required
                value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="مثال: 96550001234"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">
                <Briefcase size={12} className="inline ml-1" />
                نوع الخدمة المطلوبة *
              </label>
              <input
                type="text" required
                value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="مثال: استشارة لغوية"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">التاريخ *</label>
              <input
                type="date" required
                min={today()} max={maxDate()}
                value={form.date}
                onChange={(e) => {
                  setForm((f) => ({ ...f, date: e.target.value }));
                  setSelectedSlot(null);
                }}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">
                <Clock size={12} className="inline ml-1" />
                الأوقات المتاحة *
              </label>
              {slotsLoading ? (
                <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-indigo-600" /></div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`h-10 rounded-xl text-xs font-bold border transition-all ${
                        selectedSlot === slot
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 py-4 bg-slate-50 rounded-xl">لا توجد أوقات متاحة في هذا اليوم، جرّب يوماً آخر.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">ملاحظات (اختياري)</label>
              <textarea
                rows={2}
                value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                placeholder="أي تفاصيل إضافية تودّ إخبارنا بها"
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
              تأكيد الحجز
            </button>
          </form>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-slate-400">
        <p>© {new Date().getFullYear()} <strong className="text-slate-600">مركز مطمئنة</strong> — جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
};

export default BookingPage;
