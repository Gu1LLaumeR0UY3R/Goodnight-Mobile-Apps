// src/services/commentairesService.ts
// Issue #14 — Service des commentaires et avis

import { apiFetch } from './apiClient';
import type { Commentaire } from '../types/models';

interface CreateCommentaire {
  id_biens: number;
  note?: number;
  titre?: string;
  contenu: string;
}

export const commentairesService = {
  async getByBien(id_biens: number): Promise<Commentaire[]> {
    return apiFetch<Commentaire[]>(`/biens/${id_biens}/commentaires`);
  },

  async create(data: CreateCommentaire): Promise<Commentaire> {
    return apiFetch<Commentaire>('/commentaires', 'POST', data);
  },

  async likeCommentaire(id_commentaire: number): Promise<void> {
    return apiFetch<void>(`/commentaires/${id_commentaire}/like`, 'POST');
  },

  async signaler(id_commentaire: number): Promise<void> {
    return apiFetch<void>(`/commentaires/${id_commentaire}/signaler`, 'POST');
  },
};
