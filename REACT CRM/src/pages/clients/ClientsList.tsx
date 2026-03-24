import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Client } from '../../types';
import {
  Users, Search, Filter, Download, Plus, ChevronRight, ChevronLeft,
  Phone, Calendar, Eye, Edit, Trash2, Loader2
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import AddClientModal from '../../components/AddClientModal';

const ClientsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const { data: response, isLoading } = useQuery<{ data: Client[], meta: any }>({
    queryKey: ['clients', page, searchTerm],
    queryFn: async () => {
      const { data } = await api.get('/clients', { params: { page, search: searchTerm } });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('تم حذف العميل');
    },
    onError: () => toast.error('فشل حذف العميل'),
  });

  const handleDelete = (client: Client) => {
    if (window.confirm(`هل أنت متأكد من حذف العميل "${client.name}"؟`)) {
      deleteMutation.mutate(client.id);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/clients/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clients_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('تم تصدير البيانات');
    } catch (error) {
      toast.error('فشل التصدير');
    }
  };

  const statusColors: Record<string, string> = {
    new: 'text-indigo-600 bg-indigo-50',
    contacted: 'text-emerald-600 bg-emerald-50',
    interested: 'text-amber-600 bg-amber-50',
    booked: 'text-blue-600 bg-blue-50',
    active: 'text-purple-600 bg-purple-50',
    following: 'text-rose-600 bg-rose-50',
  };

  const statusLabels: Record<string, string> = {
    new: 'جديد', contacted: 'تم التواصل', interested: 'مهتم',
    booked: 'محجوز', active: 'نشط', following: 'متابعة',
  };

  return (
    <div className="space-y-8 font-cairo animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">سجل العملاء</h1>
          <p className="text-slate-500 mt-1 font-medium">إدارة كافة بيانات العملاء والتواصل معهم في مكان واحد.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport}
            className="h-11 px-6 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
            <Download size={18} />
            <span>تصدير CSV</span>
          </button>
          <button onClick={() => setAddOpen(true)}
            className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
            <Plus size={18} />
            <span>إضافة عميل</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="البحث بالاسم، الهاتف، أو البريد..."
              className="w-full h-11 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <p className="text-sm font-bold text-slate-400">الإجمالي: {response?.meta?.total || 0} عملاء</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
              <p className="text-slate-500 font-medium">جاري جلب قائمة العملاء...</p>
            </div>
          ) : (
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الاسم</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الهاتف</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">المصدر</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الحالة</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">تاريخ الإضافة</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {response?.data?.length ? response.data.map((client) => (
                  <tr key={client.id} className="hover:bg-indigo-50/30 transition-all group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{client.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{client.email || 'بدون إيميل'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Phone size={14} className="text-emerald-500" />
                        {client.phone}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{client.source}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 w-fit", statusColors[client.status || 'new'])}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        {statusLabels[client.status || 'new'] || client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-400 font-medium text-xs">
                        <Calendar size={14} />
                        {format(new Date(client.created_at), 'dd MMM yyyy', { locale: ar })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all shadow-sm"
                          onClick={() => handleDelete(client)}
                          disabled={deleteMutation.isPending}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center">
                        <Users size={60} className="text-slate-100 mb-4" />
                        <p className="text-slate-400 font-medium">لا يوجد عملاء يطابقون بحثك حالياً</p>
                        <button onClick={() => setAddOpen(true)}
                          className="mt-4 h-10 px-6 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-all">
                          إضافة أول عميل
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {response?.meta && (
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">عرض صفحة {response.meta.current_page} من {response.meta.last_page}</span>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all font-bold">
                <ChevronRight size={18} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(response.meta.last_page, 5))].map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={cn("w-10 h-10 rounded-xl font-black text-sm transition-all",
                      page === i + 1 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <button disabled={page === response.meta.last_page} onClick={() => setPage(p => p + 1)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all font-bold">
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
};

export default ClientsList;
