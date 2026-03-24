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

    const echoInstance = new Echo({
      broadcaster: 'pusher',
      key: import.meta.env.VITE_PUSHER_APP_KEY || 'app-key',
      cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
      wsHost: import.meta.env.VITE_PUSHER_HOST || 'localhost',
      wsPort: import.meta.env.VITE_PUSHER_PORT || 6001,
      forceTLS: false,
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
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
