import { useEffect, useRef } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { useAuthStore } from '../store/useAuthStore';

window.Pusher = Pusher;

let echoInstance = null;
let echoToken = null;

function buildEcho(token) {
  const useTLS = import.meta.env.VITE_PUSHER_SCHEME === 'https';

  return new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY || 'app-key',
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
    wsHost: import.meta.env.VITE_PUSHER_HOST || 'localhost',
    wsPort: import.meta.env.VITE_PUSHER_PORT || 6001,
    wssPort: useTLS ? 443 : import.meta.env.VITE_PUSHER_PORT || 6001,
    forceTLS: useTLS,
    disableStats: true,
    enabledTransports: useTLS ? ['wss'] : ['ws'],
    authEndpoint: `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api').replace(/\/api\/?$/, '')}/broadcasting/auth`,
    auth: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// Module-level singleton (not React state) so every consumer shares one socket.
// Deliberately not torn down on component unmount — only on logout (token → null).
export function useEcho() {
  const token = useAuthStore((state) => state.token);
  const ref = useRef(null);

  useEffect(() => {
    if (!token) {
      echoInstance?.disconnect();
      echoInstance = null;
      echoToken = null;

      return;
    }

    if (!echoInstance || echoToken !== token) {
      echoInstance?.disconnect();
      echoInstance = buildEcho(token);
      echoToken = token;
    }

    ref.current = echoInstance;
  }, [token]);

  return echoInstance;
}
