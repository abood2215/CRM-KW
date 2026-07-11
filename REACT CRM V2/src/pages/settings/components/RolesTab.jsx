import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, ShieldPlus, Pencil, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { roles as rolesApi } from '../../../api';
import { useConfirm } from '../../../hooks/useConfirm';
import RoleFormModal from './RoleFormModal';

const RolesTab = () => {
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const { data: roleList = [], isLoading, isError } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.getRoles,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rolesApi.deleteRole(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); toast.success('تم حذف الدور'); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل حذف الدور'),
  });

  const openCreate = () => { setEditingRole(null); setFormOpen(true); };
  const openEdit = (r) => { setEditingRole(r); setFormOpen(true); };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <div>
          <h3 className="font-black text-slate-800">الأدوار والصلاحيات</h3>
          <p className="text-xs text-slate-400 mt-0.5">أنشئ أدواراً مخصّصة وحدد ما يقدر كل دور يستخدمه من ميزات النظام.</p>
        </div>
        <button onClick={openCreate} className="h-10 px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all flex-shrink-0">
          <ShieldPlus size={14} /> دور جديد
        </button>
      </div>

      {isError ? (
        <div className="py-16 text-center">
          <AlertTriangle size={28} className="text-rose-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm font-bold">تعذّر تحميل الأدوار — حاول تحديث الصفحة.</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600 h-8 w-8" /></div>
      ) : (
        <div className="divide-y divide-slate-50">
          {roleList.map((r) => {
            const isProtectedAdmin = r.slug === 'admin';
            return (
              <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  {isProtectedAdmin ? <Lock size={16} /> : <ShieldPlus size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black text-slate-800 truncate">{r.name}</p>
                    {isProtectedAdmin && <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-50 text-rose-600">أساسي</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{r.users_count ?? 0} مستخدم · {r.permission_keys?.length ?? 0} صلاحية</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => openEdit(r)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <Pencil size={15} />
                  </button>
                  {!isProtectedAdmin && (
                    <button
                      onClick={async () => { if (await confirm(`هل تريد حذف دور "${r.name}"؟`)) deleteMutation.mutate(r.id); }}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RoleFormModal open={formOpen} onClose={() => setFormOpen(false)} role={editingRole} />
      {confirmDialog}
    </div>
  );
};

export default RolesTab;
