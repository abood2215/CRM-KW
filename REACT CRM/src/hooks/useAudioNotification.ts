import { useCallback, useEffect, useRef, useState } from 'react';

// مفتاح حفظ إعداد الصوت في localStorage
const STORAGE_KEY = 'crm_audio_notifications';

/**
 * ينشئ صوت إشعار باستخدام Web Audio API (بدون ملفات خارجية)
 * @param type 'message' | 'conversation' - نوع الإشعار
 */
function playNotificationSound(type: 'message' | 'conversation'): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    if (type === 'message') {
      // صوت رسالة جديدة: نغمة قصيرة ناعمة (Sine wave)
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);         // La5
      oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15); // Mi5

      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } else {
      // صوت محادثة جديدة: نغمتان صاعدتان (أقوى)
      const playTone = (freq: number, startTime: number, duration: number) => {
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

      // نغمتان: Do → Mi
      playTone(523, ctx.currentTime, 0.2);         // Do5
      playTone(659, ctx.currentTime + 0.22, 0.3);  // Mi5
    }
  } catch {
    // Web Audio API غير مدعوم في هذا المتصفح
  }
}

export interface AudioNotificationOptions {
  /** هل الإشعارات الصوتية مفعّلة */
  enabled: boolean;
  /** تفعيل/تعطيل الإشعارات */
  toggle: () => void;
  /** تشغيل صوت رسالة جديدة يدوياً */
  playMessage: () => void;
  /** تشغيل صوت محادثة جديدة يدوياً */
  playConversation: () => void;
}

/**
 * hook لإدارة الإشعارات الصوتية
 * يحفظ الإعداد في localStorage
 */
export function useAudioNotification(): AudioNotificationOptions {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  // نحتاج ref لقيمة enabled الحالية داخل callbacks
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
