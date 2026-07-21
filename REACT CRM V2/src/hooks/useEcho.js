import { useEffect, useState } from 'react';
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
    authEndpoint: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api'}/broadcasting/auth`,
    auth: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// Module-level singleton (not React state) so every consumer shares one socket.
// Deliberately not torn down on component unmount — only on logout (token → null).
export function useEcho() {
  const token = useAuthStore((state) => state.token);
  const [echo, setEcho] = useState(() => echoInstance);

  useEffect(() => {
    if (!token) {
      echoInstance?.disconnect();
      echoInstance = null;
      echoToken = null;
      setEcho(null);

      return;
    }

    if (!echoInstance || echoToken !== token) {
      echoInstance?.disconnect();
      echoInstance = buildEcho(token);
      echoToken = token;
    }

    // Creating the singleton inside an effect used to leave the first render with
    // `null` and no state update. Consumers then subscribed only after an unrelated
    // re-render, which made real-time updates feel intermittent.
    setEcho(echoInstance);
  }, [token]);

  return echo;
}

/** Pusher/Reverb connection states, collapsed to what the UI actually needs to show. */
function mapConnectionState(state) {
  if (state === 'connected') return 'connected';
  if (state === 'connecting' || state === 'initialized') return 'connecting';

  return 'disconnected'; // unavailable, failed, disconnected
}

/** Surfaces the shared socket's live connection state so the UI can show "live" vs
 * "reconnecting" instead of silently going stale whenever Reverb drops. */
export function useEchoConnectionStatus() {
  const echo = useEcho();
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    if (!echo) {
      setStatus('disconnected');

      return undefined;
    }

    const connection = echo.connector.pusher.connection;
    setStatus(mapConnectionState(connection.state));

    const onStateChange = ({ current }) => setStatus(mapConnectionState(current));
    connection.bind('state_change', onStateChange);

    return () => connection.unbind('state_change', onStateChange);
  }, [echo]);

  return status;
}
