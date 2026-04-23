# SITEMAP — Projet Goodnight
**Dernière mise à jour :** 2026-04-23  
**Stack :** React Native 0.81 / Expo SDK 54 / PHP 8 / MySQL

---

## Vue d'ensemble

```
Goodnight/
├── App.tsx                   ← Point d'entrée React Native
├── index.ts                  ← Enregistrement de l'application Expo
├── app.json                  ← Config Expo (nom, icône, permissions)
├── package.json              ← Dépendances JS/TS
├── tsconfig.json             ← Config TypeScript
│
├── documents/                ← Toute la documentation du projet
│   ├── SITEMAP.md            ← CE FICHIER
│   ├── GLOSSAIRE_TECHNIQUE_ET_MECANIQUES.md
│   ├── SPEC_FONCTIONNELLE.md
│   ├── SPEC_FONCTIONNELLE_20260319.md
│   ├── SPEC_FONCTIONNELLE_FAVORIS_20260319.md
│   ├── SPEC_FONCTIONNELLE_EDIT_BIEN_20260423.md
│   ├── SPEC_FONCTIONNELLE_GALERIE_PHOTOS_20260423.md
│   ├── SPEC_FONCTIONNELLE_STATUT_ANNONCE_20260423.md
│   ├── SPEC_FONCTIONNELLE_SYNC_ECRANS_20260423.md
│   ├── SPEC_TECHNIQUE.md
│   ├── SPEC_TECHNIQUE_20260319.md
│   ├── SPEC_TECHNIQUE_FAVORIS_20260319.md
│   ├── SPEC_TECHNIQUE_EDIT_BIEN_20260423.md
│   ├── SPEC_TECHNIQUE_GALERIE_PHOTOS_20260423.md
│   ├── SPEC_TECHNIQUE_STATUT_ANNONCE_20260423.md
│   └── SPEC_TECHNIQUE_SYNC_ECRANS_20260423.md
│
├── src/                      ← Code source React Native
│   ├── types/
│   ├── hooks/
│   ├── services/
│   ├── components/
│   ├── screens/
│   └── navigation/
│
├── php-api/                  ← API backend PHP built-in server
│   ├── index.php             ← Contrôleur frontal (front controller)
│   ├── router.php            ← Routeur HTTP maison
│   ├── auth/                 ← Endpoints d'authentification
│   ├── config/               ← Connexion BDD
│   ├── core/                 ← Middlewares & helpers
│   ├── routes/               ← Endpoints métier
│   ├── patches/              ← Migrations SQL à exécuter une fois
│   └── seed_goodnight.sql    ← Données de démarrage BDD
│
├── server/                   ← Serveur Node.js (alternatif au PHP, non actif)
│   └── routes/, middleware/, config/
│
└── assets/                   ← Images statiques (icône, splash)
```

---

## src/types/ — Interfaces TypeScript

| Fichier | Rôle | Utilisé par |
|---|---|---|
| `models.ts` | Toutes les interfaces métier : `Locataire`, `Bien`, `Photo`, `Commune`, `Blocage`, `Notification`… | Tous les écrans, services, hooks |
| `reservation.ts` | Types spécifiques aux réservations | `ReservationScreen`, `ReservationsScreen` |

### Interfaces clés dans `models.ts`
- **`Locataire`** — utilisateur connecté (propriétaire ou locataire)
- **`Bien`** — annonce (avec champs joints : ville, type, photo, prix)
- **`Photo`** — photo d'un bien (`id_photo`, `lien_photo`, `is_principal`)
- **`Blocage`** — période d'indisponibilité d'un bien
- **`Notification`** — notification en base de l'utilisateur

---

## src/hooks/ — Logique réutilisable

| Fichier | Rôle | Utilisé par |
|---|---|---|
| `useAuth.tsx` | Contexte global d'authentification (login / register / logout / user courant) | Tous les écrans via `useAuth()` |
| `useNotifications.ts` | Contexte global de notifications (compteur non-lus, polling 30 s) | `AppNavigator` (badge), `NotificationsScreen` |
| `useScreenFocus.ts` | Déclenche un callback à chaque fois qu'un écran prend le focus de navigation | `HomeScreen`, `SearchScreen`, `MapScreen` |

### Flux de données des hooks

```
App.tsx
  └─ AuthProvider (useAuth.tsx)
       └─ NotificationsProvider (useNotifications.ts)
            └─ AppNavigator
                 └─ Écrans (utilisent useAuth() et useNotifications())
```

### Pattern anti-boucle de `useScreenFocus`
```
callback  →  callbackRef (ref, pas de state)
                  ↕ mis à jour silencieusement à chaque render (useEffect)
useFocusEffect(useCallback( () => callbackRef.current(), [] ))
           ↑ dépendances vides = ne se relance JAMAIS seul
```
→ Garantit zéro boucle infinie même si le callback change entre deux renders.

---

## src/services/ — Couche d'accès à l'API

Tous les services passent par `apiClient.ts` qui gère :
- Résolution automatique de l'IP du serveur PHP (Expo Go, émulateur, web)
- Injection du token JWT en header `Authorization: Bearer`
- Timeout 10 secondes + AbortController
- Erreurs HTTP → `throw new Error(message)`

| Fichier | Endpoints couverts | Utilisé par |
|---|---|---|
| `apiClient.ts` | Fonctions `apiFetch`, `apiUpload`, `getImageUrl`, `saveToken` | Tous les autres services |
| `authService.ts` | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/google` | `useAuth.tsx` |
| `biensService.ts` | Tous les endpoints `/biens/**` | `HomeScreen`, `SearchScreen`, `MapScreen`, `MyBiensScreen`, `EditBienScreen`, `GalerieBienScreen`, `BienDetailScreen`, `AddBienScreen` |
| `commentairesService.ts` | `/commentaires/**` | `BienDetailScreen` |
| `favorisService.ts` | `/favoris/**` | `HomeScreen`, `FavoritesScreen`, `BienDetailScreen` |
| `notificationsService.ts` | `/notifications/**` | `useNotifications.ts`, `NotificationsScreen` |
| `reservationsService.ts` | `/reservations/**` | `ReservationScreen`, `ReservationsScreen`, `ConfirmationScreen` |

### Méthodes clés de `biensService`

```
getAll(filters)              → GET /biens?...            Listing paginé avec filtres
getMine()                    → GET /biens/mine           Biens du propriétaire connecté
update(id, payload)          → PUT /biens/:id            Modifier un bien
create(payload)              → POST /biens               Créer un bien
getPhotos(id)                → GET /biens/:id/photos     Lister les photos
addPhoto(id, url)            → POST /biens/:id/photos    Ajouter une photo par URL
deletePhoto(id, photoId)     → DELETE /biens/:id/photos/:photoId
setPhotoAsFirst(id, photoId) → PUT /biens/:id/photos/:photoId  Définir la photo principale
uploadPhoto(fileUri)         → POST /biens/upload-photo  Upload fichier multipart
getBlocages(id)              → GET /biens/:id/blocages
createBlocage(id, payload)   → POST /biens/:id/blocages
searchCommunes(query)        → GET /biens/communes?q=... Autocomplete ville
```

---

## src/components/ — Composants réutilisables

| Fichier | Rôle | Utilisé par |
|---|---|---|
| `StatusBadge.tsx` | Badge cliquable + modale affichant le statut de validation d'un bien (validé / en attente / refusé) avec motif de refus si applicable | `MyBiensScreen` |
| `ErrorToast.tsx` | Toast d'erreur flottant en bas d'écran, disparaît après quelques secondes | `EditBienScreen`, `GalerieBienScreen` |

---

## src/screens/ — Écrans de l'application

### Flux de navigation simplifié

```
AppNavigator (RootStack)
├── MainTabs (BottomTabNavigator)
│   ├── [Explorer] HomeStack
│   │   ├── HomeScreen              ← Listing principal + filtres avancés
│   │   ├── BienDetailScreen        ← Détail d'un bien + commentaires + favoris
│   │   ├── ReservationScreen       ← Formulaire de réservation
│   │   └── ConfirmationScreen      ← Écran de confirmation après réservation
│   │
│   ├── [Recherche] SearchScreen    ← Recherche texte + filtres rapides
│   │
│   ├── [Favoris] FavoritesScreen   ← Liste des biens favoris (auth requise)
│   │
│   ├── [Voyages] ReservationsScreen ← Réservations de l'utilisateur (auth requise)
│   │
│   └── [Profil] ProfileStack
│       ├── ProfileScreen           ← Informations du profil utilisateur
│       ├── MyBiensScreen           ← Liste des biens du propriétaire
│       ├── AddBienScreen           ← Formulaire de création d'un bien
│       ├── EditBienScreen          ← Formulaire de modification d'un bien
│       ├── GalerieBienScreen       ← Gestion des photos d'un bien
│       ├── BienBlocagesScreen      ← Gestion des blocages (indisponibilités)
│       ├── NotificationsScreen     ← Notifications de l'utilisateur
│       └── MapScreen               ← Carte interactive (aussi accessible depuis Profil)
│
└── Login / Register (modaux dans le RootStack)
```

### Description détaillée des écrans

| Écran | Fichier | Rôle | Services utilisés |
|---|---|---|---|
| **HomeScreen** | `HomeScreen.tsx` | Listing paginé avec filtres avancés, polling 20 s, badge nouveaux biens | `apiFetch`, `favorisService` |
| **SearchScreen** | `SearchScreen.tsx` | Recherche full-text + filtres, debounce 350 ms, auto-refresh au focus | `biensService` |
| **MapScreen** | `MapScreen.tsx` | Carte React Native Maps, marqueurs biens, polling 15 s, géolocalisation | `biensService` |
| **BienDetailScreen** | `BienDetailScreen.tsx` | Détail complet : photos, prix, équipements, avis, bouton réservation | `biensService`, `commentairesService`, `favorisService`, `reservationsService` |
| **ReservationScreen** | `ReservationScreen.tsx` | Sélecteur de dates, récapitulatif prix, confirmation | `reservationsService` |
| **ConfirmationScreen** | `ConfirmationScreen.tsx` | Écran de succès post-réservation | — |
| **FavoritesScreen** | `FavoritesScreen.tsx` | Liste des favoris de l'utilisateur | `favorisService` |
| **ReservationsScreen** | `ReservationsScreen.tsx` | Historique des réservations | `reservationsService` |
| **ProfileScreen** | `ProfileScreen.tsx` | Infos profil, avatar, accès Mes biens / Notifications | `authService` |
| **MyBiensScreen** | `MyBiensScreen.tsx` | Carte par bien : titre, statut (`StatusBadge`), boutons Modifier/Photos/Blocages | `biensService` |
| **AddBienScreen** | `AddBienScreen.tsx` | Formulaire de création d'un nouveau bien | `biensService` |
| **EditBienScreen** | `EditBienScreen.tsx` | Formulaire pré-rempli d'édition d'un bien existant, debounce autocomplete commune | `biensService`, `apiFetch` |
| **GalerieBienScreen** | `GalerieBienScreen.tsx` | Grille de photos : ajout URL / local (ImagePicker), suppression, photo principale | `biensService` |
| **BienBlocagesScreen** | `BienBlocagesScreen.tsx` | Gestion des périodes de blocage (calendrier) | `biensService` |
| **NotificationsScreen** | `NotificationsScreen.tsx` | Liste des notifications, marquer comme lu | `notificationsService` |
| **LoginScreen** | `LoginScreen.tsx` | Formulaire de connexion | `useAuth` |
| **RegisterScreen** | `RegisterScreen.tsx` | Formulaire d'inscription | `useAuth` |

---

## src/navigation/ — Routage

| Fichier | Rôle |
|---|---|
| `AppNavigator.tsx` | Définit l'arborescence complète : BottomTabNavigator + 2 StackNavigators + guards auth (`FavoritesGate`, `TripsGate`) + badge notification |

---

## php-api/ — API Backend PHP

### Arborescence

```
php-api/
├── index.php              ← Front controller : charge le routeur
├── router.php             ← Classe Router (match URL → handler)
├── .htaccess              ← Redirige toutes les requêtes vers index.php
├── seed_goodnight.sql     ← SQL pour peupler la BDD initiale
│
├── config/
│   └── database.php       ← Connexion PDO MySQL (lit .env via getenv)
│
├── core/
│   ├── jwt.php            ← Génération & vérification des tokens JWT
│   ├── auth_middleware.php ← requireAuth() et requireOwnedBien()
│   └── helpers.php        ← jsonResponse(), getBody(), etc.
│
├── auth/
│   ├── login.php          ← POST /auth/login → JWT + user
│   ├── register.php       ← POST /auth/register → JWT + user
│   └── me.php             ← GET /auth/me → profil courant
│
├── routes/
│   ├── biens.php          ← Tous les endpoints /biens/**
│   ├── reservations.php   ← /reservations/**
│   ├── commentaires.php   ← /commentaires/**
│   ├── favoris.php        ← /favoris/**
│   └── notifications.php  ← /notifications/**
│
└── patches/               ← Migrations SQL (à n'exécuter qu'une fois)
    ├── 2026-04-23_add_id_photo_pk.sql
    ├── 2026-04-23_add_is_principal_to_photos.sql
    └── 2026-04-23_add_motif_refus_to_biens.sql
```

### Endpoints principaux

| Méthode | URL | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Non | Connexion, retourne JWT |
| POST | `/auth/register` | Non | Inscription, retourne JWT |
| GET | `/auth/me` | Oui | Profil de l'utilisateur connecté |
| GET | `/biens` | Non | Listing paginé avec filtres |
| POST | `/biens` | Oui | Créer un bien |
| GET | `/biens/mine` | Oui | Biens du propriétaire connecté |
| PUT | `/biens/:id` | Oui (owner) | Modifier un bien |
| GET | `/biens/:id/photos` | Oui (owner) | Lister les photos |
| POST | `/biens/:id/photos` | Oui (owner) | Ajouter une photo (URL) |
| DELETE | `/biens/:id/photos/:photoId` | Oui (owner) | Supprimer une photo |
| PUT | `/biens/:id/photos/:photoId` | Oui (owner) | Définir photo principale |
| POST | `/biens/upload-photo` | Oui | Upload fichier (multipart) |
| GET | `/biens/:id/blocages` | Oui (owner) | Blocages d'un bien |
| POST | `/biens/:id/blocages` | Oui (owner) | Créer un blocage |
| GET | `/reservations` | Oui | Réservations de l'utilisateur |
| POST | `/reservations` | Oui | Créer une réservation |
| GET | `/favoris` | Oui | Favoris de l'utilisateur |
| POST/DELETE | `/favoris/:id` | Oui | Ajouter / supprimer un favori |
| GET | `/notifications` | Oui | Notifications |
| PATCH | `/notifications/:id/lu` | Oui | Marquer comme lu |

---

## Schéma des interactions entre couches

```
┌────────────────────────────────────────────────────────────┐
│  ÉCRANS (screens/)                                          │
│  • Affichent les données                                     │
│  • Gèrent l'état local (useState)                           │
│  • Appellent les services pour fetch/mutate                  │
└────────────────────────┬───────────────────────────────────┘
                         │ appelle
┌────────────────────────▼───────────────────────────────────┐
│  SERVICES (services/)                                        │
│  • biensService, favorisService, etc.                        │
│  • Encapsulent les URLs et le formatage des payloads          │
│  • Retournent des types TypeScript depuis models.ts           │
└────────────────────────┬───────────────────────────────────┘
                         │ via
┌────────────────────────▼───────────────────────────────────┐
│  apiClient.ts                                                │
│  • apiFetch() : JSON GET/POST/PUT/DELETE avec JWT            │
│  • apiUpload() : multipart/form-data                         │
│  • getImageUrl() : résolution des URLs de photos             │
│  • Stockage du token (SecureStore sur mobile, localStorage web) │
└────────────────────────┬───────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼───────────────────────────────────┐
│  php-api/ (PHP built-in server, port 8080)                   │
│  • index.php → router.php → routes/                          │
│  • JWT vérifié par core/auth_middleware.php                   │
│  • Données MySQL via config/database.php (PDO)               │
└────────────────────────────────────────────────────────────┘
```

---

## Dépendances entre les hooks

```
AuthProvider (useAuth.tsx)
  ↳ Fournit : user, isAuthenticated, login, logout, register
  ↳ Utilisé par : TOUS les écrans, AppNavigator, useNotifications

NotificationsProvider (useNotifications.ts)
  ↳ Dépend de : useAuth (isAuthenticated)
  ↳ Fournit : unreadCount, refreshUnreadCount
  ↳ Utilisé par : AppNavigator (badge onglet Profil), NotificationsScreen

useScreenFocus (useScreenFocus.ts)
  ↳ Dépend de : @react-navigation/native (useFocusEffect)
  ↳ Utilisé par : HomeScreen, SearchScreen, MapScreen
```

---

## Migrations SQL — ordre d'application

Ces fichiers sont dans `php-api/patches/` et doivent être exécutés **une seule fois** sur la base de données :

```sql
-- 1. Ajoute la clé primaire à la table photos
source php-api/patches/2026-04-23_add_id_photo_pk.sql

-- 2. Ajoute le champ is_principal à la table photos
source php-api/patches/2026-04-23_add_is_principal_to_photos.sql

-- 3. Ajoute le champ motif_refus à la table biens
source php-api/patches/2026-04-23_add_motif_refus_to_biens.sql
```

---

## Démarrage en développement

```powershell
# 1. Démarrer le serveur PHP (depuis la racine du projet)
php -S localhost:8080 -t php-api

# 2. Démarrer Expo
npx expo start

# 3. Scanner le QR avec Expo Go (iOS/Android)
#    ou appuyer sur W pour la version web
```

> L'IP du serveur PHP est auto-détectée par `apiClient.ts` via `NativeModules.SourceCode.scriptURL`.  
> Pour forcer une IP : créer/modifier `.env` → `EXPO_PUBLIC_SERVER_HOST=http://192.168.x.x:8080`
