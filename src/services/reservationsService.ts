// src/services/reservationsService.ts
// Issue #14 / #16 — Service des réservations
// Centralise les lectures et mutations liées aux réservations pour éviter la logique HTTP dans les écrans.

import { fetchApi } from './apiClient';
import type { Reservation } from '../types/models';
import type { DisponibilitePlage, TarifCalcule, ReservationCreated, ReservationPayload } from '../types/reservation';

export const reservationsService = {
  async getAll(): Promise<Reservation[]> {
    // Historique personnel des réservations du locataire connecté.
    return fetchApi<Reservation[]>('/reservations');
  },

  async getById(id: number): Promise<Reservation> {
    return fetchApi<Reservation>(`/reservations/${id}`);
  },

  async create(data: ReservationPayload): Promise<ReservationCreated> {
    // Création d'une réservation validée par le backend.
    return fetchApi<ReservationCreated>('/reservations', 'POST', data);
  },

  async cancel(id: number): Promise<{ message: string }> {
    // Annulation contrôlée par le serveur avec vérification de permission.
    return fetchApi<{ message: string }>(`/reservations/${id}`, 'DELETE');
  },

  async updateStatut(id: number, statut: 'confirmee' | 'refusee'): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/reservations/${id}`, 'PATCH', { statut });
  },

  async getDisponibilites(id_biens: number): Promise<DisponibilitePlage[]> {
    // Indisponibilités pour alimenter le calendrier de réservation.
    return fetchApi<DisponibilitePlage[]>(`/biens/${id_biens}/disponibilites`);
  },

  async getTarif(id_biens: number, debut: string, fin: string): Promise<TarifCalcule> {
    // Calcul serveur du prix total sur la plage sélectionnée.
    return fetchApi<TarifCalcule>(`/biens/${id_biens}/tarif?debut=${debut}&fin=${fin}`);
  },
};
