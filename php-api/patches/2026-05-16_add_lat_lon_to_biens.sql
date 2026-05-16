-- php-api/patches/2026-05-16_add_lat_lon_to_biens.sql
-- Ajoute des coordonnées GPS propres à chaque bien.
-- Tant que latitude/longitude sont NULL, l'API utilise les coordonnées
-- de la commune (COALESCE) → pas de régression sur les marqueurs MapScreen.

ALTER TABLE biens
  ADD COLUMN latitude  DECIMAL(9,6) NULL AFTER id_locataire,
  ADD COLUMN longitude DECIMAL(9,6) NULL AFTER latitude;
