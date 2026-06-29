import React, { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useEcho } from '../hooks/useEcho';
import { useAudioNotification } from '../hooks/useAudioNotification';
import { cn } from '../utils/cn';

const AudioToggle = () => {
  const { enabled, toggle, playMessage, playConversation } = useAudioNotification();
  const echo = useEcho();

  useEffect(() => {
    if (!echo) return;

    const channel = echo.channel('conversations');

    channel.listen('.NewMessageEvent', (e) => {
      if (e.direction === 'in') {
        playMessage();
      }
    });

    channel.listen('.ConversationUpdatedEvent', (e) => {
      if (e.unread_count === 1) {
        playConversation();
      }
    });

    return () => {
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

      <span className={cn(
        'absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full',
        enabled ? 'bg-emerald-500' : 'bg-slate-300'
      )} />
    </button>
  );
};

export default AudioToggle;
