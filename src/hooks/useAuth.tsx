// src/hooks/useAuth.tsx
// Issue #13 — Hook & contexte d'authentification global (React Native / Expo)
// Ce fichier joue le rôle de contrôleur d'état d'auth côté front: session,
// rôle courant, connexion, inscription, déconnexion et restauration au démarrage.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { Locataire } from '../types/models';
import { authService, getCachedUser, saveUserCache } from '../services/authService';
import { fetchApi, refreshJwtIfNeeded } from '../services/apiClient';
import type { AppRole, AuthenticatedRole, RegisterAccountType } from '../types/auth';

type AuthContextActions = {
  isLoading: boolean;
  updateUser: (u: Locataire) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    nom_locataire: string,
    prenom_locataire: string,
    email: string,
    tel_locataire: string | null,
    password: string,
    dateNaissance_locataire: string | null,
    type_compte: RegisterAccountType,
    is_entreprise: boolean,
    siret: string | null
  ) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: AppRole | AppRole[]) => boolean;
};

type AuthContextType = AuthContextActions & (
  | {
      user: null;
      role: 'visiteur';
      isAuthenticated: false;
    }
  | {
      user: Locataire;
      role: AuthenticatedRole;
      isAuthenticated: true;
    }
);

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
}

function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<Locataire | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function resolveRole(u: Locataire | null): AppRole {
    if (!u) return 'visiteur';
    if (u.type_compte === 'admin') return 'admin';
    if (u.type_compte === 'proprietaire') return 'proprietaire';
    return 'locataire';
  }

  function hasRole(roles: AppRole | AppRole[]): boolean {
    const currentRole = resolveRole(user);
    const accepted = Array.isArray(roles) ? roles : [roles];
    return accepted.includes(currentRole);
  }

  // Vérification du token JWT stocké au démarrage
  useEffect(() => {
    (async () => {
      const token = await authService.getStoredToken();
      if (token) {
        try {
          const me = await fetchApi<Locataire>('/auth/me');
          setUser(me);
          await saveUserCache(me); // Rafraîchit le cache local
          refreshJwtIfNeeded().catch(() => {}); // Renouvellement silencieux si token proche de l'expiration
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : '';
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
    type_compte: RegisterAccountType,
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

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  function updateUser(u: Locataire) {
    setUser(u);
  }

  const base: AuthContextActions = {
    isLoading,
    updateUser,
    login,
    register,
    logout,
    hasRole,
  };

  const role = resolveRole(user);
  if (!user) {
    return {
      ...base,
      user: null,
      role: 'visiteur',
      isAuthenticated: false,
    };
  }

  return {
    ...base,
    user,
    role,
    isAuthenticated: true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
