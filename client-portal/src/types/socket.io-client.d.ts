declare module 'socket.io-client' {
  import { Socket as ClientSocket } from 'socket.io-client';

  export const io: {
    (url: string, options?: any): ClientSocket;
  };

  export type Socket = ClientSocket;
}
