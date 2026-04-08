'use client';
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

let socket = null;

// Tạo một kết nối Socket.io duy nhất (singleton)
export const getSocket = () => {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[WS] Đã kết nối:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[WS] Mất kết nối');
    });

    socket.on('connect_error', (err) => {
      console.error('[WS] Lỗi kết nối:', err.message);
    });
  }
  return socket;
};

export const ngatKetNoi = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
