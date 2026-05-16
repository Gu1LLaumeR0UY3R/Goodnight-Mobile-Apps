-- Patch BDD : index de performance
-- Version du serveur : 10.4.32-MariaDB
-- À exécuter UNE SEULE FOIS sur la base de données goodnight
-- IF NOT EXISTS : sécurisé si des index ont déjà été créés par les contraintes FK InnoDB

-- tarifs(id_biens) — JOIN pour prix_semaine_min
-- (peut déjà exister via FK, IF NOT EXISTS évite l'erreur)
ALTER TABLE tarifs ADD INDEX IF NOT EXISTS idx_tarifs_id_biens (id_biens);

-- photos(id_biens, id_photo) — JOIN composite pour photo_principale
-- L'index FK sur id_biens seul ne couvre pas le MIN(id_photo), cet index est nouveau
ALTER TABLE photos ADD INDEX IF NOT EXISTS idx_photos_id_biens_id (id_biens, id_photo);

-- biens(statut_validation) — WHERE statut_validation = 'valide'
ALTER TABLE biens ADD INDEX IF NOT EXISTS idx_biens_statut (statut_validation);

-- biens(id_locataire) — WHERE id_locataire = ? (GET /biens/mine)
-- (peut déjà exister via FK)
ALTER TABLE biens ADD INDEX IF NOT EXISTS idx_biens_id_locataire (id_locataire);

-- commentaires(id_biens, statut) — LEFT JOIN ... AND statut = 'publie'
-- Index composite : couvre à la fois le JOIN et le filtre statut
ALTER TABLE commentaires ADD INDEX IF NOT EXISTS idx_commentaires_id_biens_statut (id_biens, statut);

-- reservations(id_biens, date_debut, date_fin) — filtre disponibilité
-- Index composite : couvre la condition de chevauchement de dates
ALTER TABLE reservations ADD INDEX IF NOT EXISTS idx_reservations_dates (id_biens, date_debut, date_fin);

-- blocages(id_biens, date_debut, date_fin) — détection conflits
ALTER TABLE blocages ADD INDEX IF NOT EXISTS idx_blocages_dates (id_biens, date_debut, date_fin);

-- commune(ville_nom) — filtre LIKE 'ville%' (table ~36 000 communes françaises)
ALTER TABLE commune ADD INDEX IF NOT EXISTS idx_commune_ville_nom (ville_nom(50));
