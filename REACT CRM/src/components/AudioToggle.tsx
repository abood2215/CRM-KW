import React, { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useEcho } from '../hooks/useEcho';
import { useAudioNotification } from '../hooks/useAudioNotification';
import { cn } from '../utils/cn';

/**
 * زر تفعيل/تعطيل الإشعارات الصوتية
 * يستمع لأحداث WebSocket من قناة conversations الفعلية في الـ backend
 *
 * NewMessageEvent        → يبث على Channel('conversations')
 * ConversationUpdatedEvent → يبث على Channel('conversations')
 */
const AudioToggle: React.FC = () => {
  const { enabled, toggle, playMessage, playConversation } = useAudioNotification();
  const echo = useEcho();

  useEffect(() => {
    if (!echo) return;

    // القناة الفعلية التي يبث عليها NewMessageEvent و ConversationUpdatedEvent
    const channel = echo.channel('conversations');

    // رسالة واردة جديدة (direction: 'in' فقط تحتاج صوت)
    channel.listen('.NewMessageEvent', (e: { direction?: string }) => {
      if (e.direction === 'in') {
        playMessage();
      }
    });

    // محادثة جديدة أو محادثة وصل إليها رسالة أولى (unread_count = 1)
    channel.listen('.ConversationUpdatedEvent', (e: { unread_count?: number }) => {
      if (e.unread_count === 1) {
        // الصوت المختلف = محادثة جديدة (أول رسالة)
        playConversation();
      }
    });

    return () => {
      // stopListening فقط بدون leaveChannel لتجنب قطع اشتراك صفحات أخرى تستخدم نفس القناة
      channel.stopListening('.NewMessageEvent');
      channel.stopListening('.ConversationUpdatedEvent');
    };
  }, [echo, playMessage, playConversation]);

  return (
    <button
      onClick={toggle}
      title={enabled ? 'إيقاف صوت الإشعارات' : 'تفعيل صوت الإشعارات'}
      className={cn(
        'relative p-2 rounded-xl transition-all',
        enabled
          ? 'text-indigo-600 hover:bg-indigo-50'
          : 'text-slate-400 hover:bg-slate-100'
      )}
    >
      {enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}

      {/* مؤشر صغير يدل على الحالة */}
      <span className={cn(
        'absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full',
        enabled ? 'bg-emerald-500' : 'bg-slate-300'
      )} />
    </button>
  );
};

export default AudioToggle;
