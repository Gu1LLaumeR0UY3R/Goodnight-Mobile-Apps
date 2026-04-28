// src/types/reservation.ts
// Issue #16 — Types pour la réservation

export interface DisponibilitePlage {
  date_debut: string;   // YYYY-MM-DD
  date_fin:   string;   // YYYY-MM-DD
  type:       'blocage' | 'reservation';
}

export interface TarifCalcule {
  id_tarif:     number;
  prix_semaine: number;
  nb_nuits:     number;
  semaines:     number;
  nuits_extra:  number;
  prix_nuit:    number;
  total:        number;
}

export interface ReservationPayload {
  date_debut: string;  // ISO 8601 YYYY-MM-DD
  date_fin:   string;
  id_biens:   number;
  id_tarif:   number;
}

export interface ReservationCreated extends ReservationPayload {
  id_reservation: number;
  id_locataire:   number;
}
