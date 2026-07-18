// Short two-tone chime via the Web Audio API — no audio asset to ship/host.
export const playNewMessageChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Autoplay can be blocked before the user has interacted with the page at all — silent no-op.
  }
};

export const showDesktopNotification = (title, body) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg' });
    return;
  }

  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.svg' });
      }
    });
  }
};
