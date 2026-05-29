// src/services/favorisService.ts
// Issue #14 — Service de gestion des favoris
// Role: couche d'acces aux favoris pour lister, ajouter et retirer des biens.

import { fetchApi } from './apiClient';
import type { Favori, Bien } from '../types/models';

export const favorisService = {
  async getAll(): Promise<Bien[]> {
    return fetchApi<Bien[]>('/favoris');
  },

  async add(id_biens: number): Promise<Favori> {
    return fetchApi<Favori>('/favoris', 'POST', { id_biens });
  },

  async remove(id_biens: number): Promise<void> {
    return fetchApi<void>(`/favoris/${id_biens}`, 'DELETE');
  },

  async isFavori(id_biens: number): Promise<boolean> {
    const favoris = await fetchApi<Favori[]>('/favoris');
    return favoris.some((f) => f.id_biens === id_biens);
  },
};
