import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  GitBranch,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  UserPlus,
  Pause,
  Play,
  Users,
} from 'lucide-react';
import { dripSequences as dripSequencesApi, templates as templatesApi } from '../../api';
import { useConfirm } from '../../hooks/useConfirm';
import { runWithUndo } from '../../utils/undoableAction';
import { cn } from '../../utils/cn';
import CreateDripSequenceModal from '../../components/CreateDripSequenceModal';
import EnrollContactsModal from '../../components/EnrollContactsModal';

const statusStyles = {
  active: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  paused: 'text-slate-500 bg-slate-100 border-slate-200',
};

const enrollmentStatusStyles = {
  active: 'text-indigo-600 bg-indigo-50',
  completed: 'text-emerald-600 bg-emerald-50',
  stopped: 'text-rose-600 bg-rose-50',
};

const enrollmentStatusLabels = { active: 'نشط', completed: 'مكتمل', stopped: 'متوقف' };

const emptyStep = () => ({ delay_days: 0, template_name: '', template_language: 'ar' });

const StepsEditor = ({ sequence, initialSteps }) => {
  const queryClient = useQueryClient();
  const [steps, setSteps] = useState(initialSteps.length ? initialSteps : [emptyStep()]);

  const { data: allTemplates = [] } = useQuery({
    queryKey: ['templates-select'],
    queryFn: () => templatesApi.getTemplates(),
  });

  const availableTemplates = useMemo(
    () => allTemplates.filter((t) => !sequence.whatsapp_number_id || t.whatsapp_number_id === sequence.whatsapp_number_id),
    [allTemplates, sequence.whatsapp_number_id]
  );

  const saveMutation = useMutation({
    mutationFn: () => dripSequencesApi.replaceDripSequenceSteps(sequence.id, steps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-sequences'] });
      queryClient.invalidateQueries({ queryKey: ['drip-sequence', sequence.id] });
      toast.success('تم حفظ خطوات السلسلة');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل حفظ الخطوات'),
  });

  const updateStep = (index, patch) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const removeStep = (index) => setSteps((prev) => prev.filter((_, i) => i !== index));
  const addStep = () => setSteps((prev) => [...prev, emptyStep()]);

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const selectedTemplate = availableTemplates.find((t) => t.name === step.template_name);
        return (
          <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-1">
              {index + 1}
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-slate-500 mb-1">القالب</label>
                <select
                  value={step.template_name}
                  onChange={(e) => {
                    const t = availableTemplates.find((tpl) => tpl.name === e.target.value);
                    updateStep(index, { template_name: e.target.value, template_language: t?.language || 'ar' });
                  }}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">اختر قالباً...</option>
                  {availableTemplates.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
                {selectedTemplate && selectedTemplate.status !== 'approved' && (
                  <p className="text-[10px] font-bold text-amber-600 mt-1">هذا القالب لم يُعتمد من ميتا بعد.</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 mb-1">يُرسل بعد (أيام من التسجيل)</label>
                <input
                  type="number" min={0}
                  value={step.delay_days}
                  onChange={(e) => updateStep(index, { delay_days: Number(e.target.value) })}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeStep(index)}
              className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0 mt-1"
              title="حذف الخطوة"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-3 pt-1">
        <button type="button" onClick={addStep} className="text-xs font-bold text-indigo-600 hover:underline">
          + إضافة خطوة
        </button>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || steps.some((s) => !s.template_name)}
          className="h-9 px-4 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
          حفظ الخطوات
        </button>
      </div>
    </div>
  );
};

const SequenceDetail = ({ sequence }) => {
  const queryClient = useQueryClient();
  const [enrollOpen, setEnrollOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['drip-sequence', sequence.id],
    queryFn: () => dripSequencesApi.getDripSequence(sequence.id),
  });

  const stopMutation = useMutation({
    mutationFn: dripSequencesApi.stopDripEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-sequence', sequence.id] });
      queryClient.invalidateQueries({ queryKey: ['drip-sequences'] });
      toast.success('تم إيقاف التسجيل');
    },
    onError: () => toast.error('فشل إيقاف التسجيل'),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-600" size={22} /></div>;
  }

  const enrollments = data?.enrollments ?? [];

  return (
    <div className="border-t border-slate-100 pt-5 mt-2 space-y-6">
      <div>
        <h5 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">خطوات السلسلة</h5>
        <StepsEditor sequence={sequence} initialSteps={data?.sequence?.steps ?? []} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-xs font-black text-slate-600 uppercase tracking-wider">جهات الاتصال المسجَّلة ({enrollments.length})</h5>
          <button
            onClick={() => setEnrollOpen(true)}
            className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <UserPlus size={13} />
            تسجيل جهات اتصال
          </button>
        </div>

        {enrollments.length > 0 ? (
          <div className="space-y-1.5">
            {enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-slate-700 truncate">{e.contact?.name || '—'}</span>
                  <span className="text-slate-400 text-xs">{e.contact?.phone}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-slate-400">خطوة {e.current_step}</span>
                  <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-md', enrollmentStatusStyles[e.status])}>
                    {enrollmentStatusLabels[e.status]}
                  </span>
                  {e.status === 'active' && (
                    <button
                      onClick={() => stopMutation.mutate(e.id)}
                      className="text-[11px] font-bold text-rose-500 hover:underline"
                    >
                      إيقاف
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-lg">لا توجد جهات اتصال مسجَّلة بعد.</p>
        )}
      </div>

      <EnrollContactsModal open={enrollOpen} onClose={() => setEnrollOpen(false)} sequence={sequence} />
    </div>
  );
};

const DripSequencesPage = () => {
  const queryClient = useQueryClient();
  const { dialog: confirmDialog } = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['drip-sequences'],
    queryFn: dripSequencesApi.getDripSequences,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => dripSequencesApi.updateDripSequence(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-sequences'] });
      toast.success('تم تحديث حالة السلسلة');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const deleteMutation = useMutation({
    mutationFn: dripSequencesApi.deleteDripSequence,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drip-sequences'] }),
    onError: () => toast.error('فشل حذف السلسلة'),
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800">الحملات المتسلسلة</h1>
            <p className="text-slate-500 mt-1 font-medium text-sm">سلاسل رسائل تلقائية عبر عدة أيام لمتابعة العملاء.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCreateOpen(true)}
            className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>سلسلة جديدة</span>
          </motion.button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
            <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
            <p className="text-slate-500 font-medium">جاري جلب السلاسل...</p>
          </div>
        ) : sequences.length > 0 ? (
          <div className="space-y-4">
            {sequences.map((seq) => (
              <div key={seq.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:p-6">
                <div className="flex items-start justify-between gap-4">
                  <button
                    onClick={() => setExpandedId(expandedId === seq.id ? null : seq.id)}
                    className="flex items-start gap-3 flex-1 min-w-0 text-right"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <GitBranch size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm lg:text-base font-black text-slate-800">{seq.name}</h4>
                        <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tight border', statusStyles[seq.status])}>
                          {seq.status === 'active' ? 'مفعّلة' : 'موقوفة'}
                        </span>
                      </div>
                      {seq.description && <p className="text-xs text-slate-400 font-medium mt-1 line-clamp-1">{seq.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-[11px] font-bold text-slate-400">
                        <span>{seq.steps_count} خطوات</span>
                        <span className="flex items-center gap-1"><Users size={11} /> {seq.active_enrollments_count} نشط</span>
                        <span>{seq.completed_enrollments_count} مكتمل</span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleStatusMutation.mutate({ id: seq.id, status: seq.status === 'active' ? 'paused' : 'active' })}
                      className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title={seq.status === 'active' ? 'إيقاف مؤقت' : 'تفعيل'}
                    >
                      {seq.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      onClick={() => runWithUndo({ message: 'تم حذف السلسلة', onConfirm: () => deleteMutation.mutate(seq.id) })}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === seq.id ? null : seq.id)}
                      className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      {expandedId === seq.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {expandedId === seq.id && <SequenceDetail sequence={seq} />}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 lg:p-20 rounded-2xl border border-slate-100 shadow-sm text-center">
            <GitBranch size={48} className="text-slate-100 mb-5 mx-auto" strokeWidth={1} />
            <p className="text-base lg:text-lg font-black text-slate-600">لا توجد سلاسل متابعة</p>
            <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2 text-sm leading-relaxed">
              أنشئ سلسلة رسائل تلقائية لمتابعة العملاء الجدد أو الحملات الترويجية عبر عدة أيام.
            </p>
          </div>
        )}
      </div>

      <CreateDripSequenceModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {confirmDialog}
    </>
  );
};

export default DripSequencesPage;
