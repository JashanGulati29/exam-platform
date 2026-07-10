import { io } from 'socket.io-client';

// In development Vite proxies /socket.io → localhost:5000 so an empty string
// (same-origin) works. Override via VITE_SOCKET_URL for production.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket = null;

// Lazily creates a single shared socket connection authenticated with the
// current access token. Reused by any component that needs real-time
// proctoring updates (see pages/LiveProctoring.jsx).
export function getSocket() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    auth: { token: localStorage.getItem('accessToken') },
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
