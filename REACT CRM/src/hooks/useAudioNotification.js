import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'crm_audio_notifications';

function playNotificationSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    if (type === 'message') {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } else {
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playTone(523, ctx.currentTime, 0.2);
      playTone(659, ctx.currentTime + 0.22, 0.3);
    }
  } catch {
    // Web Audio API غير مدعوم
  }
}

export function useAudioNotification() {
  const [enabled, setEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const playMessage = useCallback(() => {
    if (enabledRef.current) {
      playNotificationSound('message');
    }
  }, []);

  const playConversation = useCallback(() => {
    if (enabledRef.current) {
      playNotificationSound('conversation');
    }
  }, []);

  return { enabled, toggle, playMessage, playConversation };
}
