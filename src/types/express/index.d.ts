import { User } from '../UserPayload';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}