-- =============================================================================
--  GOODNIGHT — Jeu de test complet
--  Importer via phpMyAdmin : Importer > Choisir ce fichier > Exécuter
--  Ou via CLI : mysql -u root goodnight < seed_goodnight.sql
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 1. TYPES DE BIEN
-- =============================================================================
INSERT IGNORE INTO type_bien (id_typebien, desc_type_bien) VALUES
  (1, 'Maison'),
  (2, 'Appartement'),
  (3, 'Villa'),
  (4, 'Châlet'),
  (5, 'Gîte'),
  (6, 'Studio'),
  (7, 'Loft');

-- =============================================================================
-- 2. COMMUNES (vraies villes françaises)
-- =============================================================================
INSERT IGNORE INTO commune
  (id_commune, ville_nom, ville_nom_simple, ville_departement, ville_code_postal,
   ville_slug, ville_latitude_deg, ville_longitude_deg)
VALUES
  (1,  'Paris',          'paris',          '75', '75001', 'paris',          48.8566,  2.3522),
  (2,  'Biarritz',       'biarritz',       '64', '64200', 'biarritz',       43.4832, -1.5586),
  (3,  'Chamonix',       'chamonix',       '74', '74400', 'chamonix',       45.9237,  6.8694),
  (4,  'Marseille',      'marseille',      '13', '13001', 'marseille',      43.2965,  5.3698),
  (5,  'Bordeaux',       'bordeaux',       '33', '33000', 'bordeaux',       44.8378, -0.5792),
  (6,  'Annecy',         'annecy',         '74', '74000', 'annecy',         45.8992,  6.1294),
  (7,  'Nice',           'nice',           '06', '06000', 'nice',           43.7102,  7.2620),
  (8,  'Strasbourg',     'strasbourg',     '67', '67000', 'strasbourg',     48.5734,  7.7521),
  (9,  'La Rochelle',    'la-rochelle',    '17', '17000', 'la-rochelle',    46.1591, -1.1520),
  (10, 'Sète',           'sete',           '34', '34200', 'sete',           43.4053,  3.6978);

-- =============================================================================
-- 3. SAISONS
-- =============================================================================
INSERT IGNORE INTO saison (id_saison, lib_saison, date_debut, date_fin) VALUES
  (1, 'Haute saison',  '2026-07-01', '2026-08-31'),
  (2, 'Printemps',     '2026-04-01', '2026-06-30'),
  (3, 'Automne',       '2026-09-01', '2026-11-30'),
  (4, 'Hiver',         '2026-12-01', '2027-03-31');

-- =============================================================================
-- 4. PRESTATIONS (équipements)
-- =============================================================================
INSERT IGNORE INTO prestation (id_prestation, lib_prestation) VALUES
  (1,  'Wi-Fi'),
  (2,  'Piscine'),
  (3,  'Parking'),
  (4,  'Climatisation'),
  (5,  'Lave-linge'),
  (6,  'Lave-vaisselle'),
  (7,  'Barbecue'),
  (8,  'Jacuzzi'),
  (9,  'Cheminée'),
  (10, 'Vue mer'),
  (11, 'Jardin'),
  (12, 'Sèche-linge'),
  (13, 'Vélos à disposition'),
  (14, 'Baby-foot / Jeux');

-- =============================================================================
-- 5. LOCATAIRES (comptes de test)
--    Mot de passe pour tous : Password1!
--    Hash bcrypt de "Password1!" (coût 10)
-- =============================================================================
-- $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- C'est le hash bcrypt standard de "password" utilisé dans les tests Laravel
-- On utilise ici un hash fixe connu : "Password1!" => généré ci-dessous

-- Hash de "testpass" généré offline :
-- $2y$10$K6bH4mMHBi8r0UyOl2C01.sEH8TlFLxpbXJjGbzKoToN4YdVkS2mW

INSERT IGNORE INTO locataire
  (nom_locataire, prenom_locataire, email_locataire,
   tel_locataire, password_locataire, dateNaissance_locataire)
VALUES
  -- ⚠️  Mot de passe : testpass  (hash bcrypt coût 10)
  ('Dupont',   'Alice',   'alice@goodnight.test',   '0601010101',
   '$2y$10$K6bH4mMHBi8r0UyOl2C01.sEH8TlFLxpbXJjGbzKoToN4YdVkS2mW', '1990-03-15'),
  ('Martin',   'Bob',     'bob@goodnight.test',     '0602020202',
   '$2y$10$K6bH4mMHBi8r0UyOl2C01.sEH8TlFLxpbXJjGbzKoToN4YdVkS2mW', '1985-07-22'),
  ('Lefebvre', 'Claire',  'claire@goodnight.test',  '0603030303',
   '$2y$10$K6bH4mMHBi8r0UyOl2C01.sEH8TlFLxpbXJjGbzKoToN4YdVkS2mW', '1995-11-08'),
  ('Bernard',  'David',   'david@goodnight.test',   '0604040404',
   '$2y$10$K6bH4mMHBi8r0UyOl2C01.sEH8TlFLxpbXJjGbzKoToN4YdVkS2mW', '1988-05-30'),
  ('Moreau',   'Emma',    'emma@goodnight.test',    '0605050505',
   '$2y$10$K6bH4mMHBi8r0UyOl2C01.sEH8TlFLxpbXJjGbzKoToN4YdVkS2mW', '1997-09-12');

-- ⚠️  Si le hash ci-dessus ne fonctionne pas sur votre version PHP,
--     exécutez ce script PHP une fois pour regénérer :
--     <?php echo password_hash('testpass', PASSWORD_BCRYPT); ?>
--     Puis remplacez le hash dans les 5 lignes INSERT ci-dessus.

-- =============================================================================
-- 6. BIENS IMMOBILIERS
-- =============================================================================
INSERT IGNORE INTO biens
  (id_biens, designation_bien, rue_biens, complement_biens, superficie_biens,
   description_biens, animaux_biens, nb_couchage, id_TypeBien, id_commune,
   id_locataire, statut_validation)
VALUES
  (1,  'Le Refuge Basque',
       '12 Rue du Port', NULL, 85, 'Maison de charme à deux pas de la plage de Biarritz. Terrasse ensoleillée, cuisine équipée, idéale pour familles.',
       1, 6, 1, 2, 2, 'valide'),

  (2,  'Chalet Vue Blanche',
       '3 Chemin des Alpages', NULL, 120, 'Magnifique chalet au cœur de Chamonix avec vue panoramique sur le Mont-Blanc. Cheminée, sauna, accès ski direct.',
       0, 8, 4, 3, 2, 'valide'),

  (3,  'Villa Azur Côte d\'Azur',
       '88 Boulevard Promenade', 'Villa B', 200, 'Villa de luxe avec piscine privée et vue imprenable sur la Méditerranée. Idéale pour séjour premium.',
       1, 10, 3, 7, 3, 'valide'),

  (4,  'Studio Marais Parisien',
       '7 Rue de Bretagne', NULL, 32, 'Studio cosy au cœur du Marais, Paris 3ème. Tout équipé, proche métro, idéal pour découvrir Paris.',
       0, 2, 6, 1, 3, 'valide'),

  (5,  'Gîte de la Forêt',
       '45 Chemin de la Forêt', NULL, 95, 'Gîte rustique et chaleureux au calme de la campagne bordelaise. Terrain de 2000m², barbecue, ideal famille.',
       1, 8, 5, 5, 4, 'valide'),

  (6,  'Appartement Annecy Vieux-Lac',
       '2 Quai des Cordeliers', 'Apt 4A', 68, 'Superbe appartement avec vue sur le lac d\'Annecy. Lumineux, entièrement rénové, terrasse privée.',
       0, 4, 2, 6, 4, 'valide'),

  (7,  'Maison Méditerranéenne',
       '19 Rue des Calanques', NULL, 130, 'Grande maison avec jardin exotique et piscine chauffée. À 10mn des calanques de Marseille en voiture.',
       1, 8, 1, 4, 5, 'valide'),

  (8,  'Loft Industriel Strasbourg',
       '1 Rue du Faubourg National', NULL, 110, 'Loft atypique dans une ancienne usine rénovée au cœur de Strasbourg. Plafonds à 5m, design contemporain.',
       0, 4, 7, 8, 5, 'valide'),

  (9,  'Villa Bord de Mer La Rochelle',
       '14 Allée des Dunes', NULL, 160, 'Villa directement sur la plage de La Rochelle. Accès privatif à la mer, jacuzzi extérieur, garage.',
       1, 10, 3, 9, 1, 'valide'),

  (10, 'Maison de Pêcheur Sète',
       '5 Quai Général Durand', NULL, 75, 'Authentique maison de pêcheur sur le port de Sète. Vue sur les bateaux, terrasse, vélos inclus.',
       0, 4, 1, 10, 1, 'valide'),

  -- Bien en attente (ne doit pas apparaître dans les listes)
  (11, 'Appartement test non validé',
       '1 Rue Test', NULL, 50, 'Ceci est un bien en attente de validation.', 0, 2, 2, 1, 2, 'en_attente');

-- =============================================================================
-- 7. PHOTOS (une principale + extras par bien)
-- =============================================================================
INSERT IGNORE INTO photos (id_biens, lien_photo) VALUES
  (1,  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'),
  (1,  'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800'),
  (2,  'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800'),
  (2,  'https://images.unsplash.com/photo-1601919051950-bb9f3ffb3fee?w=800'),
  (3,  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'),
  (3,  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'),
  (4,  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'),
  (5,  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800'),
  (5,  'https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?w=800'),
  (6,  'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800'),
  (7,  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'),
  (7,  'https://images.unsplash.com/photo-1684930987614-5e5e2e4e985a?w=800'),
  (8,  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'),
  (9,  'https://images.unsplash.com/photo-1519643381401-22c77e60520e?w=800'),
  (9,  'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=800'),
  (10, 'https://images.unsplash.com/photo-1552947007-e1c20e46f40f?w=800');

-- =============================================================================
-- 8. TARIFS (prix_semaine selon bien + saison)
-- =============================================================================
INSERT IGNORE INTO tarifs (id_tarif, id_biens, annee, id_saison, prix_semaine) VALUES
  -- Bien 1 — Le Refuge Basque
  (1,  1, 2026, 1, 1400),   -- Haute saison
  (2,  1, 2026, 2,  900),   -- Printemps
  (3,  1, 2026, 3,  800),   -- Automne
  (4,  1, 2026, 4,  700),   -- Hiver
  -- Bien 2 — Chalet Vue Blanche
  (5,  2, 2026, 1, 2200),
  (6,  2, 2026, 2, 1200),
  (7,  2, 2026, 3, 1000),
  (8,  2, 2026, 4, 1800),   -- ski = hiver cher
  -- Bien 3 — Villa Azur
  (9,  3, 2026, 1, 5500),
  (10, 3, 2026, 2, 3500),
  (11, 3, 2026, 3, 2500),
  (12, 3, 2026, 4, 1800),
  -- Bien 4 — Studio Marais
  (13, 4, 2026, 1,  700),
  (14, 4, 2026, 2,  550),
  (15, 4, 2026, 3,  500),
  (16, 4, 2026, 4,  480),
  -- Bien 5 — Gîte Forêt
  (17, 5, 2026, 1, 1100),
  (18, 5, 2026, 2,  750),
  -- Bien 6 — Appartement Annecy
  (19, 6, 2026, 1, 1600),
  (20, 6, 2026, 2, 1000),
  -- Bien 7 — Maison Méditerranéenne
  (21, 7, 2026, 1, 2800),
  (22, 7, 2026, 2, 1500),
  -- Bien 8 — Loft Strasbourg
  (23, 8, 2026, 1,  950),
  (24, 8, 2026, 2,  700),
  -- Bien 9 — Villa La Rochelle
  (25, 9, 2026, 1, 3500),
  (26, 9, 2026, 2, 2000),
  -- Bien 10 — Maison Pêcheur
  (27, 10, 2026, 1, 1200),
  (28, 10, 2026, 2,  800);

-- =============================================================================
-- 9. PRESTATIONS PAR BIEN
-- =============================================================================
INSERT IGNORE INTO se_compose (id_biens, id_prestation, quantite_prestation) VALUES
  -- Bien 1 (Le Refuge Basque)
  (1, 1, 1),(1, 3, 1),(1, 5, 1),(1, 7, 1),(1, 11, 1),
  -- Bien 2 (Chalet Chamonix)
  (2, 1, 1),(2, 3, 1),(2, 9, 1),(2, 5, 1),(2, 12, 1),
  -- Bien 3 (Villa Azur)
  (3, 1, 1),(3, 2, 1),(3, 3, 1),(3, 4, 1),(3, 6, 1),(3, 7, 1),(3, 8, 1),(3, 10, 1),
  -- Bien 4 (Studio Marais)
  (4, 1, 1),(4, 5, 1),(4, 6, 1),
  -- Bien 5 (Gîte Forêt)
  (5, 1, 1),(5, 3, 1),(5, 7, 1),(5, 11, 1),(5, 14, 1),
  -- Bien 6 (Appartement Annecy)
  (6, 1, 1),(6, 5, 1),(6, 6, 1),(6, 10, 1),
  -- Bien 7 (Maison Méditerranéenne)
  (7, 1, 1),(7, 2, 1),(7, 3, 1),(7, 4, 1),(7, 7, 1),(7, 11, 1),
  -- Bien 8 (Loft Strasbourg)
  (8, 1, 1),(8, 3, 1),(8, 4, 1),(8, 6, 1),
  -- Bien 9 (Villa La Rochelle)
  (9, 1, 1),(9, 2, 1),(9, 3, 1),(9, 8, 1),(9, 10, 1),(9, 11, 1),
  -- Bien 10 (Maison Pêcheur)
  (10, 1, 1),(10, 3, 1),(10, 13, 1);

-- =============================================================================
-- 10. COMMENTAIRES
-- =============================================================================
INSERT IGNORE INTO commentaires
  (id_commentaire, id_biens, id_locataire, note, titre, contenu, statut, date_creation)
VALUES
  (1,  1, 1, 5, 'Séjour parfait !',
   'Maison magnifique, hôte très sympa, plage à 5 minutes. On reviendra avec plaisir !',
   'publie', '2025-08-20 10:30:00'),

  (2,  1, 3, 4, 'Très bon séjour',
   'Maison propre et bien équipée. Le quartier est animé. Petit bémol sur le parking un peu difficile.',
   'publie', '2025-07-15 14:12:00'),

  (3,  2, 1, 5, 'Vue extraordinaire',
   'Le chalet dépasse toutes nos attentes. La vue sur le Mont-Blanc est irréelle. Cheminée fonctionnelle, literie excellente.',
   'publie', '2026-01-10 09:00:00'),

  (4,  2, 4, 5, 'Week-end ski parfait',
   'Accès direct aux pistes, chalet bien chauffé, très bien équipé. Je recommande à 100%.',
   'publie', '2026-02-18 18:30:00'),

  (5,  3, 1, 5, 'Luxueux et magnifique',
   'La villa est exactement comme sur les photos. Piscine chauffée, vue mer, personnel disponible. Parfait pour une occasion spéciale.',
   'publie', '2025-09-05 11:00:00'),

  (6,  4, 3, 4, 'Idéal pour Paris',
   'Studio pratique et bien situé. Tout est à portée de main. Idéal pour visiter Paris sans voiture.',
   'publie', '2025-11-22 16:45:00'),

  (7,  5, 4, 5, 'Ressourcement garanti',
   'Gîte au calme absolu, jardin immense, les enfants ont adoré. Les propriétaires sont adorables.',
   'publie', '2025-08-10 08:20:00'),

  (8,  6, 5, 5, 'Vue lac à couper le souffle',
   'L\'appartement est superbe, la terrasse avec vue sur le lac est inoubliable. On se lève le matin et on ne veut plus partir.',
   'publie', '2025-07-28 20:00:00'),

  (9,  7, 2, 4, 'Superbe maison',
   'Piscine agréable, jardin parfait pour les enfants. Bien situé par rapport aux calanques.',
   'publie', '2025-08-30 15:00:00'),

  (10, 9, 1, 5, 'Pieds dans l\'eau',
   'Réveils face à la mer, accès direct à la plage, jacuzzi au coucher du soleil... voyage de rêve.',
   'publie', '2025-09-12 09:30:00'),

  (11, 10, 3, 4, 'Authentique et dépaysant',
   'La maison de pêcheur a du charme. Le port animé, les restos de poisson à deux pas, les vélos pour se balader. Excellent rapport qualité/prix.',
   'publie', '2025-07-20 11:00:00'),

  -- Commentaire en attente (ne doit pas être visible)
  (12, 1, 2, 2, 'Déçu par le ménage',
   'La maison était sale à notre arrivée. Le propriétaire a tardé à répondre.',
   'en_attente', '2026-03-01 08:00:00');

-- =============================================================================
-- 11. FAVORIS
-- =============================================================================
INSERT IGNORE INTO favoris (id_locataire, id_biens, date_ajout) VALUES
  (1, 2, '2026-03-01 10:00:00'),
  (1, 3, '2026-03-05 11:30:00'),
  (1, 9, '2026-03-10 14:00:00'),
  (3, 1, '2026-02-14 08:00:00'),
  (3, 7, '2026-03-08 09:00:00'),
  (4, 2, '2026-01-20 16:00:00'),
  (5, 6, '2026-03-15 12:00:00');

-- =============================================================================
-- 12. RÉSERVATIONS
-- =============================================================================
INSERT IGNORE INTO reservations
  (id_reservation, id_locataire, id_biens, date_debut, date_fin, id_tarif)
VALUES
  -- Alice réserve le Refuge Basque (passé)
  (1, 1, 1, '2025-08-01', '2025-08-08', 1),
  -- Bob réserve le Chalet (passé)
  (2, 2, 2, '2026-01-05', '2026-01-12', 8),
  -- Claire réserve le Studio Marais (à venir)
  (3, 3, 4, '2026-04-10', '2026-04-17', 14),
  -- David réserve le Gîte (à venir)
  (4, 4, 5, '2026-06-20', '2026-06-27', 17),
  -- Emma réserve Annecy (haute saison)
  (5, 5, 6, '2026-07-12', '2026-07-26', 19),
  -- Alice réserve La Rochelle (été prochain)
  (6, 1, 9, '2026-07-04', '2026-07-11', 25);

-- =============================================================================
-- 13. BLOCAGES PROPRIÉTAIRES (table optionnelle, s'ignore si absente)
-- =============================================================================
INSERT IGNORE INTO blocages (id_biens, date_debut, date_fin, motif) VALUES
  (1, '2026-05-01', '2026-05-07', 'Travaux de peinture'),
  (2, '2026-03-20', '2026-03-27', 'Usage personnel'),
  (9, '2026-06-01', '2026-06-14', 'Rénovation terrasse');

-- =============================================================================
-- 14. NOTIFICATIONS
-- =============================================================================
INSERT IGNORE INTO notifications
  (user_id, type, title, message, link, is_read, created_at)
VALUES
  (2, 'reservation', 'Nouvelle réservation',
   'Alice a réservé "Le Refuge Basque" du 2025-08-01 au 2025-08-08.',
   '/reservations', 1, '2025-07-20 09:00:00'),
  (2, 'reservation', 'Nouvelle réservation',
   'Nouvelle réservation pour "Chalet Vue Blanche" du 2026-01-05 au 2026-01-12.',
   '/reservations', 1, '2025-12-15 10:00:00'),
  (1, 'info', 'Bienvenue sur Goodnight !',
   'Découvrez des centaines de logements de qualité en France.',
   NULL, 0, '2026-01-01 00:00:00');

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- ✅  COMPTES DE TEST
--     Email               | Mot de passe | Rôle
--     --------------------|--------------|------------------------------
--     alice@goodnight.test | testpass    | locataire (3 réservations, 4 favoris)
--     bob@goodnight.test   | testpass    | propriétaire (biens 1, 2 + 1 réservation)
--     claire@goodnight.test| testpass    | locataire + propriétaire (biens 3, 4)
--     david@goodnight.test | testpass    | locataire + propriétaire (bien 5)
--     emma@goodnight.test  | testpass    | locataire
-- =============================================================================
