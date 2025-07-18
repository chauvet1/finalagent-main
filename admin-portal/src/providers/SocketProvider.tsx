import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAppSelector } from '../store';
import { isAuthenticationAvailable, getCurrentTokenInfo } from '../services/api';
type Socket = any;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isSignedIn } = useAppSelector((state) => state.clerkAuth);

  useEffect(() => {
    const initializeSocket = async () => {
      if (isSignedIn) {
        try {
          const authAvailable = await isAuthenticationAvailable();
          if (authAvailable) {
            const tokenInfo = await getCurrentTokenInfo();
            if (tokenInfo.isValid && tokenInfo.token) {
              // Initialize socket connection
              const socketUrl = process.env.REACT_APP_WS_URL || 'http://localhost:8000';
              const newSocket = io(socketUrl, {
                auth: {
                  token: tokenInfo.token,
                },
                transports: ['websocket'],
              });

              newSocket.on('connect', () => {
                console.log('Socket connected');
                setIsConnected(true);
              });

              newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
              });

              newSocket.on('connect_error', (error: any) => {
                console.error('Socket connection error:', error);
                setIsConnected(false);
              });

              setSocket(newSocket);
            }
          }
        } catch (error) {
          console.error('Failed to get authentication token:', error);
        }
      } else {
        // Clean up socket if not signed in
        if (socket) {
          socket.close();
          setSocket(null);
          setIsConnected(false);
        }
      }
    };

    initializeSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
