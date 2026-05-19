import { useEffect, useState } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { useAuthStore } from '../store/useAuthStore';

//@ts-ignore
window.Pusher = Pusher;

export function useEcho() {
  const [echo, setEcho] = useState<Echo | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    const forceTLS = import.meta.env.VITE_PUSHER_TLS === 'true';
    const echoInstance = new Echo({
      broadcaster: 'pusher',
      key: import.meta.env.VITE_PUSHER_APP_KEY || 'app-key',
      cluster: 'mt1',
      wsHost: import.meta.env.VITE_PUSHER_HOST || 'localhost',
      wsPort: forceTLS ? 443 : (import.meta.env.VITE_PUSHER_PORT || 8080),
      wssPort: 443,
      forceTLS,
      disableStats: true,
      enabledTransports: forceTLS ? ['wss'] : ['ws'],
      authEndpoint: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    setEcho(echoInstance);

    return () => {
      echoInstance.disconnect();
    };
  }, [token]);

  return echo;
}
