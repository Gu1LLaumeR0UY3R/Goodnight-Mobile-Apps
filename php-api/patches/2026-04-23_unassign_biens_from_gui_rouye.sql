-- Patch BDD: reattribuer les biens de gui.rouye@gmail.com a d'autres proprietaires
-- Effet: aucun bien du compte cible ne reste avec ce proprietaire, repartition automatique
-- Compatible MySQL/MariaDB

START TRANSACTION;

SET @target_email = CONVERT('gui.rouye@gmail.com' USING utf8mb4) COLLATE utf8mb4_unicode_ci;
SET @owner_id = NULL;

SELECT l.id_locataire
INTO @owner_id
FROM locataire l
WHERE l.email_locataire COLLATE utf8mb4_unicode_ci = @target_email
LIMIT 1;

-- Verifie l'ID trouve (NULL si aucun compte correspondant)
SELECT @owner_id AS owner_id_found;

-- Candidats proprietaires: tous les autres locataires
DROP TEMPORARY TABLE IF EXISTS tmp_owner_pool;
CREATE TEMPORARY TABLE tmp_owner_pool (
  seq INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_locataire INT NOT NULL
);

INSERT INTO tmp_owner_pool (id_locataire)
SELECT l.id_locataire
FROM locataire l
WHERE @owner_id IS NOT NULL
  AND l.id_locataire <> @owner_id
ORDER BY l.id_locataire;

SELECT COUNT(*) INTO @owner_pool_count FROM tmp_owner_pool;
SELECT @owner_pool_count AS owner_pool_count;

-- Biens a redistribuer
DROP TEMPORARY TABLE IF EXISTS tmp_target_biens;
CREATE TEMPORARY TABLE tmp_target_biens (
  seq INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_biens INT NOT NULL
);

INSERT INTO tmp_target_biens (id_biens)
SELECT b.id_biens
FROM biens b
WHERE @owner_id IS NOT NULL
  AND b.id_locataire = @owner_id
ORDER BY b.id_biens;

SELECT COUNT(*) AS biens_before FROM tmp_target_biens;

-- Repartition en round-robin sur les proprietaires disponibles
UPDATE biens b
JOIN tmp_target_biens tb ON tb.id_biens = b.id_biens
JOIN tmp_owner_pool op ON op.seq = ((tb.seq - 1) % @owner_pool_count) + 1
SET b.id_locataire = op.id_locataire
WHERE @owner_id IS NOT NULL
  AND @owner_pool_count > 0;

-- Verification: doit etre 0
SELECT COUNT(*) AS biens_remaining_for_target
FROM biens
WHERE id_locataire = @owner_id;

-- Apercu de la nouvelle repartition
SELECT b.id_locataire, COUNT(*) AS nb_biens
FROM biens b
WHERE b.id_locataire IS NOT NULL
GROUP BY b.id_locataire
ORDER BY b.id_locataire;

COMMIT;
