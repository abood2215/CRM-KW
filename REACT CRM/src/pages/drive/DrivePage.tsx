import React, { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useDebounce } from '../../hooks/useDebounce';
import { FileRecord } from '../../types';
import {
  Upload,
  Download,
  Trash2,
  Search,
  Filter,
  Loader2,
  File,
  Image,
  FileText,
  Database,
  HardDrive,
  Plus,
  MoreVertical,
  Eye,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

// ==============================
// صفحة مركز الملفات (Drive)
// ==============================
const DrivePage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'image' | 'csv' | 'document' | 'other'>('all');
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // Reset to page 1 on new search or category change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category]);

  // جلب الملفات
  const { data: filesData, isLoading } = useQuery({
    queryKey: ['files', debouncedSearch, category, page],
    queryFn: async () => {
      const { data } = await api.get('/drive', {
        params: {
          search: debouncedSearch || undefined,
          category: category !== 'all' ? category : undefined,
          page,
        }
      });
      return data;
    },
  });

  // حذف ملف
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/drive/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('تم حذف الملف.');
    },
    onError: () => toast.error('فشل حذف الملف.'),
  });

  // رفع ملف
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await api.post('/drive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success(`تم رفع ${file.name}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      const message = error?.response?.data?.message || 'فشل رفع الملف';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  // تحميل ملف
  const handleDownload = async (file: FileRecord) => {
    try {
      const response = await api.get(`/drive/${file.id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.original_name);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('فشل تحميل الملف');
    }
  };

  // أيقونة الفئة
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <Image size={16} />;
      case 'csv':
        return <Database size={16} />;
      case 'document':
        return <FileText size={16} />;
      default:
        return <File size={16} />;
    }
  };

  // تسمية الفئة
  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      image: 'صور',
      csv: 'بيانات CSV',
      document: 'مستندات',
      other: 'أخرى'
    };
    return labels[cat] || cat;
  };

  const files = filesData?.files || [];
  const storageUsed = filesData?.storage_used || 0;
  const totalSize = 1099511627776; // 1TB in bytes
  const usagePercent = (storageUsed / totalSize) * 100;

  const categories = [
    { value: 'all' as const, label: 'جميع الملفات' },
    { value: 'image' as const, label: 'صور' },
    { value: 'csv' as const, label: 'بيانات CSV' },
    { value: 'document' as const, label: 'مستندات' },
    { value: 'other' as const, label: 'أخرى' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-cairo">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <HardDrive size={32} className="text-indigo-600" />
              مركز الملفات
            </h1>
            <p className="text-slate-600 mt-1">إدارة ملفاتك وبيانات الحملات</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                جاري الرفع...
              </>
            ) : (
              <>
                <Plus size={18} />
                رفع ملف
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </div>

        {/* Storage Usage */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">مساحة التخزين</h2>
            <span className="text-sm text-slate-600">
              {Math.round((storageUsed / 1048576) * 10) / 10} MB من 1 TB
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all rounded-full',
                usagePercent < 50 ? 'bg-green-500' :
                usagePercent < 80 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Search */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن ملف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all',
                  category === cat.value
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-white border border-slate-300 text-slate-700 hover:border-indigo-300'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Files Grid/List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center h-64 flex-col gap-4">
              <File size={48} className="text-slate-300" />
              <p className="text-slate-500 text-lg">لا توجد ملفات</p>
              <p className="text-slate-400 text-sm">ابدأ برفع ملفك الأول</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">الملف</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">النوع</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">الحجم</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">تاريخ الرفع</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {files.map((file: FileRecord) => (
                    <tr
                      key={file.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                            {getCategoryIcon(file.category)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 max-w-xs truncate">
                              {file.original_name}
                            </p>
                            <p className="text-xs text-slate-500">{file.mime_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                          {getCategoryIcon(file.category)}
                          {getCategoryLabel(file.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {file.size_formatted || `${(file.size / 1024).toFixed(1)} KB`}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {new Date(file.created_at).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors tooltip"
                            title="تحميل"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(file.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50 tooltip"
                            title="حذف"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filesData?.meta && filesData.meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-4 p-6 border-t border-slate-200">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              
              <span className="text-sm text-slate-600">
                صفحة {filesData.meta.current_page} من {filesData.meta.last_page}
              </span>
              
              <button
                onClick={() => setPage(Math.min(filesData.meta.last_page, page + 1))}
                disabled={page === filesData.meta.last_page}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">تنبيه مهم</h3>
              <p className="text-amber-800 text-sm mt-1">
                الملفات المرفوعة محمية وخاصة بحسابك فقط. احرص على عدم مشاركة الملفات الحساسة.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .tooltip::after {
          content: attr(title);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          z-index: 10;
        }
        .tooltip:hover::after {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default DrivePage;
