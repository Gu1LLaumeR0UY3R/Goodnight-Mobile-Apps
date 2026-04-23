# Glossaire Technique et Explication des Mecaniques Complexes — Goodnight

> Version 1.0 — Mars 2026

Ce document explique les termes techniques et les mecaniques qui peuvent poser probleme dans le projet Goodnight.
L'objectif est de rendre la lecture des specs et du code plus accessible, meme pour un profil non expert.

---

## 1. Termes techniques (glossaire)

### API
- Definition: interface qui permet a l'application (front) de parler au serveur (back).
- Dans Goodnight: routes HTTP comme `/api/auth/login`, `/api/biens`, `/api/reservations`.
- Concerné: front Expo, backend PHP, tests Postman/PowerShell.

### Endpoint
- Definition: URL precise exposee par l'API pour une action.
- Exemple: `POST /api/reservations`.
- Concerné: `php-api/routes/*.php`, services front `src/services/*.ts`.

### Route protegee
- Definition: endpoint qui exige un utilisateur connecte (token valide).
- Exemple: `/api/auth/me`, `/api/reservations`, `/api/favoris`.
- Concerné: `php-api/core/auth_middleware.php`.

### JWT (JSON Web Token)
- Definition: jeton signe qui prouve l'identite de l'utilisateur sans session serveur classique.
- Contenu: payload (ex: `id_locataire`, `email`) + date d'expiration.
- Dans Goodnight: validite 7 jours.
- Concerné: `php-api/core/jwt.php`, login/register, middleware auth.

### Bearer token
- Definition: format standard du header HTTP d'authentification.
- Syntaxe: `Authorization: Bearer <token>`.
- Si absent ou invalide: erreur 401.
- Concerné: `apiClient.ts`, `auth_middleware.php`, Apache `.htaccess`.

### 401 Unauthorized
- Definition: le serveur refuse l'acces car l'authentification n'est pas valide.
- Cas typiques:
  - Token manquant
  - Token expire
  - Token invalide
- Concerné: toutes les routes protegees.

### CORS
- Definition: regles navigateur qui controlent quels domaines peuvent appeler l'API.
- Symptomes: erreurs "Access-Control-Allow-Origin" dans la console web.
- Concerné: `php-api/.htaccess`, preflight OPTIONS.

### Preflight OPTIONS
- Definition: requete de verification envoyee par le navigateur avant certaines requetes (POST/PUT avec headers custom).
- Le serveur doit repondre correctement (souvent 204).
- Concerné: `.htaccess` et fonction de gestion CORS.

### Front controller
- Definition: mecanique qui redirige toutes les routes API vers un point d'entree unique.
- Dans Goodnight: rewrite vers `php-api/index.php`.
- Sans cela: erreurs 404 sur des endpoints existants.
- Concerné: `.htaccess`.

### Rewrite (mod_rewrite)
- Definition: module Apache qui reecrit les URLs.
- Utilise pour:
  - Router les endpoints
  - Propager le header Authorization
- Concerné: Apache + `.htaccess`.

### Alias Apache
- Definition: mappage d'une URL logique vers un dossier physique.
- Dans Goodnight: `/api` pointe vers `php-api/`.
- Concerné: `httpd.conf`.

### Payload
- Definition: corps JSON envoye dans une requete (souvent POST/PUT).
- Exemple reservation:
  - `id_biens`, `date_debut`, `date_fin`, `id_tarif`.
- Concerné: services front + routes PHP.

### DTO / Contrat JSON
- Definition: forme attendue des donnees entre front et back.
- Interet: eviter les erreurs d'integration.
- Concerné: `src/types/*.ts`, endpoints API.

### Validation serveur
- Definition: controles appliques cote API avant insertion ou action.
- Exemples:
  - champs requis
  - format date
  - coherence metier (date fin > date debut)
- Concerné: `php-api/routes/*.php`.

### Requete preparee (Prepared statement)
- Definition: requete SQL parametree avec `?` pour eviter l'injection SQL.
- Interet: securite + robustesse.
- Concerné: toutes les requetes PDO.

### Injection SQL
- Definition: attaque qui injecte du SQL malveillant via des inputs utilisateur.
- Protection dans Goodnight: PDO prepare + cast/validation.

### Hash bcrypt
- Definition: chiffrement non reversible pour stocker les mots de passe.
- On compare ensuite avec `password_verify`.
- Concerné: login/register.

### Idempotence (seed SQL)
- Definition: relancer le script plusieurs fois sans casser la base.
- Dans Goodnight: `INSERT IGNORE`, insertion de comptes sans forcer des IDs fixes.
- Concerné: `php-api/seed_goodnight.sql`.

### PK / FK
- PK (Primary Key): identifiant unique d'une ligne.
- FK (Foreign Key): reference vers une autre table.
- Concerné: toutes les tables relationnelles (`biens`, `reservations`, `locataire`, etc.).

### Pagination
- Definition: decouper les resultats en pages pour eviter de tout charger d'un coup.
- Formule: `offset = (page - 1) * limit`.
- Concerné: `GET /biens`.

### Debounce
- Definition: attendre un court delai avant de lancer une action pour eviter trop d'appels.
- Exemple: autocomplete ville, compteur de resultats filtres.
- Concerné: `HomeScreen`.

### Fallback
- Definition: comportement de secours si le cas ideal echoue.
- Exemples:
  - lecture token via plusieurs sources header
  - image placeholder si photo indisponible
  - cache user si reseau indisponible au demarrage
- Concerné: auth, images, UX resilience.

### ORB (OpaqueResponseBlocking)
- Definition: protection navigateur qui bloque certaines ressources suspectes/cross-origin.
- Dans Goodnight: visible surtout avec images locales introuvables (`/uploads/...`) en web.
- Correctif: fallback image + eviter URL casses en web.

### Placeholder image
- Definition: visuel neutre affiche quand l'image reelle ne peut pas etre chargee.
- Interet: eviter interface vide ou erreurs utilisateur.

### Timeout reseau
- Definition: annulation d'une requete trop longue.
- Dans Goodnight: 10 secondes via `AbortController`.

### SecureStore vs localStorage
- SecureStore: stockage securise mobile (iOS/Android).
- localStorage: stockage web navigateur.
- Dans Goodnight: meme cle logique `jwt_token`, implementation differente selon plateforme.

---

## 2. Mecaniques complexes expliquees pas a pas

## 2.1 Authentification complete (login -> appel protege)

1. L'utilisateur soumet email + mot de passe.
2. Le back verifie le mot de passe hash en base.
3. Le back genere un JWT (7 jours) et renvoie `{ token, user }`.
4. Le front stocke le token (web: localStorage, mobile: SecureStore).
5. Chaque requete ulterieure ajoute `Authorization: Bearer <token>`.
6. Le middleware lit le token, le decode, puis autorise ou rejette la requete.

Points de vigilance:
- Si Apache ne transmet pas `Authorization` a PHP, toutes les routes protegees echouent en 401.
- Un token present mais expire doit declencher une deconnexion propre cote front.

Concerné:
- Front: `src/services/apiClient.ts`, `src/hooks/useAuth.tsx`, `src/services/authService.ts`
- Back: `php-api/core/auth_middleware.php`, `php-api/core/jwt.php`, `php-api/routes/auth.php`
- Infra: `php-api/.htaccess`

## 2.2 Persistance de session au demarrage

Mecanique:
1. Au lancement app, le hook auth lit le token stocke.
2. Si token existe, appel `/auth/me`.
3. Si succes: user global hydrate (session active).
4. Si token invalide: logout (suppression token/cache).
5. Si panne reseau: tentative fallback avec `cached_user`.

Erreur frequente:
- Mauvaise variable d'etat de chargement (`loading` vs `isLoading`) peut bloquer le flow d'auth.

Concerné:
- `src/hooks/useAuth.tsx`
- `src/navigation/AppNavigator.tsx`

## 2.3 Reservation: calcul tarif + anti-conflit

Mecanique:
1. L'ecran charge les indisponibilites (`reservations` + `blocages`).
2. L'utilisateur choisit une plage de dates.
3. Le front appelle `/biens/:id/tarif` pour un prix exact.
4. A la confirmation, le back verifie:
  - payload requis
  - dates valides
  - bien valide
  - utilisateur != proprietaire
  - pas de chevauchement reservation
  - pas de chevauchement blocage
5. Si tout est OK: insertion reservation + notification proprietaire.

Regle de chevauchement:
- Conflit si `existing.start < requested.end` ET `existing.end > requested.start`.

Pourquoi cette formule est importante:
- Elle couvre tous les cas (inclusion totale, partielle, bords).
- Elle evite les doubles reservations.

Concerné:
- `php-api/routes/biens.php`
- `php-api/routes/reservations.php`
- `src/screens/ReservationScreen.tsx`
- `src/services/reservationsService.ts`

## 2.4 CORS + preflight en web

Mecanique:
1. Le navigateur web envoie parfois une requete OPTIONS avant le POST reel.
2. Le serveur doit renvoyer les bons headers CORS.
3. Ensuite le navigateur autorise la requete principale.

Problemes classiques:
- Header manquant -> requete bloquee cote navigateur.
- Header duplique (Apache + PHP) -> erreur "multiple Access-Control-Allow-Origin".

Bonne pratique retenue:
- CORS gere a un seul endroit (Apache).

Concerné:
- `php-api/.htaccess`
- `php-api/core/helpers.php`

## 2.5 Gestion des images heterogenes (HTTP + locales /uploads)

Contexte:
- La table `photos` peut contenir:
  - des URLs absolues (`https://...`)
  - des chemins locaux (`/uploads/...`)

Environnement local web:
- Si le dossier physique n'existe pas/est mal expose, les `/uploads/...` retournent 404.
- Ces echecs repetes peuvent bruiter fortement la console (ORB, fetch errors).

Strategie appliquee:
- Ne pas fabriquer d'URL web pour les chemins `/uploads/...` indisponibles.
- Afficher un placeholder visuel a la place.

Concerné:
- `src/services/apiClient.ts`
- Ecrans affichant des images de biens

## 2.6 Seed SQL et compatibilite schema reel

Contexte:
- Le schema reel ne contenait pas `equipement`/`bien_equipement` mais `prestation`/`se_compose`.

Mecanique de correction:
1. Adapter les INSERT vers les tables reellement presentes.
2. Eviter les collisions d'IDs locataire en n'imposant pas de PK fixes.
3. Garder le script relancable (idempotent) avec `INSERT IGNORE`.

Concerné:
- `php-api/seed_goodnight.sql`
- Base `goodnight`

---

## 3. Erreurs frequentes et diagnostic rapide

### Erreur: "Token manquant" alors que l'utilisateur est connecte
- Cause probable: header Authorization perdu entre Apache et PHP.
- Verifier:
  - regles rewrite Authorization dans `.htaccess`
  - lecture fallback dans `auth_middleware.php`

### Erreur: 401 sur `POST /reservations`
- Causes possibles:
  - token absent/expire
  - header non transmis
  - user deconnecte cote front
- Verifier:
  - presence du token en storage
  - header Bearer envoye par `apiClient`
  - appel `/auth/me` avec le meme token

### Erreurs web images (photo1.jpg, /uploads/...)
- Cause probable: fichiers physiques absents localement.
- Effet: placeholder au lieu d'image, sans bloquer le parcours metier.

### Erreurs CORS en web
- Causes possibles:
  - mauvais alias `/api`
  - regles CORS manquantes
  - doublon de headers CORS

---

## 4. Mini checklist de verification apres changement

1. Login web OK, token bien stocke.
2. `GET /api/auth/me` retourne 200 avec Bearer.
3. Liste biens chargee sans erreur API bloquante.
4. Reservation creee avec token valide (201/OK).
5. Cas conflit de dates renvoie 409.
6. Cas proprietaire renvoie 403.
7. Les images indisponibles n'empechent pas le rendu ecran.

---

## 5. Lexique metier Goodnight

### Bien
- Logement louable (maison, appartement, villa, etc.).

### Locataire
- Utilisateur qui reserve un bien.

### Proprietaire
- Utilisateur lie a un bien via `id_locataire` cote `biens`.

### Blocage
- Periode non reservable definie par le proprietaire.

### Reservation
- Periode reservee par un locataire sur un bien.

### Tarif saisonnier
- Prix hebdomadaire applicable selon saison/date.

### Favori
- Bien enregistre pour consultation rapide.

### Notification
- Message systeme envoye a un utilisateur (ex: nouvelle reservation).
