import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Loader2, Users, Phone, AlertTriangle } from 'lucide-react';
import { contactLists as contactListsApi } from '../../../api';
import { useModalA11y } from '../../../hooks/useModalA11y';

const ListContactsModal = ({ list, onClose }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ref = useModalA11y(!!list, onClose);

  useEffect(() => {
    setSearch('');
    setPage(1);
  }, [list?.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contact-list', list?.id, search, page],
    queryFn: () => contactListsApi.getContactList(list.id, { search: search || undefined, page }),
    enabled: !!list,
  });

  if (!list) return null;

  const members = data?.contacts ?? [];
  const meta = data?.meta;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={ref} role="dialog" aria-modal="true" className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800">{list.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5 font-medium">{list.count ?? members.length} جهة اتصال</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="px-8 py-4 border-b border-slate-50 shrink-0">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="بحث بالاسم أو الرقم..."
              className="w-full h-10 pr-9 pl-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-2">
          {isError ? (
            <div className="text-center py-16">
              <AlertTriangle size={28} className="text-rose-400 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm">تعذّر تحميل جهات الاتصال.</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-indigo-600 h-7 w-7" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-16">
              <Users size={28} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-bold text-sm">لا توجد جهات اتصال</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-right py-3 px-4 font-black text-slate-400 text-xs">الاسم</th>
                  <th className="text-right py-3 px-4 font-black text-slate-400 text-xs">الهاتف</th>
                  <th className="text-right py-3 px-4 font-black text-slate-400 text-xs hidden sm:table-cell">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{c.name || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" />
                        {c.phone}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      {c.opt_in ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">مشترك</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold">غير مشترك</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-8 py-4 border-t border-slate-100 shrink-0 space-y-3">
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">صفحة {meta.current_page} من {meta.last_page}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 px-3 border border-slate-200 rounded-lg font-bold disabled:opacity-40 hover:bg-slate-50"
                >
                  السابق
                </button>
                <button
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-3 border border-slate-200 rounded-lg font-bold disabled:opacity-40 hover:bg-slate-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
          <button onClick={onClose} className="w-full h-10 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm transition-all">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListContactsModal;
