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
    // pusher-js only registers a transport named 'ws' — it upgrades to a secure socket on its
    // own based on forceTLS. 'wss' isn't a real transport name, so passing it here left zero
    // usable transports and pusher-js gave up immediately (connection.state === 'failed') without
    // ever opening a socket.
    enabledTransports: ['ws'],
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

/**
 * Real-time "online now" via a presence channel — unlike users.is_online (driven by
 * last_seen_at, a per-request timestamp only refreshed by middleware), this reflects who's
 * actually connected right now, updating within seconds of someone opening/closing the app.
 * Echo dedupes repeated .join() calls to the same channel name, so multiple components
 * calling this hook share one underlying subscription, not one each.
 *
 * @returns {Set<number>} ids of currently-online users
 */
export function useOnlinePresence() {
  const echo = useEcho();
  const [onlineIds, setOnlineIds] = useState(() => new Set());

  useEffect(() => {
    if (!echo) {
      setOnlineIds(new Set());

      return undefined;
    }

    // Joined but deliberately never left on unmount — same reasoning as useEcho() itself:
    // multiple components (Users tab, agent stats, ...) can call this hook independently,
    // and one of them unmounting must not tear down presence tracking for the others still
    // showing it. The channel only actually goes away when the socket itself disconnects
    // (logout), same lifecycle as the rest of the shared connection.
    echo.join('presence.online')
      .here((users) => setOnlineIds(new Set(users.map((u) => u.id))))
      .joining((user) => setOnlineIds((prev) => new Set(prev).add(user.id)))
      .leaving((user) => setOnlineIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);

        return next;
      }));
  }, [echo]);

  return onlineIds;
}
