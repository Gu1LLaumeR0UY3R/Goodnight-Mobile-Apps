// src/services/biensService.ts
// Issue #14 — Service des biens immobiliers

import { apiFetch } from './apiClient';
import type { Bien } from '../types/models';

export interface BienFilters {
  type?: string;
  commune?: number[];
  date_debut?: string;
  date_fin?: string;
  prix_min?: number;
  prix_max?: number;
  nb_couchage?: number;
  animaux?: boolean;
  superficie?: number;
  note_min?: number;
  equipements?: number[];
  page?: number;
  limit?: number;
}

export const biensService = {
  async getAll(filters: BienFilters = {}): Promise<Bien[]> {
    const params = new URLSearchParams(
      Object.entries(filters)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );
    return apiFetch<Bien[]>(`/biens?${params.toString()}`);
  },

  async getById(id: number): Promise<Bien> {
    return apiFetch<Bien>(`/biens/${id}`);
  },
};
