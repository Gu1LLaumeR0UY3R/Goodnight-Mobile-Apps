-- Patch BDD: ajouter id_photo INT AUTO_INCREMENT PRIMARY KEY à la table photos
-- Compatible MySQL/MariaDB
-- À exécuter UNE SEULE FOIS sur la base de données goodnight

ALTER TABLE photos
  ADD COLUMN id_photo INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;
