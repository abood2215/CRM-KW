import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { templates as templatesApi } from '../../../api';

const STATS = [
  ['sent', 'أُرسلت'],
  ['delivered', 'وصلت'],
  ['read', 'قُرئت'],
  ['replied', 'ردود'],
  ['failed', 'فشلت'],
];

const TemplateAnalyticsPanel = ({ templateId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['template-analytics', templateId],
    queryFn: () => templatesApi.getTemplateAnalytics(templateId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 size={16} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-50">
      <div className="grid grid-cols-5 gap-1.5 text-center">
        {STATS.map(([key, label]) => (
          <div key={key}>
            <p className="text-sm font-black text-slate-800">{data[key] ?? 0}</p>
            <p className="text-[9px] font-bold text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      {data.campaigns_count > 0 && (
        <p className="text-[10px] text-slate-400 font-bold text-center mt-2">
          استُخدم في {data.campaigns_count} حملة + {data.direct_sends} إرسال مباشر
        </p>
      )}
    </div>
  );
};

export default TemplateAnalyticsPanel;
