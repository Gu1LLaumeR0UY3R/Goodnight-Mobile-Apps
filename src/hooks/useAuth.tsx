// src/hooks/useAuth.tsx
// Issue #13 — Hook & contexte d'authentification global (React Native / Expo)

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { Locataire } from '../types/models';
import { authService } from '../services/authService';
import { apiFetch } from '../services/apiClient';

interface AuthContextType {
  user: Locataire | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    nom_locataire: string,
    prenom_locataire: string,
    email: string,
    tel_locataire: string | null,
    password: string
  ) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
}

function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<Locataire | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérification du token JWT stocké dans SecureStore au démarrage
  useEffect(() => {
    (async () => {
      const token = await authService.getStoredToken();
      if (token) {
        try {
          const me = await apiFetch<Locataire>('/auth/me');
          setUser(me);
        } catch {
          await authService.logout();
        }
      }
      setIsLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    const { user: u } = await authService.login(email, password);
    setUser(u);
  }

  async function register(
    nom_locataire: string,
    prenom_locataire: string,
    email: string,
    tel_locataire: string | null,
    password: string
  ) {
    const { user: u } = await authService.register(nom_locataire, prenom_locataire, email, tel_locataire, password);
    setUser(u);
  }

  async function loginWithGoogle(googleToken: string) {
    const { user: u } = await authService.loginWithGoogle(googleToken);
    setUser(u);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    loginWithGoogle,
    logout,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
