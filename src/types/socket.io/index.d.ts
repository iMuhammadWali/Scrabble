import { User } from '../UserPayload';

declare module 'socket.io' {
    interface Socket {
      user?: User;
    }
  }