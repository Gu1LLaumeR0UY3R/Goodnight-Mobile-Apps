-- Patch BDD: ajouter motif_refus TEXT NULL à la table biens
-- Compatible MySQL/MariaDB
-- À exécuter UNE SEULE FOIS sur la base de données goodnight

ALTER TABLE biens
  ADD COLUMN motif_refus TEXT NULL DEFAULT NULL COMMENT 'Motif de refus de validation (rempli si statut_validation = refuse)';
