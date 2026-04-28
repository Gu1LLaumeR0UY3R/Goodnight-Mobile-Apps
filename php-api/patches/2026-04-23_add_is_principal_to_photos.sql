-- Patch BDD: ajouter is_principal BOOLEAN à la table photos
-- Compatible MySQL/MariaDB
-- À exécuter UNE SEULE FOIS sur la base de données goodnight

ALTER TABLE photos
  ADD COLUMN is_principal BOOLEAN NOT NULL DEFAULT 0;
