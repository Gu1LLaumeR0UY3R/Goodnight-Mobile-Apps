/**
 * src/services/apiClient.ts
 *
 * RÔLE :
 *   Client HTTP centralisé vers l'API PHP (serveur built-in, port 8080).
 *   Tous les autres services (biensService, favorisService, etc.) passent
 *   exclusivement par ce fichier pour communiquer avec le backend.
 *
 * FONCTIONNALITÉS :
 *   - Résolution automatique de l'IP du serveur :
 *       1. Variable d'env EXPO_PUBLIC_SERVER_HOST (prio max)
 *       2. localhost:8080 sur Web
 *       3. IP détectée depuis scriptURL d'Expo (même réseau que le téléphone)
 *       4. 10.0.2.2:8080 (fallback émulateur Android)
 *   - Injection automatique du token JWT en header Authorization
 *   - Timeout 10 s avec AbortController
 *   - Gestion des erreurs HTTP : 401 → supprime le token, 500 → message générique
 *   - Stockage du token : SecureStore (mobile) ou localStorage (web)
 *
 * EXPORTS :
 *   apiFetch(endpoint, method, body) → appel JSON standard
 *   apiUpload(endpoint, formData)    → appel multipart (upload de fichier)
 *   getImageUrl(path)                → résout un chemin relatif en URL complète
 *   saveToken(token)                 → sauvegarde le JWT après connexion
 */
// src/services/apiClient.ts
// Client HTTP centralisé vers l'API PHP built-in server (port 8080)

import * as SecureStore from 'expo-secure-store';
import { NativeModules, Platform } from 'react-native';

function resolveServerHost(): string {
  // Option manuelle prioritaire — ex: EXPO_PUBLIC_SERVER_HOST=http://192.168.1.30
  const configured = (process.env.EXPO_PUBLIC_SERVER_HOST ?? '').trim();
  if (configured) return configured.replace(/\/$/, '');

  if (Platform.OS === 'web') {
    // PHP built-in server sur le port 8080
    return 'http://localhost:8080';
  }

  // En dev Expo, scriptURL contient l'IP de la machine hôte.
  const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
  if (scriptURL) {
    try {
      const host = new URL(scriptURL).hostname;
      // PHP built-in server sur port 8080
      if (host) return `http://${host}:8080`;
    } catch {
      // fallback ci-dessous
    }
  }

  // Fallback Android émulateur → localhost de la machine hôte
  return 'http://10.0.2.2:8080';
}

const SERVER_HOST = resolveServerHost();
// PHP built-in server sert les routes directement sans préfixe /api
const BASE_URL = SERVER_HOST;

/** Résout un chemin de photo relatif ou absolu en URL complète. */
export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Sur web, les anciennes photos locales (/uploads/...) renvoient souvent 404,
  // ce qui déclenche des erreurs ORB dans la console.
  if (Platform.OS === 'web' && path.startsWith('/uploads/')) return null;
  return `${SERVER_HOST}/${path.replace(/^\//, '')}`;
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem('jwt_token');
  return SecureStore.getItemAsync('jwt_token');
}

async function deleteToken(): Promise<void> {
  if (Platform.OS === 'web') { localStorage.removeItem('jwt_token'); return; }
  await SecureStore.deleteItemAsync('jwt_token');
}

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.setItem('jwt_token', token); return; }
  await SecureStore.setItemAsync('jwt_token', token);
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiFetch<T>(
  endpoint: string,
  method: HttpMethod = 'GET',
  body?: object
): Promise<T> {
  const token = await getToken();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    clearTimeout(timeout);

    if (response.status === 401) {
      if (token) {
        // Un token existait mais a été rejeté → vraie expiration de session
        await deleteToken();
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      // Pas de token (ex: mauvais login) → on lit le message d'erreur du serveur
      const json: ApiResponse<T> = await response.json();
      throw new Error(json.error ?? 'Email ou mot de passe incorrect');
    }

    if (response.status >= 500) {
      throw new Error('Une erreur est survenue, réessayez plus tard');
    }

    const json: ApiResponse<T> = await response.json();

    if (!json.success) throw new Error(json.error ?? 'Erreur serveur');

    return json.data as T;
  } catch (error) {
    clearTimeout(timeout);
    if ((error as Error).name === 'AbortError') {
      throw new Error('La requête a pris trop de temps, réessayez');
    }
    if (
      (error as Error).message.includes('Network request failed') ||
      (error as Error).message.includes('Failed to fetch')
    ) {
      throw new Error('Vérifiez votre connexion internet');
    }
    throw error;
  }
}

export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    clearTimeout(timeout);

    if (response.status === 401) {
      if (token) {
        await deleteToken();
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      throw new Error('Accès non autorisé');
    }

    if (response.status >= 500) {
      throw new Error('Une erreur est survenue, réessayez plus tard');
    }

    const json: ApiResponse<T> = await response.json();
    if (!json.success) throw new Error(json.error ?? 'Erreur serveur');
    return json.data as T;
  } catch (error) {
    clearTimeout(timeout);
    if ((error as Error).name === 'AbortError') {
      throw new Error('L\'upload a pris trop de temps, réessayez');
    }
    if (
      (error as Error).message.includes('Network request failed') ||
      (error as Error).message.includes('Failed to fetch')
    ) {
      throw new Error('Vérifiez votre connexion internet');
    }
    throw error;
  }
}
