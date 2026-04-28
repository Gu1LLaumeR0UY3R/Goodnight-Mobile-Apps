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
import { authService, getCachedUser, saveUserCache } from '../services/authService';
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
    password: string,
    dateNaissance_locataire: string | null,
    type_compte: 'locataire' | 'proprietaire',
    is_entreprise: boolean,
    siret: string | null
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

  // Vérification du token JWT stocké au démarrage
  useEffect(() => {
    (async () => {
      const token = await authService.getStoredToken();
      if (token) {
        try {
          const me = await apiFetch<Locataire>('/auth/me');
          setUser(me);
          await saveUserCache(me); // Rafraîchit le cache local
        } catch (err: any) {
          const msg: string = err?.message ?? '';
          if (
            msg.includes('Session expirée') ||
            msg.includes('401') ||
            msg.includes('invalide')
          ) {
            // Vrai problème d'auth → on déconnecte
            await authService.logout();
          } else {
            // Erreur réseau ou serveur temporairement down
            // → on garde le token et on utilise le cache local
            const cached = await getCachedUser();
            setUser(cached);
          }
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
    password: string,
    dateNaissance_locataire: string | null,
    type_compte: 'locataire' | 'proprietaire',
    is_entreprise: boolean,
    siret: string | null
  ) {
    const { user: u } = await authService.register(
      nom_locataire,
      prenom_locataire,
      email,
      tel_locataire,
      password,
      dateNaissance_locataire,
      type_compte,
      is_entreprise,
      siret
    );
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
