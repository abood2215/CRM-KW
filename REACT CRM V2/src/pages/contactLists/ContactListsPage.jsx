import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, Loader2, ListChecks, X } from 'lucide-react';
import { contactLists as contactListsApi } from '../../api';
import ImportContactsModal from '../../components/ImportContactsModal';
import ListContactsModal from './components/ListContactsModal';

const ContactListsPage = () => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [importListId, setImportListId] = useState(null);
  const [viewList, setViewList] = useState(null);
  const [editList, setEditList] = useState(null);
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: contactListsApi.getContactLists,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contact-lists'] });

  const createMutation = useMutation({
    mutationFn: () => contactListsApi.createContactList({ name }),
    onSuccess: () => { invalidate(); toast.success('تم إنشاء القائمة'); setAddOpen(false); setName(''); },
  });

  const updateMutation = useMutation({
    mutationFn: () => contactListsApi.updateContactList(editList.id, { name: editName }),
    onSuccess: () => { invalidate(); toast.success('تم تحديث القائمة'); setEditList(null); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل التحديث'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => contactListsApi.deleteContactList(id),
    onSuccess: () => { invalidate(); toast.success('تم حذف القائمة'); },
  });

  const openEdit = (l) => { setEditList(l); setEditName(l.name); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">قوائم التواصل</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">مجموعات جهات اتصال لاستهداف الحملات.</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm self-start sm:self-auto">
          <Plus size={16} />
          <span>قائمة جديدة</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600 h-10 w-10" /></div>
      ) : lists.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <ListChecks size={40} className="text-slate-100 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">لا توجد قوائم بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-black text-slate-800 cursor-pointer hover:text-indigo-600" onClick={() => setViewList(l)}>{l.name}</h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(l)} className="p-1.5 text-slate-300 hover:text-indigo-500">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => { if (window.confirm('حذف هذه القائمة؟')) deleteMutation.mutate(l.id); }} className="p-1.5 text-slate-300 hover:text-rose-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="text-2xl font-black text-indigo-600 mb-3 cursor-pointer" onClick={() => setViewList(l)}>{l.count}</p>
              <button onClick={() => setImportListId(l.id)} className="w-full h-9 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50">
                استيراد جهات اتصال لهذه القائمة
              </button>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">قائمة جديدة</h2>
              <button onClick={() => setAddOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="p-8 space-y-4">
              <input required placeholder="اسم القائمة" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <button type="submit" disabled={createMutation.isPending} className="w-full h-12 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                {createMutation.isPending && <Loader2 size={18} className="animate-spin" />}
                إنشاء
              </button>
            </form>
          </div>
        </div>
      )}

      {editList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">تعديل القائمة</h2>
              <button onClick={() => setEditList(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="p-8 space-y-4">
              <input required placeholder="اسم القائمة" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <button type="submit" disabled={updateMutation.isPending} className="w-full h-12 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                {updateMutation.isPending && <Loader2 size={18} className="animate-spin" />}
                حفظ
              </button>
            </form>
          </div>
        </div>
      )}

      <ImportContactsModal open={!!importListId} onClose={() => setImportListId(null)} contactListId={importListId} />
      <ListContactsModal list={viewList} onClose={() => setViewList(null)} />
    </div>
  );
};

export default ContactListsPage;
