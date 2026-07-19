import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  Clock,
  Plus,
  Filter,
  Calendar,
  User as UserIcon,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Pencil,
  Globe2,
} from 'lucide-react';
import { appointments as appointmentsApi, users as usersApi } from '../../api';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../utils/cn';
import { useConfirm } from '../../hooks/useConfirm';
import { runWithUndo } from '../../utils/undoableAction';
import AppointmentFormModal from '../../components/AppointmentFormModal';

const statusStyles = {
  pending: 'text-amber-600 bg-amber-50 border-amber-100',
  confirmed: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  completed: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  cancelled: 'text-rose-600 bg-rose-50 border-rose-100',
  no_show: 'text-slate-500 bg-slate-100 border-slate-200',
};

const statusLabels = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  completed: 'منجز',
  cancelled: 'ملغي',
  no_show: 'لم يحضر',
};

const EMPTY_LIST = [];

const rangeItems = [
  { id: 'today', label: 'اليوم', icon: <Clock size={15} /> },
  { id: 'upcoming', label: 'القادمة', icon: <CalendarClock size={15} /> },
  { id: 'all', label: 'الكل', icon: <Calendar size={15} /> },
];

const AppointmentsPage = () => {
  const queryClient = useQueryClient();
  const { dialog: confirmDialog } = useConfirm();
  const user = useAuthStore((state) => state.user);
  const canViewAll = (user?.permissions ?? []).includes('appointments.view_all');

  const [range, setRange] = useState('upcoming');
  const [consultantId, setConsultantId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);

  const params = useMemo(() => {
    const p = { per_page: 100 };
    if (range === 'today') p.date = format(new Date(), 'yyyy-MM-dd');
    if (range === 'upcoming') p.upcoming_only = 1;
    if (consultantId) p.user_id = consultantId;
    return p;
  }, [range, consultantId]);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', params],
    queryFn: () => appointmentsApi.getAppointments(params).then((res) => res.appointments),
  });

  const { data: usersList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getUsers,
    enabled: canViewAll,
  });

  const appointmentList = data ?? EMPTY_LIST;

  const grouped = useMemo(() => {
    const groups = new Map();
    appointmentList.forEach((appt) => {
      const day = format(new Date(appt.starts_at), 'yyyy-MM-dd');
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(appt);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [appointmentList]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['appointments'] });

  const confirmMutation = useMutation({
    mutationFn: appointmentsApi.confirmAppointment,
    onSuccess: () => { invalidate(); toast.success('تم تأكيد الموعد'); },
    onError: () => toast.error('فشل تأكيد الموعد'),
  });

  const cancelMutation = useMutation({
    mutationFn: appointmentsApi.cancelAppointment,
    onSuccess: () => { invalidate(); toast.success('تم إلغاء الموعد'); },
    onError: () => toast.error('فشل إلغاء الموعد'),
  });

  const completeMutation = useMutation({
    mutationFn: appointmentsApi.completeAppointment,
    onSuccess: () => { invalidate(); toast.success('تم إنجاز الموعد'); },
    onError: () => toast.error('فشل إنجاز الموعد'),
  });

  const deleteMutation = useMutation({
    mutationFn: appointmentsApi.deleteAppointment,
    onSuccess: invalidate,
    onError: () => toast.error('فشل حذف الموعد'),
  });

  const openEdit = (appt) => {
    setEditingAppointment(appt);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditingAppointment(null);
    setFormOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800">إدارة المواعيد</h1>
            <p className="text-slate-500 mt-1 font-medium text-sm">مواعيد الاستشارات الداخلية وحجوزات العملاء الذاتية.</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href="/book"
              target="_blank"
              rel="noreferrer"
              className="h-11 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm"
            >
              <Globe2 size={16} />
              <span>رابط الحجز العام</span>
            </a>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={openCreate}
              className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              <span>موعد جديد</span>
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-800 mb-5 flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                تصفية المواعيد
              </h4>
              <div className="space-y-2">
                {rangeItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setRange(item.id)}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all',
                      range === item.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>

              {canViewAll && (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-600 mb-1.5">المستشار</label>
                  <select
                    value={consultantId}
                    onChange={(e) => setConsultantId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">الكل</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
                <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
                <p className="text-slate-500 font-medium">جاري جلب المواعيد...</p>
              </div>
            ) : grouped.length > 0 ? (
              grouped.map(([day, dayAppointments]) => (
                <div key={day} className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">
                    {isToday(new Date(day)) ? 'اليوم' : format(new Date(day), 'EEEE d MMMM yyyy', { locale: ar })}
                  </h4>
                  {dayAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className={cn(
                        'bg-white p-4 lg:p-6 rounded-2xl border transition-all hover:shadow-lg group flex items-start gap-4 lg:gap-6',
                        ['cancelled', 'completed'].includes(appt.status) ? 'border-slate-50 opacity-60' : 'border-slate-100 shadow-sm'
                      )}
                    >
                      <div className="w-16 flex-shrink-0 text-center">
                        <p className="text-sm font-black text-slate-800">{format(new Date(appt.starts_at), 'HH:mm')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{appt.duration_minutes} د</p>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm lg:text-base font-black text-slate-800">{appt.service}</h4>
                          <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tight border flex-shrink-0', statusStyles[appt.status])}>
                            {statusLabels[appt.status]}
                          </span>
                          {appt.source === 'self_service' && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tight border border-cyan-100 text-cyan-600 bg-cyan-50 flex-shrink-0">
                              حجز ذاتي
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 lg:gap-6 mt-1.5">
                          {appt.customer_name && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
                              <UserIcon size={11} />
                              <span>{appt.customer_name}</span>
                              {appt.customer_phone && <span className="text-slate-400 font-medium">({appt.customer_phone})</span>}
                            </div>
                          )}
                          {appt.user && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                              <UserIcon size={11} />
                              <span>{appt.user.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {appt.status === 'pending' && (
                          <button
                            onClick={() => confirmMutation.mutate(appt.id)}
                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="تأكيد"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {appt.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => completeMutation.mutate(appt.id)}
                              className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="إنجاز"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={() => cancelMutation.mutate(appt.id)}
                              className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="إلغاء"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openEdit(appt)}
                          className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          title="تعديل"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => runWithUndo({ message: 'تم حذف الموعد', onConfirm: () => deleteMutation.mutate(appt.id) })}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="bg-white p-12 lg:p-20 rounded-2xl border border-slate-100 shadow-sm text-center">
                <CalendarClock size={48} className="text-slate-100 mb-5 mx-auto" strokeWidth={1} />
                <p className="text-base lg:text-lg font-black text-slate-600">لا توجد مواعيد</p>
                <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2 text-sm leading-relaxed">
                  لا توجد مواعيد مطابقة لتصفيتك الحالية.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AppointmentFormModal open={formOpen} onClose={() => setFormOpen(false)} appointment={editingAppointment} />
      {confirmDialog}
    </>
  );
};

export default AppointmentsPage;
