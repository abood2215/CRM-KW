import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';
import { roles as rolesApi } from '../../../api';
import { useModalA11y } from '../../../hooks/useModalA11y';

/** Always kept on the "admin" role so there's always a working recovery account — mirrors the backend guard. */
const PROTECTED_ADMIN_KEYS = ['roles.manage', 'users.manage'];

const emptyForm = { name: '', permission_keys: [] };

const RoleFormModal = ({ open, onClose, role }) => {
  const queryClient = useQueryClient();
  const ref = useModalA11y(open, onClose);
  const [form, setForm] = useState(emptyForm);
  const isEdit = !!role;
  const isProtectedAdmin = role?.slug === 'admin';

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApi.getPermissions,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setForm(role ? { name: role.name, permission_keys: role.permission_keys ?? [] } : emptyForm);
    }
  }, [open, role]);

  const mutation = useMutation({
    mutationFn: () => (isEdit ? rolesApi.updateRole(role.id, form) : rolesApi.createRole(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(isEdit ? 'تم تحديث الدور' : 'تم إنشاء الدور بنجاح');
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشلت العملية'),
  });

  const togglePermission = (key) => {
    setForm((f) => ({
      ...f,
      permission_keys: f.permission_keys.includes(key)
        ? f.permission_keys.filter((k) => k !== key)
        : [...f.permission_keys, key],
    }));
  };

  const groups = permissions.reduce((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div ref={ref} role="dialog" aria-modal="true" className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-black text-slate-800">{isEdit ? 'تعديل الدور' : 'دور جديد'}</h2>
          <button onClick={onClose} title="إغلاق" aria-label="إغلاق" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">اسم الدور *</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="مثال: موظف مبيعات" />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-2">الصلاحيات</label>
            <div className="space-y-4">
              {Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <p className="text-[11px] font-black text-slate-400 mb-1.5">{group}</p>
                  <div className="space-y-1.5">
                    {items.map((p) => {
                      const locked = isProtectedAdmin && PROTECTED_ADMIN_KEYS.includes(p.key);
                      return (
                        <label key={p.key} className={`flex items-center gap-2.5 p-2 rounded-lg ${locked ? 'opacity-60' : 'hover:bg-slate-50'}`} title={locked ? 'صلاحية أساسية لدور المدير — لا يمكن سحبها' : undefined}>
                          <input
                            type="checkbox"
                            checked={form.permission_keys.includes(p.key)}
                            disabled={locked}
                            onChange={() => togglePermission(p.key)}
                          />
                          <span className="text-sm font-bold text-slate-700">{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl">إلغاء</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 h-11 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'حفظ' : 'إنشاء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleFormModal;
