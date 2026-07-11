export const formatResponseTime = (minutes) => {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} دقيقة`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} ساعة`;
  return `${(minutes / 1440).toFixed(1)} يوم`;
};
