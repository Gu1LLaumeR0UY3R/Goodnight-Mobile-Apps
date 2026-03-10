// src/services/authService.ts
// Issue #12 — Service d'authentification (login, register, logout) avec expo-secure-store

import * as SecureStore from 'expo-secure-store';
import { apiFetch } from './apiClient';
import type { Locataire } from '../types/models';

interface AuthResponse {
  token: string;
  user: Locataire;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>('/auth/login', 'POST', { email, password });
    await SecureStore.setItemAsync('jwt_token', data.token);
    return data;
  },

  async register(
    nom_locataire: string,
    prenom_locataire: string,
    email: string,
    tel_locataire: string | null,
    password: string
  ): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>('/auth/register', 'POST', {
      nom: nom_locataire,
      prenom: prenom_locataire,
      email,
      telephone: tel_locataire,
      mot_de_passe: password,
    });
    await SecureStore.setItemAsync('jwt_token', data.token);
    return data;
  },

  async loginWithGoogle(googleToken: string): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>('/auth/google', 'POST', { token: googleToken });
    await SecureStore.setItemAsync('jwt_token', data.token);
    return data;
  },

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('jwt_token');
  },

  async getStoredToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('jwt_token');
  },
};
