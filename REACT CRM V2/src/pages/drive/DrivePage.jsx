import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, Trash2, Download, Loader2, FileIcon, HardDrive, Search } from 'lucide-react';
import { drive as driveApi } from '../../api';
import { cn } from '../../utils/cn';

const CATEGORIES = [
  { value: '', label: 'الكل' },
  { value: 'image', label: 'صور' },
  { value: 'document', label: 'مستندات' },
  { value: 'csv', label: 'CSV' },
  { value: 'other', label: 'أخرى' },
];

const DrivePage = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['drive', search, category, page],
    queryFn: () => driveApi.getFiles({ search: search || undefined, category: category || undefined, page }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => driveApi.uploadFile(file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drive'] }); toast.success('تم رفع الملف'); },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل رفع الملف'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => driveApi.deleteFile(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drive'] }); toast.success('تم الحذف'); },
  });

  const files = data?.files ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">الملفات</h1>
          <p className="text-slate-500 mt-1 text-sm flex items-center gap-1.5">
            <HardDrive size={13} />
            {data ? `${Math.round((data.storage_used / 1048576) * 10) / 10} MB مستخدمة` : ''}
          </p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 flex items-center gap-2 text-sm">
          {uploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          رفع ملف
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files[0] && uploadMutation.mutate(e.target.files[0])} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث باسم الملف..."
            className="w-full h-11 pr-11 pl-4 bg-white border border-slate-200 rounded-xl text-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => { setCategory(c.value); setPage(1); }}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border',
                category === c.value ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
        ) : files.length === 0 ? (
          <div className="py-16 text-center">
            <FileIcon size={32} className="text-slate-100 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">لا توجد ملفات</p>
          </div>
        ) : (
          files.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={16} className="text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{f.original_name}</p>
                  <p className="text-xs text-slate-400">{f.size_formatted}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={driveApi.downloadFileUrl(f.id)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><Download size={15} /></a>
                <button onClick={() => deleteMutation.mutate(f.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"><Trash2 size={15} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 font-medium">صفحة {meta.current_page} من {meta.last_page} — {meta.total} ملف</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 px-4 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50">السابق</button>
            <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="h-9 px-4 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50">التالي</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrivePage;
