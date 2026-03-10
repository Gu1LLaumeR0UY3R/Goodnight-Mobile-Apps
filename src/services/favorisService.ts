// src/services/favorisService.ts
// Issue #14 — Service de gestion des favoris

import { apiFetch } from './apiClient';
import type { Favori, Bien } from '../types/models';

export const favorisService = {
  async getAll(): Promise<Bien[]> {
    return apiFetch<Bien[]>('/favoris');
  },

  async add(id_biens: number): Promise<Favori> {
    return apiFetch<Favori>('/favoris', 'POST', { id_biens });
  },

  async remove(id_biens: number): Promise<void> {
    return apiFetch<void>(`/favoris/${id_biens}`, 'DELETE');
  },

  async isFavori(id_biens: number): Promise<boolean> {
    const favoris = await apiFetch<Favori[]>('/favoris');
    return favoris.some((f) => f.id_biens === id_biens);
  },
};
