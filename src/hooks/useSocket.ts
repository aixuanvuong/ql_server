// filepath: frontend/src/hooks/useSocket.ts
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getStoredServerUrl, getStoredToken } from '../api/auth.api';

/**
 * Hook quản lý kết nối Socket.io client
 * Tự động truyền token xác thực JWT và xử lý kết nối lại
 */
export function useSocket(token: string | null) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const serverUrl = getStoredServerUrl();
    const cleanUrl = serverUrl.replace(/\/+$/, '');

    // Khởi tạo Socket.io client kèm Token trong handshake auth
    const socketInstance = io(cleanUrl, {
      auth: {
        token: token || getStoredToken()
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 5000
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setSocketError(null);
    });

    socketInstance.on('connect_error', (err) => {
      setIsConnected(false);
      setSocketError(err.message || 'Lỗi kết nối WebSocket');
    });

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return {
    socket: socketRef.current,
    isConnected,
    socketError
  };
}
