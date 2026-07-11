import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Users, Plus, Search, MoreVertical, DollarSign, Loader2, PhoneCall, CalendarDays, ChevronDown } from 'lucide-react';
import { contacts } from '../../api';
import { cn } from '../../utils/cn';
import { useEcho } from '../../hooks/useEcho';
import AddContactModal from '../../components/AddContactModal';

const STAGES = [
  { id: 'new', title: 'جديد', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { id: 'contacted', title: 'تم التواصل', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'interested', title: 'مهتم', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'booked', title: 'محجوز', color: 'bg-sky-50 border-sky-200 text-sky-700' },
  { id: 'active', title: 'نشط', color: 'bg-violet-50 border-violet-200 text-violet-700' },
  { id: 'following', title: 'متابعة', color: 'bg-rose-50 border-rose-200 text-rose-700' },
];

const PipelinePage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addStage, setAddStage] = useState('new');
  const [extra, setExtra] = useState({});
  const [loadingMore, setLoadingMore] = useState(null);

  const { data: pipeline = [], isLoading } = useQuery({
    queryKey: ['contacts-pipeline'],
    queryFn: contacts.getPipeline,
  });

  const echo = useEcho();
  useEffect(() => {
    if (!echo) return undefined;

    const channel = echo.channel('contacts');
    const onUpdated = () => queryClient.invalidateQueries({ queryKey: ['contacts-pipeline'] });

    channel.listen('.ContactUpdatedEvent', onUpdated);

    return () => channel.stopListening('.ContactUpdatedEvent', onUpdated);
  }, [echo, queryClient]);

  const loadMore = async (stageId) => {
    const baseCount = getStageData(stageId)?.contacts.length ?? 0;
    const extraCount = extra[stageId]?.contacts.length ?? 0;
    setLoadingMore(stageId);
    try {
      const result = await contacts.getPipelineStage(stageId, baseCount + extraCount);
      setExtra((prev) => ({
        ...prev,
        [stageId]: {
          contacts: [...(prev[stageId]?.contacts ?? []), ...result.contacts],
          has_more: result.has_more,
        },
      }));
    } catch {
      toast.error('فشل تحميل المزيد');
    } finally {
      setLoadingMore(null);
    }
  };

  const updateStageMutation = useMutation({
    mutationFn: ({ id, pipeline_stage }) => contacts.updateContact(id, { pipeline_stage }),
    onSuccess: (_data, { pipeline_stage, sourceStage }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts-pipeline'] });
      // Only the two columns actually affected by the move need their "load more"
      // pagination reset — clearing every column wiped progress a user had loaded
      // on unrelated columns for every single drag.
      setExtra((prev) => {
        const next = { ...prev };
        delete next[pipeline_stage];
        delete next[sourceStage];
        return next;
      });
      toast.success('تم تحديث مرحلة جهة الاتصال');
    },
    onError: () => toast.error('فشل تحديث المرحلة'),
  });

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    updateStageMutation.mutate({ id: parseInt(draggableId, 10), pipeline_stage: destination.droppableId, sourceStage: source.droppableId });
  };

  const getStageData = (stageId) => pipeline.find((s) => s.stage === stageId);

  const getContactsInStage = (stageId) => {
    const stage = getStageData(stageId);
    if (!stage) return [];
    const all = [...stage.contacts, ...(extra[stageId]?.contacts ?? [])];
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone ?? '').includes(searchTerm)
    );
  };

  const hasMore = (stageId) => extra[stageId]?.has_more ?? getStageData(stageId)?.has_more ?? false;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
        <span className="text-slate-500 font-medium">جاري تحميل لوحة المتابعة...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">تتبع العملاء</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">نظام إدارة وتحويل العملاء المحتملين.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-56 lg:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ابحث عن جهة اتصال..."
              className="w-full h-11 pr-10 pl-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setAddStage('new'); setAddOpen(true); }}
            className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <Plus size={16} />
            <span>جهة اتصال جديدة</span>
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-5 overflow-x-auto pb-6 flex-1 min-h-0 snap-x snap-mandatory">
          {STAGES.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-[280px] flex flex-col snap-start">
              <div className={cn('flex items-center justify-between px-4 py-3 border-b-2 mb-3 rounded-xl shadow-sm', stage.color)}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest">{stage.title}</span>
                  <span className="bg-white/60 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-5 text-center">
                    {getStageData(stage.id)?.count ?? 0}
                  </span>
                </div>
                <button onClick={() => { setAddStage(stage.id); setAddOpen(true); }} className="text-current opacity-60 hover:opacity-100 transition-opacity">
                  <Plus size={15} />
                </button>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn('flex-1 rounded-2xl transition-all p-2 space-y-3 overflow-y-auto', snapshot.isDraggingOver ? 'bg-slate-100/50' : 'bg-transparent')}
                  >
                    <AnimatePresence>
                      {getContactsInStage(stage.id).map((contact, index) => (
                        <Draggable key={contact.id} draggableId={contact.id.toString()} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={cn(
                                'bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-xl cursor-grab active:cursor-grabbing',
                                dragSnapshot.isDragging ? 'shadow-2xl ring-2 ring-indigo-500 rotate-2 scale-105' : 'hover:-translate-y-1'
                              )}
                            >
                              <div className="flex items-start justify-between mb-2.5">
                                <div className="min-w-0">
                                  <h4 className="text-sm font-black text-slate-800 truncate">{contact.name}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{contact.source}</p>
                                </div>
                                <button
                                  className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                                  onClick={() => navigate(`/contacts/${contact.id}`)}
                                >
                                  <MoreVertical size={14} />
                                </button>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                  <PhoneCall size={13} className="text-slate-400" />
                                  <span>{contact.phone}</span>
                                </div>
                                {contact.service && (
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                    <CalendarDays size={13} className="text-slate-400" />
                                    <span>{contact.service}</span>
                                  </div>
                                )}
                                {contact.budget && (
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600">
                                    <DollarSign size={13} />
                                    <span>{contact.budget}</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-300">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-white">
                                    <Users size={11} />
                                  </div>
                                  <span>{contact.user?.name || 'غير معين'}</span>
                                </div>
                                <span>{new Date(contact.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</span>
                              </div>
                            </motion.div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}
                    {getContactsInStage(stage.id).length === 0 && (
                      <div className="py-10 text-center text-slate-300 text-xs font-bold">لا يوجد</div>
                    )}
                    {!searchTerm && hasMore(stage.id) && (
                      <button
                        onClick={() => loadMore(stage.id)}
                        disabled={loadingMore === stage.id}
                        className="w-full h-9 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        {loadingMore === stage.id ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
                        تحميل المزيد
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <AddContactModal open={addOpen} onClose={() => setAddOpen(false)} defaultStage={addStage} />
    </div>
  );
};

export default PipelinePage;
