import { createContext, useContext } from 'react';
import { User } from '../services/api';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);
