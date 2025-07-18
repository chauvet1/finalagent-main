import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (event: string, handler: (data: any) => void) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    setSocket(newSocket);

    newSocket.on(event, handler);

    return () => {
      newSocket.off(event, handler);
      newSocket.disconnect();
    };
  }, [event, handler]);

  return socket;
};
