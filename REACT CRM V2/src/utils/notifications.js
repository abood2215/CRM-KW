// Maps a notification's type + data payload (set server-side in NotificationService
// callers) to the page it's actually about — returns null when there's nowhere sensible to go.
export const resolveNotificationLink = (notification) => {
  const data = notification?.data ?? {};

  switch (notification?.type) {
    case 'campaign_completed':
    case 'campaign_paused':
      return data.campaign_id ? `/campaigns/${data.campaign_id}/report` : null;
    case 'task_reminder':
      return '/tasks';
    case 'whatsapp_quality_degraded':
      return '/whatsapp';
    default:
      return null;
  }
};
