import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { users as usersApi } from '../../../api';
import { useAuthStore } from '../../../store/useAuthStore';
import UserFormModal from './UserFormModal';

const ROLE_LABELS = {
  admin: { label: 'مدير نظام', cls: 'bg-rose-50 text-rose-600' },
  manager: { label: 'مشرف', cls: 'bg-amber-50 text-amber-600' },
  agent: { label: 'موظف', cls: 'bg-indigo-50 text-indigo-600' },
};

const UsersTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { data: userList = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('تم حذف المستخدم'); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل حذف المستخدم'),
  });

  const openCreate = () => { setEditingUser(null); setFormOpen(true); };
  const openEdit = (u) => { setEditingUser(u); setFormOpen(true); };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <div>
          <h3 className="font-black text-slate-800">مستخدمو النظام</h3>
          <p className="text-xs text-slate-400 mt-0.5">{userList.length} مستخدم مسجّل</p>
        </div>
        <button onClick={openCreate} className="h-10 px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all">
          <UserPlus size={14} /> إضافة مستخدم
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600 h-8 w-8" /></div>
      ) : (
        <div className="divide-y divide-slate-50">
          {userList.map((u) => {
            const roleInfo = ROLE_LABELS[u.role] ?? ROLE_LABELS.agent;
            return (
              <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black text-slate-800 truncate">{u.name}</p>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${roleInfo.cls}`}>{roleInfo.label}</span>
                    {!u.is_active && <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-400">معطل</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => openEdit(u)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <Pencil size={15} />
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => { if (window.confirm(`هل تريد حذف "${u.name}"؟`)) deleteMutation.mutate(u.id); }}
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

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} user={editingUser} />
    </div>
  );
};

export default UsersTab;
