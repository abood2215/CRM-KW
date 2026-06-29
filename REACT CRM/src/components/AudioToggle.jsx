import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudioNotification } from '../hooks/useAudioNotification';
import { cn } from '../utils/cn';

const AudioToggle = () => {
  const { enabled, toggle } = useAudioNotification();

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
