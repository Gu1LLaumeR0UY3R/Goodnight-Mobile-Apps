// src/services/authService.ts
// Service d'authentification (login, register, logout)
// Toutes les opérations de session passent ici pour garder le flux centralisé.
// Role: couche d'acces auth qui centralise session, JWT et cache utilisateur.

import { fetchApi, saveToken } from './apiClient';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Locataire } from '../types/models';
import type { RegisterAccountType } from '../types/auth';

interface AuthResponse {
  token: string;
  user: Locataire;
}

async function deleteToken(): Promise<void> {
  // Le token est supprimé localement dès qu'une déconnexion est demandée.
  if (Platform.OS === 'web') { localStorage.removeItem('jwt_token'); return; }
  await SecureStore.deleteItemAsync('jwt_token');
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem('jwt_token');
  return SecureStore.getItemAsync('jwt_token');
}

export async function saveUserCache(user: Locataire): Promise<void> {
  // Cache local utile au redémarrage si le réseau ne répond pas tout de suite.
  const json = JSON.stringify(user);
  if (Platform.OS === 'web') { localStorage.setItem('cached_user', json); return; }
  await SecureStore.setItemAsync('cached_user', json);
}

export async function getCachedUser(): Promise<Locataire | null> {
  // Lecture du cache local pour hydrater l'interface hors-ligne partielle.
  try {
    let json: string | null = null;
    if (Platform.OS === 'web') json = localStorage.getItem('cached_user');
    else json = await SecureStore.getItemAsync('cached_user');
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

async function deleteCachedUser(): Promise<void> {
  if (Platform.OS === 'web') { localStorage.removeItem('cached_user'); return; }
  await SecureStore.deleteItemAsync('cached_user');
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    // Login puis persistance immédiate du JWT et du profil utilisateur.
    const data = await fetchApi<AuthResponse>('/auth/login', 'POST', { email, password });
    await saveToken(data.token);
    await saveUserCache(data.user);
    return data;
  },

  async register(
    nom_locataire: string,
    prenom_locataire: string,
    email: string,
    tel_locataire: string | null,
    password: string,
    dateNaissance_locataire: string | null,
    type_compte: RegisterAccountType,
    is_entreprise: boolean,
    siret: string | null
  ): Promise<AuthResponse> {
    // Inscription avec le type de compte choisi, puis auto-connexion.
    const data = await fetchApi<AuthResponse>('/auth/register', 'POST', {
      nom: nom_locataire,
      prenom: prenom_locataire,
      email,
      telephone: tel_locataire,
      mot_de_passe: password,
      dateNaissance_locataire,
      type_compte,
      is_entreprise,
      Siret: siret,
    });
    await saveToken(data.token);
    await saveUserCache(data.user);
    return data;
  },

  async logout(): Promise<void> {
    // Nettoyage total des données de session côté client.
    await deleteToken();
    await deleteCachedUser();
  },

  async getStoredToken(): Promise<string | null> {
    return getToken();
  },
};
