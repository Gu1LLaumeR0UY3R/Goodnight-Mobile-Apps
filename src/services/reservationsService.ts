// src/services/reservationsService.ts
// Issue #14 — Service des réservations

import { apiFetch } from './apiClient';
import type { Reservation } from '../types/models';

interface CreateReservation {
  id_biens: number;
  date_debut: string;
  date_fin: string;
  montant_total: number;
}

export const reservationsService = {
  async getAll(): Promise<Reservation[]> {
    return apiFetch<Reservation[]>('/reservations');
  },

  async getById(id: number): Promise<Reservation> {
    return apiFetch<Reservation>(`/reservations/${id}`);
  },

  async create(data: CreateReservation): Promise<Reservation> {
    return apiFetch<Reservation>('/reservations', 'POST', data);
  },

  async getDisponibilites(id_biens: number): Promise<string[]> {
    return apiFetch<string[]>(`/biens/${id_biens}/disponibilites`);
  },
};
