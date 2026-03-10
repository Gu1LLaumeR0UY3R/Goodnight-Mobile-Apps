// src/services/apiClient.ts
// Issue #10 — Client HTTP centralisé vers l'API PHP / BDD MySQL "goodnight"

import * as SecureStore from 'expo-secure-store';

// IP de votre machine sur le réseau local — serveur Node.js port 3000
// Sur émulateur Android : http://10.0.2.2:3000/api
const BASE_URL = 'http://10.33.192.66:3000/api';

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
  const token = await SecureStore.getItemAsync('jwt_token');

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
        await SecureStore.deleteItemAsync('jwt_token');
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
