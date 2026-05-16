-- 2026-05-16 : ajout de la colonne statut aux réservations
-- Permet au propriétaire de confirmer ou refuser une réservation
-- L'API gère déjà l'absence de cette colonne (hasStatutColumn check).
-- Appliquer avec : mysql -u root goodnight < php-api/patches/2026-05-16_add_statut_to_reservations.sql

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS statut ENUM('en_attente','confirmee','refusee','annulee')
    NOT NULL DEFAULT 'en_attente'
    AFTER id_tarif;
