import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import api from '../../api/axios';
import { Client } from '../../types';
import {
  Users, Plus, Search, MoreVertical, DollarSign, Loader2, PhoneCall, CalendarDays
} from 'lucide-react';
import AddClientModal from '../../components/AddClientModal';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const STAGES = [
  { id: 'new', title: 'جديد', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { id: 'contacted', title: 'تم التواصل', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'interested', title: 'مهتم', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'booked', title: 'محجوز', color: 'bg-sky-50 border-sky-200 text-sky-700' },
  { id: 'active', title: 'نشط', color: 'bg-violet-50 border-violet-200 text-violet-700' },
  { id: 'following', title: 'متابعة', color: 'bg-rose-50 border-rose-200 text-rose-700' },
];

const Pipeline: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addStatus, setAddStatus] = useState('new');
  const [mobileActiveStage, setMobileActiveStage] = useState('new');

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients-pipeline'],
    queryFn: async () => {
      const { data } = await api.get('/clients/pipeline');
      return data.pipeline;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return api.put(`/clients/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-pipeline'] });
      toast.success('تم تحديث حالة العميل');
    },
    onError: () => toast.error('فشل تحديث حالة العميل'),
  });

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const clientId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    updateStatusMutation.mutate({ id: clientId, status: newStatus });
  };

  const getClientsInStage = (stageId: string) => {
    const stage = (clients as any[]).find(s => s.status === stageId);
    if (!stage) return [];
    return (stage.clients as Client[]).filter(c => (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    ));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
        <span className="text-slate-500 font-medium font-cairo">جاري تحميل لوحة المتابعة...</span>
      </div>
    );
  }

  const activeStageData = STAGES.find(s => s.id === mobileActiveStage)!;
  const activeClients = getClientsInStage(mobileActiveStage);

  return (
    <div className="h-full flex flex-col font-cairo">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 lg:mb-8 gap-4 px-1">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">تتبع العملاء</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">نظام إدارة وتحويل العملاء المحتملين.</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="relative flex-1 sm:flex-none sm:w-56 lg:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ابحث عن عميل..."
              className="w-full h-10 lg:h-11 pr-10 pl-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setAddStatus('new'); setAddOpen(true); }}
            className="h-10 lg:h-11 px-4 lg:px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 whitespace-nowrap text-sm flex-shrink-0"
          >
            <Plus size={16} />
            <span>عميل جديد</span>
          </button>
        </div>
      </div>

      {/* ============ Mobile Stage Tabs ============ */}
      <div className="lg:hidden mb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max px-1">
          {STAGES.map((stage) => {
            const count = getClientsInStage(stage.id).length;
            return (
              <button
                key={stage.id}
                onClick={() => setMobileActiveStage(stage.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border transition-all whitespace-nowrap",
                  mobileActiveStage === stage.id
                    ? stage.color + " shadow-sm"
                    : "bg-white text-slate-400 border-slate-200"
                )}
              >
                {stage.title}
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                  mobileActiveStage === stage.id ? "bg-white/60" : "bg-slate-100"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ Mobile Stage Content ============ */}
      <div className="lg:hidden flex-1 overflow-y-auto space-y-3 px-1 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className={cn("text-sm font-black px-3 py-1 rounded-lg", activeStageData.color)}>
            {activeStageData.title}
            <span className="mr-2 opacity-70">({activeClients.length})</span>
          </h3>
          <button
            onClick={() => { setAddStatus(mobileActiveStage); setAddOpen(true); }}
            className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus size={16} />
          </button>
        </div>
        {activeClients.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
            <Users size={36} className="text-slate-100 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">لا يوجد عملاء في هذه المرحلة</p>
          </div>
        ) : activeClients.map((client) => (
          <div
            key={client.id}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="flex items-start justify-between mb-2.5">
              <div>
                <h4 className="text-sm font-black text-slate-800">{client.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{client.source}</p>
              </div>
              <button className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg">
                <MoreVertical size={15} />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <PhoneCall size={13} className="text-slate-400" />
                <span>{client.phone}</span>
              </div>
              {client.budget && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <DollarSign size={13} />
                  <span>{client.budget} ريال</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ============ Desktop Kanban ============ */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="hidden lg:flex gap-5 overflow-x-auto pb-6 flex-1 min-h-0">
          {STAGES.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-[270px] xl:w-[290px] flex flex-col">
              <div className={cn(
                "flex items-center justify-between px-4 py-3 border-b-2 mb-3 rounded-xl shadow-sm",
                stage.color
              )}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest">{stage.title}</span>
                  <span className="bg-white/60 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-5 text-center">
                    {getClientsInStage(stage.id).length}
                  </span>
                </div>
                <button
                  onClick={() => { setAddStatus(stage.id); setAddOpen(true); }}
                  className="text-current opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Plus size={15} />
                </button>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 rounded-2xl transition-all p-2 space-y-3 overflow-y-auto",
                      snapshot.isDraggingOver ? "bg-slate-100/50" : "bg-transparent"
                    )}
                  >
                    <AnimatePresence>
                      {getClientsInStage(stage.id).map((client, index) => (
                        <Draggable key={client.id} draggableId={client.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-xl group relative overflow-hidden cursor-grab active:cursor-grabbing",
                                snapshot.isDragging ? "shadow-2xl ring-2 ring-indigo-500 rotate-2 scale-105" : "hover:-translate-y-1"
                              )}
                            >
                              <div className="flex items-start justify-between mb-2.5">
                                <div className="min-w-0">
                                  <h4 className="text-sm font-black text-slate-800 truncate">{client.name}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{client.source}</p>
                                </div>
                                <button className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0">
                                  <MoreVertical size={14} />
                                </button>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                  <PhoneCall size={13} className="text-slate-400" />
                                  <span>{client.phone}</span>
                                </div>
                                {client.service && (
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                    <CalendarDays size={13} className="text-slate-400" />
                                    <span>{client.service}</span>
                                  </div>
                                )}
                                {client.budget && (
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600">
                                    <DollarSign size={13} />
                                    <span>{client.budget} ريال</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-300">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-white">
                                    <Users size={11} />
                                  </div>
                                  <span>{client.user?.name || 'غير معين'}</span>
                                </div>
                                <span>{new Date(client.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</span>
                              </div>

                              {snapshot.isDragging && (
                                <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500" />
                              )}
                            </motion.div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} defaultStatus={addStatus} />
    </div>
  );
};

export default Pipeline;
