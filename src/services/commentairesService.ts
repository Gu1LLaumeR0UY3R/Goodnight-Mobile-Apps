// src/services/commentairesService.ts
// Issue #14 — Service des commentaires et avis
// Role: appels API lies aux avis publies et a leur creation.

import { fetchApi } from './apiClient';
import type { Commentaire } from '../types/models';

interface CreateCommentaire {
  id_biens: number;
  note?: number;
  titre?: string;
  contenu: string;
}

export const commentairesService = {
  async getByBien(id_biens: number): Promise<Commentaire[]> {
    return fetchApi<Commentaire[]>(`/commentaires/${id_biens}`);
  },

  async create(data: CreateCommentaire): Promise<Commentaire> {
    return fetchApi<Commentaire>('/commentaires', 'POST', data);
  },

  async likeCommentaire(id_commentaire: number): Promise<void> {
    return fetchApi<void>(`/commentaires/${id_commentaire}/like`, 'POST');
  },

  async signaler(id_commentaire: number): Promise<void> {
    return fetchApi<void>(`/commentaires/${id_commentaire}/signaler`, 'POST');
  },
};
