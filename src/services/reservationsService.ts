// src/services/reservationsService.ts
// Issue #14 / #16 — Service des réservations

import { apiFetch } from './apiClient';
import type { Reservation } from '../types/models';
import type { DisponibilitePlage, TarifCalcule, ReservationCreated, ReservationPayload } from '../types/reservation';

export const reservationsService = {
  async getAll(): Promise<Reservation[]> {
    return apiFetch<Reservation[]>('/reservations');
  },

  async getById(id: number): Promise<Reservation> {
    return apiFetch<Reservation>(`/reservations/${id}`);
  },

  async create(data: ReservationPayload): Promise<ReservationCreated> {
    return apiFetch<ReservationCreated>('/reservations', 'POST', data);
  },

  async cancel(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/reservations/${id}`, 'DELETE');
  },

  async updateStatut(id: number, statut: 'confirmee' | 'refusee'): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/reservations/${id}`, 'PATCH', { statut });
  },

  async getDisponibilites(id_biens: number): Promise<DisponibilitePlage[]> {
    return apiFetch<DisponibilitePlage[]>(`/biens/${id_biens}/disponibilites`);
  },

  async getTarif(id_biens: number, debut: string, fin: string): Promise<TarifCalcule> {
    return apiFetch<TarifCalcule>(`/biens/${id_biens}/tarif?debut=${debut}&fin=${fin}`);
  },
};
