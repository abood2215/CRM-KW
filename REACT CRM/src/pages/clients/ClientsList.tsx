import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Client } from '../../types';
import {
  Users, Search, Download, Plus, ChevronRight, ChevronLeft,
  Phone, Calendar, Trash2, Loader2
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
    } catch {
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
    new: 'جديد', contacted: 'تواصل', interested: 'مهتم',
    booked: 'محجوز', active: 'نشط', following: 'متابعة',
  };

  return (
    <div className="space-y-5 lg:space-y-8 font-cairo">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">سجل العملاء</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">إدارة بيانات العملاء في مكان واحد.</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          <button
            onClick={handleExport}
            className="h-10 lg:h-11 px-4 lg:px-5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 text-sm"
          >
            <Download size={16} />
            <span className="hidden sm:inline">تصدير CSV</span>
            <span className="sm:hidden">تصدير</span>
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="h-10 lg:h-11 px-4 lg:px-5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            <span>إضافة عميل</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        {/* Search + Count */}
        <div className="p-4 lg:p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="البحث بالاسم، الهاتف..."
              className="w-full h-10 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
          <p className="text-sm font-bold text-slate-400 whitespace-nowrap">
            الإجمالي: <span className="text-slate-700">{response?.meta?.total || 0}</span> عملاء
          </p>
        </div>

        {/* Table - Scrollable on mobile */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
              <p className="text-slate-500 font-medium">جاري جلب قائمة العملاء...</p>
            </div>
          ) : (
            <table className="w-full text-right border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الاسم</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الهاتف</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden md:table-cell">المصدر</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الحالة</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden lg:table-cell">تاريخ الإضافة</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 border-b border-slate-100 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {response?.data?.length ? response.data.map((client) => (
                  <tr key={client.id} className="hover:bg-indigo-50/30 transition-all group">
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm flex-shrink-0">
                          {client.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{client.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{client.email || 'بدون إيميل'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <span className="text-xs lg:text-sm font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                        <Phone size={13} className="text-emerald-500 flex-shrink-0" />
                        {client.phone}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 hidden md:table-cell">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">{client.source}</span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <span className={cn("text-[10px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 w-fit whitespace-nowrap", statusColors[client.status || 'new'])}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                        {statusLabels[client.status || 'new'] || client.status}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-slate-400 font-medium text-xs">
                        <Calendar size={13} />
                        {format(new Date(client.created_at), 'dd MMM yyyy', { locale: ar })}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <div className="flex items-center justify-center">
                        <button
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          onClick={() => handleDelete(client)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center">
                        <Users size={48} className="text-slate-100 mb-4" />
                        <p className="text-slate-400 font-medium">لا يوجد عملاء يطابقون بحثك</p>
                        <button
                          onClick={() => setAddOpen(true)}
                          className="mt-4 h-10 px-6 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-all"
                        >
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

        {/* Pagination */}
        {response?.meta && response.meta.last_page > 1 && (
          <div className="p-4 lg:p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              صفحة {response.meta.current_page} من {response.meta.last_page}
            </span>
            <div className="flex items-center gap-1.5 lg:gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
              >
                <ChevronRight size={16} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(response.meta.last_page, 5))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={cn(
                      "w-9 h-9 lg:w-10 lg:h-10 rounded-xl font-black text-sm transition-all",
                      page === i + 1
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={page === response.meta.last_page}
                onClick={() => setPage(p => p + 1)}
                className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
              >
                <ChevronLeft size={16} />
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
