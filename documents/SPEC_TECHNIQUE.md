# Spécification Technique — Goodnight

> Version 1.2 — Mars 2026

---

## Table des matières

1. [Architecture générale](#1-architecture-générale)
2. [Stack technologique](#2-stack-technologique)
3. [Structure du projet](#3-structure-du-projet)
4. [Connexion à la base de données](#4-connexion-à-la-base-de-données)
5. [Authentification & sécurité](#5-authentification--sécurité)
6. [Client HTTP (mobile/web)](#6-client-http-mobileweb)
7. [Système de filtres](#7-système-de-filtres)
8. [Endpoints API](#8-endpoints-api)
9. [Modèles de données TypeScript](#9-modèles-de-données-typescript)
10. [Navigation (React Native)](#10-navigation-react-native)
11. [Variables d'environnement](#11-variables-denvironnement)
12. [Addendum technique — Correctifs livrés (Mars 2026)](#12-addendum-technique--correctifs-livrés-mars-2026)
13. [Spécification détaillée des changements livrés](#13-spécification-détaillée-des-changements-livrés)

---

## 1. Architecture générale

```
┌────────────────────────────────┐
│   Application mobile / web     │
│   React Native + Expo SDK 54   │
│   TypeScript                   │
└───────────────┬────────────────┘
                │ HTTP/REST (JSON)
                │ Port 3000
┌───────────────▼────────────────┐
│   Serveur API                  │
│   Node.js + Express.js         │
│   server/server.js             │
└───────────────┬────────────────┘
                │ mysql2/promise
┌───────────────▼────────────────┐
│   Base de données              │
│   MySQL — base "goodnight"     │
│   charset utf8mb4              │
└────────────────────────────────┘
```

- **Web** : accès via `http://localhost:3000/api`
- **Mobile (réseau local)** : accès via `http://10.33.192.66:3000/api`
- **Toutes les réponses API** suivent le format `{ success: boolean, data?: T, error?: string }`

---

## 2. Stack technologique

| Couche | Technologie | Version |
|---|---|---|
| Application | React Native / Expo | SDK 54 |
| Langage (app) | TypeScript | ~5.x |
| Serveur API | Node.js + Express.js | — |
| Base de données | MySQL | 8.x |
| Pilote BDD | mysql2/promise | — |
| Authentification | JWT (jsonwebtoken) | — |
| Hachage mdp | bcryptjs | — |
| Stockage token (mobile) | expo-secure-store | — |
| Stockage token (web) | localStorage | — |
| Sliders | @react-native-community/slider | — |
| Calendrier | react-native-calendars | — |
| Icônes | @expo/vector-icons (Ionicons) | — |
| Navigation | @react-navigation/native + bottom-tabs + stack | — |

---

## 3. Structure du projet

```
Goodnight/
├── App.tsx                     # Point d'entrée, AuthProvider
├── index.ts                    # Entrée Expo
├── app.json                    # Configuration Expo
├── tsconfig.json
├── package.json
│
├── src/
│   ├── components/             # Composants réutilisables
│   │   └── ErrorToast.tsx
│   ├── hooks/
│   │   └── useAuth.tsx         # Contexte d'authentification
│   ├── navigation/
│   │   └── AppNavigator.tsx    # Navigateur principal (tabs + stacks)
│   ├── screens/
│   │   ├── HomeScreen.tsx      # Explorer — liste et filtres
│   │   ├── BienDetailScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── FavoritesScreen.tsx
│   │   ├── ReservationsScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── LoginScreen.tsx
│   ├── services/
│   │   ├── apiClient.ts        # Client HTTP centralisé
│   │   ├── authService.ts      # Login / Register / cache
│   │   ├── biensService.ts
│   │   ├── commentairesService.ts
│   │   ├── favorisService.ts
│   │   ├── notificationsService.ts
│   │   └── reservationsService.ts
│   ├── types/
│   │   └── models.ts           # Interfaces TypeScript
│   └── utils/
│       └── errorHandler.ts
│
├── server/
│   ├── server.js               # Point d'entrée Express
│   ├── package.json
│   ├── config/
│   │   └── database.js         # Pool MySQL
│   ├── middleware/
│   │   └── auth.js             # Vérification JWT
│   └── routes/
│       ├── auth.js             # /api/auth/*
│       ├── biens.js            # /api/biens/*
│       ├── reservations.js     # /api/reservations/*
│       ├── favoris.js          # /api/favoris/*
│       ├── commentaires.js     # /api/commentaires/*
│       └── notifications.js    # /api/notifications/*
│
└── php-api/                    # API PHP alternative (non utilisée en production)
```

---

## 4. Connexion à la base de données

### Configuration du pool

Fichier : `server/config/database.js`

```js
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  database:           process.env.DB_NAME     || 'goodnight',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASS     || '',
  charset:            'utf8mb4',
  waitForConnections: true,
  connectionLimit:    10,
});
```

- **connectionLimit: 10** — maximum 10 connexions simultanées au pool
- **waitForConnections: true** — les requêtes excédentaires sont mises en file d'attente
- **charset utf8mb4** — support complet Unicode (emojis, caractères spéciaux)
- Les paramètres sont lus depuis un fichier `.env` via `dotenv`
- Le pool est exporté directement : chaque route fait `const [rows] = await pool.execute(sql, params)`
- `pool.execute()` utilise des **requêtes préparées** (paramètres `?`), protection native contre les injections SQL

### Cycle de vie d'une requête

```
Route handler
  → pool.execute(sql, [params])        // Statement préparé, auto-échappement
  → MySQL retourne [[rows], [fields]]
  → rows[0] ou rows (liste)
  → res.json({ success: true, data: rows })
```

---

## 5. Authentification & sécurité

### Flux de connexion

```
App → POST /api/auth/login { email, password }
  → SELECT * FROM locataire WHERE email_locataire = ?
  → bcrypt.compare(password, user.password_locataire)
  → jwt.sign({ id_locataire, email }, JWT_SECRET, { expiresIn: '7d' })
  → Suppression de password_locataire de l'objet
  → { success: true, data: { token, user } }
```

### Flux d'inscription

```
App → POST /api/auth/register { nom, prenom, email, telephone, mot_de_passe }
  → Vérification unicité email
  → bcrypt.hash(mot_de_passe, 10)
  → INSERT INTO locataire (...)
  → jwt.sign(...)
  → { success: true, data: { token, user } }
```

### Middleware JWT (`server/middleware/auth.js`)

```js
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  // Attend: "Authorization: Bearer <token>"
  const token = authHeader.slice(7);
  req.user = jwt.verify(token, process.env.JWT_SECRET);
  next();
  // → 401 si header absent, token invalide ou expiré
}
```

### Persistance côté app

| Plateforme | Stockage token | Stockage cache user |
|---|---|---|
| iOS / Android | `expo-secure-store` (clé : `jwt_token`) | `expo-secure-store` (clé : `cached_user`) |
| Web | `localStorage` (clé : `jwt_token`) | `localStorage` (clé : `cached_user`) |

### Sauvegarde du token et envoi Bearer (mise à jour du 19/03/2026)

- Après `POST /api/auth/login` ou `POST /api/auth/register`, le JWT est persisté sous la clé `jwt_token`.
- Chaque appel `apiFetch(...)` lit ce token et envoie automatiquement `Authorization: Bearer <jwt_token>`.
- Sur réponse `401` avec token présent, le token est supprimé localement et la session est invalidée côté app.

### Vérification au démarrage (`useAuth.tsx`)

```
App démarre
  → token en store ?
    → OUI → apiClient injecte `Authorization: Bearer <jwt_token>`
    → OUI → GET /api/auth/me (avec Bearer token)
      → succès → user = réponse serveur, rafraîchit cache
      → 401/Session expirée → logout(), supprime token
      → Erreur réseau/timeout → user = cache local (mode offline)
    → NON → user = null
  → isLoading = false
```

---

## 6. Client HTTP (mobile/web)

Fichier : `src/services/apiClient.ts`

### URL de base

```ts
const BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000/api'
    : 'http://10.33.192.66:3000/api';
```

### Comportements

- **Timeout** : 10 secondes via `AbortController`
- **Header JWT** : ajouté automatiquement si un token est présent en store
- **401 avec token existant** : supprime le token et lance `'Session expirée'`
- **401 sans token** : lit le message d'erreur serveur (ex: mauvais mot de passe)
- **5xx** : message générique `'Une erreur est survenue, réessayez plus tard'`
- **Extraction automatique** : retourne `json.data` (pas `json` entier)

```ts
export async function apiFetch<T>(
  endpoint: string,
  method: HttpMethod = 'GET',
  body?: object
): Promise<T>
```

---

## 7. Système de filtres

### Interface `FiltersState` (HomeScreen.tsx)

```ts
interface FiltersState {
  search: string;
  villes: string[];        // plusieurs villes sélectionnées
  types: number[];         // IDs de types de bien
  equipements: number[];   // IDs d'équipements (AND logic)
  prix_min?: number;       // 0–3000 €/sem, step 50
  prix_max?: number;
  min_note?: number;       // note moyenne minimale
  voyageurs?: number;      // capacité minimale
  distance_km?: number;    // rayon géographique
  date_debut?: string;     // ISO YYYY-MM-DD
  date_fin?: string;
  sort: string;            // 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc'
}
```

### Sérialisation vers l'API (`buildParams`)

| Paramètre | Format envoyé |
|---|---|
| `villes` | `villes=Paris,Biarritz` (comma-joined) |
| `types` | `types=1,3` |
| `equipements` | `equipements=2,5,8` |
| `prix_min` / `prix_max` | `prix_min=500&prix_max=1500` |
| `date_debut` / `date_fin` | `date_debut=2026-07-01&date_fin=2026-07-14` |

### Traitement serveur — `buildFilters()` (`server/routes/biens.js`)

| Filtre | Conditions SQL générées |
|---|---|
| `search` | `b.designation_bien LIKE '%x%' OR b.description_biens LIKE '%x%'` |
| 1 ville | `c.ville_nom LIKE '%x%'` |
| N villes | `(c.ville_nom LIKE '%x%' OR c.ville_nom LIKE '%y%' OR ...)` |
| `types` | `b.id_TypeBien IN (?,?,?)` |
| `prix_min` | `COALESCE((SELECT MIN(t.prix_semaine) FROM tarifs t WHERE t.id_biens = b.id_biens), 0) >= ?` |
| `prix_max` | même sous-requête `<= ?` |
| `animaux` | `b.animaux_biens = 1` |
| `voyageurs` | `b.nb_couchage >= ?` |
| `date_debut + date_fin` | `b.id_biens NOT IN (SELECT r.id_biens FROM reservations r WHERE r.date_debut < ? AND r.date_fin > ?)` |
| `distance_km` | `ST_Distance_Sphere(POINT(c.ville_longitude_deg, c.ville_latitude_deg), POINT(?, ?)) <= ?` (en mètres) |
| `equipements` | un `EXISTS (SELECT 1 FROM bien_equipement WHERE id_biens = b.id_biens AND id_equipement = ?)` par équipement (logique AND) |
| `min_note` | clause `HAVING COALESCE(AVG(com.note), 0) >= ?` |

### Requête principale SQL (`GET /api/biens`)

```sql
SELECT b.*, c.ville_nom, c.ville_code_postal, tb.desc_type_bien,
       COALESCE(AVG(com.note), 0) as note_moyenne,
       COUNT(com.id_commentaire) as nb_avis,
       (SELECT pb.lien_photo FROM photos pb WHERE pb.id_biens = b.id_biens LIMIT 1) as photo_principale,
       (SELECT MIN(t.prix_semaine) FROM tarifs t WHERE t.id_biens = b.id_biens) as prix_semaine_min
FROM biens bz
LEFT JOIN commune c ON b.id_commune = c.id_commune
LEFT JOIN type_bien tb ON b.id_TypeBien = tb.id_typebien
LEFT JOIN commentaires com ON b.id_biens = com.id_biens AND com.statut = 'publie'
WHERE [clauses dynamiques]
GROUP BY b.id_biens
[HAVING si min_note]
ORDER BY [tri dynamique]
LIMIT ? OFFSET ?
```

### Options de tri — `getSortSql()`

| Valeur `sort` | SQL ORDER BY |
|---|---|
| `relevance` (défaut) | `b.id_biens DESC` |
| `price_asc` | sous-requête `MIN(prix_semaine) ASC` |
| `price_desc` | sous-requête `MIN(prix_semaine) DESC` |
| `rating_desc` | `note_moyenne DESC` |

### Pagination

- Paramètres : `page` (défaut 1), `limit` (défaut 20, max 50)
- Offset calculé : `(page - 1) * limit`
- Chargement incrémental : l'app incrémente `pageRef.current` au scroll

---

## 8. Endpoints API

### Auth — `/api/auth`

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Non | Connexion — retourne `{ token, user }` |
| POST | `/auth/register` | Non | Inscription — retourne `{ token, user }` |
| GET | `/auth/me` | JWT | Profil de l'utilisateur connecté |

### Biens — `/api/biens`

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/biens` | Non | Liste paginée avec filtres complets |
| GET | `/biens/villes?q=xxx` | Non | Autocomplétion des villes (LIKE `xxx%`, limit 10) |
| GET | `/biens/types` | Non | Liste de tous les types de bien |
| GET | `/biens/count` | Non | Compte les résultats avec les mêmes filtres |
| GET | `/biens/:id` | Non | Détail d'un bien + photos |

### Autres routes (serveur)

| Préfixe | Fichier |
|---|---|
| `/api/reservations` | `routes/reservations.js` |
| `/api/favoris` | `routes/favoris.js` |
| `/api/commentaires` | `routes/commentaires.js` |
| `/api/notifications` | `routes/notifications.js` |

---

## 9. Modèles de données TypeScript

### `Locataire` (`src/types/models.ts`)

```ts
interface Locataire {
  id_locataire: number;
  nom_locataire: string | null;
  prenom_locataire: string | null;
  dateNaissance_locataire: string | null;
  email_locataire: string;
  tel_locataire: string | null;
  rue_locataire: string | null;
  complement_locataire: string | null;
  RaisonSociale: string | null;
  Siret: string | null;
  id_commune: number | null;
  pfp_loca: string | null;
  id_cadre_actif: number | null;
  frames_unlocked: boolean;
}
```

### `Bien` (avec champs joints)

```ts
interface Bien {
  id_biens: number;
  designation_bien: string;
  rue_biens: string;
  complement_biens: string | null;
  superficie_biens: number;
  description_biens: string | null;
  animaux_biens: boolean;
  nb_couchage: number;
  id_TypeBien: number;
  id_commune: number;
  id_locataire: number | null;
  statut_validation: 'en_attente' | 'valide' | 'refuse';
  // Champs joints (SELECT)
  ville_nom?: string;
  ville_code_postal?: string;
  desc_type_bien?: string;
  prix_nuit?: number;          // alias de prix_semaine_min
  note_moyenne?: number;
  nb_avis?: number;
  photo_principale?: string;
}
```

---

## 10. Navigation (React Native)

Architecture : **RootStack → MainTabs + Login**

```
RootStack (createStackNavigator)
├── MainApp
│   └── MainTabs (createBottomTabNavigator)
│       ├── Explorer tab  →  HomeStack
│       │   ├── HomeMain  (HomeScreen)
│       │   └── BienDetail (BienDetailScreen)
│       ├── Search tab   →  SearchScreen
│       ├── Favoris tab  →  FavoritesGate
│       │   ├── Auth OK  → FavoritesScreen
│       │   └── Non auth → AuthRequired + bouton "Se connecter"
│       ├── Voyages tab  →  TripsGate
│       │   ├── Auth OK  → ReservationsScreen
│       │   └── Non auth → AuthRequired
│       └── Profil tab   →  ProfileStack
│           ├── ProfileMain (ProfileScreen)
│           └── Notifications (NotificationsScreen)
└── Login (LoginScreen)
```

- **AuthRequired** : garde écran avec cadenas, titre et bouton redirigeant vers `Login`
- **isLoading** : spinner global pendant la vérification du token au démarrage

---

## 11. Variables d'environnement

Fichier `.env` à la racine de `server/` :

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=goodnight
DB_USER=root
DB_PASS=

JWT_SECRET=<clé_secrète_longue>
JWT_EXPIRES_IN=7d
```

> **Important :** ne jamais versionner le fichier `.env`. Ajouter `.env` au `.gitignore`.

---

## 12. Addendum technique — Correctifs livrés (Mars 2026)

Cette section documente les changements réellement implémentés pendant l'intervention.

### 12.1 Correctifs infrastructure API (Apache + PHP)

| Sujet | Cause racine | Correctif appliqué | Concerné |
|---|---|---|---|
| CORS bloquant sur web | Front controller non atteint pour certaines routes API | Ajout règle rewrite vers `index.php` dans `.htaccess` | API PHP, Apache, web |
| 404 sur `/api/*` | Alias Apache non configuré | Ajout `Alias /api` et bloc `<Directory>` dans la conf Apache | Apache `httpd.conf`, accès API |
| En-têtes CORS dupliqués | CORS défini à la fois par Apache et PHP | Centralisation CORS côté Apache, simplification helper PHP | `php-api/.htaccess`, `php-api/core/helpers.php` |
| 401 "Token manquant" avec Bearer présent | Header `Authorization` non propagé par Apache/PHP | Propagation via rewrite env + fallback de lecture headers dans middleware | `php-api/.htaccess`, `php-api/core/auth_middleware.php` |

### 12.2 Correctifs application (auth + navigation)

| Sujet | Cause racine | Correctif appliqué | Concerné |
|---|---|---|---|
| Session non persistée | Mauvaise propriété consommée (`loading` au lieu de `isLoading`) | Alignement sur la propriété réelle du hook auth | `src/navigation/AppNavigator.tsx` |
| Login n'authentifiait pas l'état global | Appel direct service login sans passer par le contexte auth | Réécriture de l'écran login avec `useAuth().login()` | `src/screens/LoginScreen.tsx`, `src/hooks/useAuth.tsx` |
| Erreurs web images (ORB) | URLs relatives `/uploads/...` absentes en local web | Fallback web: ne pas résoudre ces chemins en URL image | `src/services/apiClient.ts` |

### 12.3 Implémentation technique du flux Réservation (Issue #16)

| Élément | Implémentation | Concerné |
|---|---|---|
| Disponibilités | Endpoint `GET /biens/:id/disponibilites` (réservations + blocages) | `php-api/routes/biens.php` |
| Calcul tarif | Endpoint `GET /biens/:id/tarif?debut&fin` avec calcul semaines + nuits extra | `php-api/routes/biens.php` |
| Création réservation | Validation payload, dates, conflits, blocages, propriétaire, insertion notification | `php-api/routes/reservations.php` |
| Typage front | Types dédiés réservations + enrichissement modèle réservation | `src/types/reservation.ts`, `src/types/models.ts` |
| UI réservation | Calendrier, dates bloquées, calcul prix, CTA confirmation | `src/screens/ReservationScreen.tsx` |
| Confirmation | Écran de succès avec référence + recap | `src/screens/ConfirmationScreen.tsx` |
| Navigation | Déclaration des routes `Reservation` et `Confirmation` | `src/navigation/AppNavigator.tsx` |
| Voyages | Liste réelle connectée à l'API, plus placeholder | `src/screens/ReservationsScreen.tsx`, `src/services/reservationsService.ts` |

### 12.4 Jeu de test SQL et adaptation au schéma réel

| Sujet | Détail | Concerné |
|---|---|---|
| Seed principal | Création d'un seed complet (communes, biens, tarifs, commentaires, réservations, favoris, notifications) | `php-api/seed_goodnight.sql` |
| Compatibilité schéma | Mapping équipements vers tables réelles `prestation` + `se_compose` | `php-api/seed_goodnight.sql`, base MySQL |
| Comptes test | Insertion idempotente des comptes `*@goodnight.test` sans forcer les IDs PK | `php-api/seed_goodnight.sql`, table `locataire` |

### 12.5 Validation exécutée

| Vérification | Résultat | Concerné |
|---|---|---|
| Import seed SQL | Exécuté sans erreur bloquante après corrections | MySQL `goodnight` |
| Auth protégée | `register/login` puis `GET /auth/me` avec Bearer => OK | API auth PHP |
| Création réservation | `POST /reservations` avec token valide => 201/OK | API réservations PHP |

### 12.6 Notes d'architecture

- Le dépôt contient à la fois un serveur Node (`server/`) et une API PHP (`php-api/`).
- Les correctifs ci-dessus concernent le runtime actif pendant l'intervention: API PHP exposée via Apache `/api`.
- Pour éviter les ambiguïtés futures, il est recommandé de définir explicitement dans la doc d'exploitation quel backend est la source de vérité par environnement.

---

## 13. Spécification détaillée des changements livrés

Cette section formalise, de façon contractuelle, les comportements attendus après les correctifs réalisés.

### 13.1 Couches actives et flux d'exécution

| Couche | Runtime réellement utilisé pendant les correctifs | Détail opérationnel |
|---|---|---|
| Front | Expo (mobile + web) | Appels HTTP vers `/api` |
| API active | PHP sous Apache (`php-api/`) | Front controller `php-api/index.php` |
| API alternative | Node/Express (`server/`) | Présente dans le dépôt mais hors périmètre runtime corrigé |
| Base de données | MySQL/MariaDB (`goodnight`) | Connexion PDO depuis `php-api/config/database.php` |

Règle d'exploitation:
- En environnement local web, la référence d'URL API est `http://localhost/api`.
- Toute vérification fonctionnelle des correctifs doit cibler l'API PHP.

### 13.2 Contrat d'authentification JWT

#### 13.2.1 Login

Endpoint:
- `POST /api/auth/login`

Payload entrant:

```json
{
  "email": "alice@goodnight.test",
  "password": "testpass"
}
```

Réponse succès (200):

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": {
      "id_locataire": 10,
      "email_locataire": "alice@goodnight.test"
    }
  }
}
```

Erreurs:
- 401: identifiants invalides
- 400: champs manquants
- 500: erreur technique serveur

#### 13.2.2 Routes protégées

Header obligatoire:
- `Authorization: Bearer <token>`

Comportement middleware (après correctif):
1. Lecture de `HTTP_AUTHORIZATION`
2. Fallback sur `REDIRECT_HTTP_AUTHORIZATION`
3. Fallback final via `getallheaders()` (`Authorization`/`authorization`)
4. Rejet 401 si header absent ou token invalide/expiré

Critère d'acceptation:
- Un token fraîchement émis par `/auth/login` ou `/auth/register` doit être accepté par `GET /api/auth/me` et `POST /api/reservations`.

#### 13.2.3 Sauvegarde et injection du Bearer côté client

Contrat client:
1. Le JWT reçu est sauvegardé en local (`jwt_token`) sur web et mobile.
2. Le client HTTP ajoute automatiquement `Authorization: Bearer <jwt_token>` sur chaque endpoint protégé.
3. En cas de `401` avec token présent, le token est supprimé, puis l'utilisateur repasse en état non authentifié.

Critères de validation:
- Login réussi puis `GET /api/auth/me` retourne `200` sans ajout manuel de headers dans les écrans.
- Register réussi puis `POST /api/reservations` retourne `201` si dates libres et payload valide.
- Suppression du token local entraîne un `401` sur route protégée.

### 13.3 Propagation Authorization dans Apache

Règle Apache imposée (dans `php-api/.htaccess`):

```apache
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [E=HTTP_AUTHORIZATION:%1]
```

Objectif:
- Empêcher la perte du header Bearer entre Apache et PHP (cause du 401 "Token manquant").

Précondition serveur:
- `mod_rewrite` activé
- `AllowOverride All` actif sur le répertoire aliasé `/api`

### 13.4 Contrat détaillé du flux Réservation

#### 13.4.1 Disponibilités

Endpoint:
- `GET /api/biens/:id/disponibilites`

Réponse:
- Tableau de plages `{ date_debut, date_fin, type }`
- `type` vaut `blocage` ou `reservation`

Sources de données:
- Table `reservations` (obligatoire)
- Table `blocages` (optionnelle, fallback géré si absente)

#### 13.4.2 Calcul de tarif

Endpoint:
- `GET /api/biens/:id/tarif?debut=YYYY-MM-DD&fin=YYYY-MM-DD`

Règles de calcul:
- `nb_nuits = diff(date_fin, date_debut)`
- `semaines = floor(nb_nuits / 7)`
- `nuits_extra = nb_nuits % 7`
- `prix_nuit = round(prix_semaine / 7, 2)`
- `total = round(semaines * prix_semaine + nuits_extra * prix_nuit, 2)`

Réponse:

```json
{
  "success": true,
  "data": {
    "id_tarif": 19,
    "prix_semaine": 1600,
    "nb_nuits": 10,
    "semaines": 1,
    "nuits_extra": 3,
    "prix_nuit": 228.57,
    "total": 2285.71
  }
}
```

#### 13.4.3 Création réservation

Endpoint:
- `POST /api/reservations`

Payload entrant:

```json
{
  "id_biens": 6,
  "date_debut": "2026-07-12",
  "date_fin": "2026-07-22",
  "id_tarif": 19
}
```

Validation serveur (ordre logique):
1. Champs requis présents (`id_biens`, `date_debut`, `date_fin`, `id_tarif`)
2. Dates valides et `date_fin > date_debut`
3. Bien existant et `statut_validation = 'valide'`
4. Interdiction propriétaire sur son propre bien
5. Détection de chevauchement réservations
6. Détection de chevauchement blocages propriétaire
7. Insertion réservation
8. Insertion notification propriétaire (best effort)

Règle de chevauchement temporel:

```text
conflit si reservation.date_debut < demande.date_fin
      ET reservation.date_fin   > demande.date_debut
```

Codes de sortie:
- 201: réservation créée
- 400: payload invalide
- 403: tentative de réserver son propre bien
- 404: bien non trouvé/non validé
- 409: conflit de dates (réservation ou blocage)
- 401: token manquant/invalide

### 13.5 Contrat des données de test SQL

Fichier seed:
- `php-api/seed_goodnight.sql`

Objectifs du seed:
- Alimenter les parcours critiques (login, exploration, détail, favoris, réservation, voyages)
- Fournir des cas passés/futurs (réservations, blocages, commentaires)
- Fournir des comptes de test reproductibles

Contraintes d'idempotence:
- Insertion avec `INSERT IGNORE`
- Comptes tests insérés sans forcer l'ID primaire (évite conflits auto-increment)

Compatibilité schéma réel:
- Equipements mappés sur `prestation`
- Liaison bien/equipement mappée sur `se_compose`

Procédure d'import:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root goodnight -e "source c:/Users/er1go/Projets React/Goodnight/php-api/seed_goodnight.sql"
```

Post-contrôle minimal:
- Vérifier l'existence des comptes `*@goodnight.test`
- Vérifier qu'au moins une création de réservation via API réussit avec ces comptes

### 13.6 Gestion des images et comportement web

Constat:
- Des photos historiques en base pointent vers `/uploads/...` non présents localement, causant des erreurs de chargement web.

Correctif applicatif:
- Sur plateforme web, `getImageUrl()` retourne `null` pour les chemins `/uploads/...`.
- L'UI bascule alors sur le placeholder visuel au lieu d'insister sur une URL 404.

Impact:
- Réduction des erreurs de console côté web
- Expérience utilisateur stable malgré un média manquant

### 13.7 Matrice de validation de non-régression

| ID | Scénario | Préconditions | Résultat attendu |
|---|---|---|---|
| NR-01 | Login web | Compte test existant | Token stocké, utilisateur connecté |
| NR-02 | Auth me | Token valide | `GET /api/auth/me` retourne 200 |
| NR-03 | Réservation create | Token valide + bien valide + dates libres | `POST /api/reservations` retourne 201 |
| NR-04 | Conflit réservation | Dates chevauchantes | `POST /api/reservations` retourne 409 |
| NR-05 | Propriétaire | User = propriétaire du bien | `POST /api/reservations` retourne 403 |
| NR-06 | Token absent | Appel route protégée sans header | 401 "Token manquant" |
| NR-07 | Image locale absente web | `photo_principale=/uploads/...` | Placeholder affiché, pas de crash UI |

### 13.8 Limites connues

- Les warnings web liés à `pointerEvents`, `TouchableWithoutFeedback` ou `tintColor` proviennent majoritairement de dépendances tierces et non de la logique métier Goodnight.
- Le dépôt contient deux backends; la coexistence impose une vigilance documentaire pour éviter les dérives de configuration.
