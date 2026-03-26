import React, { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useEcho } from '../hooks/useEcho';
import { useAudioNotification } from '../hooks/useAudioNotification';
import { cn } from '../utils/cn';

/**
 * زر تفعيل/تعطيل الإشعارات الصوتية
 * يستمع أيضاً لأحداث WebSocket ويشغّل الصوت تلقائياً
 */
const AudioToggle: React.FC = () => {
  const { enabled, toggle, playMessage, playConversation } = useAudioNotification();
  const echo = useEcho();

  // الاستماع لأحداث WebSocket وتشغيل الصوت
  useEffect(() => {
    if (!echo) return;

    // استمع لقناة الرسائل العامة
    const messageChannel = echo.channel('messages');
    const conversationChannel = echo.channel('conversations');

    // رسالة واردة جديدة
    messageChannel.listen('.message.received', () => {
      playMessage();
    });

    // محادثة جديدة
    conversationChannel.listen('.conversation.created', () => {
      playConversation();
    });

    return () => {
      messageChannel.stopListening('.message.received');
      conversationChannel.stopListening('.conversation.created');
      echo.leaveChannel('messages');
      echo.leaveChannel('conversations');
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
