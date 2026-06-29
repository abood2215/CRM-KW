import { useEffect, useState } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { useAuthStore } from '../store/useAuthStore';

window.Pusher = Pusher;

// Singleton — shared across all components to avoid multiple WebSocket connections
let _echoInstance = null;
let _echoToken    = null;

function createEcho(token) {
  const forceTLS = import.meta.env.VITE_PUSHER_TLS === 'true';
  return new Echo({
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
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}

export function useEcho() {
  const token = useAuthStore((state) => state.token);
  const [echo, setEcho] = useState(() =>
    token && _echoToken === token ? _echoInstance : null
  );

  useEffect(() => {
    if (!token) {
      if (_echoInstance) {
        _echoInstance.disconnect();
        _echoInstance = null;
        _echoToken    = null;
      }
      setEcho(null);
      return;
    }

    // Reuse existing instance for the same token
    if (_echoInstance && _echoToken === token) {
      setEcho(_echoInstance);
      return;
    }

    // Token changed — disconnect old and create new
    if (_echoInstance) {
      _echoInstance.disconnect();
    }

    _echoInstance = createEcho(token);
    _echoToken    = token;
    setEcho(_echoInstance);

    // Don't disconnect on component unmount — only disconnect on logout (token → null)
  }, [token]);

  return echo;
}
