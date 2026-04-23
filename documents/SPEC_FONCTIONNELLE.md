# Spécification Fonctionnelle — Goodnight

> Version 1.1 — Mars 2026

---

## Table des matières

1. [Présentation de l'application](#1-présentation-de-lapplication)
2. [Utilisateurs cibles](#2-utilisateurs-cibles)
3. [Fonctionnalité : Explorer (écran d'accueil)](#3-fonctionnalité--explorer-écran-daccueil)
4. [Fonctionnalité : Filtres avancés](#4-fonctionnalité--filtres-avancés)
5. [Fonctionnalité : Détail d'un bien](#5-fonctionnalité--détail-dun-bien)
6. [Fonctionnalité : Recherche](#6-fonctionnalité--recherche)
7. [Fonctionnalité : Favoris](#7-fonctionnalité--favoris)
8. [Fonctionnalité : Réservations (Voyages)](#8-fonctionnalité--réservations-voyages)
9. [Fonctionnalité : Profil utilisateur](#9-fonctionnalité--profil-utilisateur)
10. [Fonctionnalité : Notifications](#10-fonctionnalité--notifications)
11. [Fonctionnalité : Connexion & Inscription](#11-fonctionnalité--connexion--inscription)
12. [Comportements transverses](#12-comportements-transverses)
13. [Règles métier](#13-règles-métier)
14. [Addendum — Correctifs livrés (Mars 2026)](#14-addendum--correctifs-livrés-mars-2026)

---

## 1. Présentation de l'application

**Goodnight** est une application mobile et web de location de logements à la semaine. Elle permet aux utilisateurs (locataires) de rechercher, filtrer et réserver des biens immobiliers (maisons, appartements, villas, gîtes, etc.) sur l'ensemble du territoire.

L'application est disponible :
- sur **téléphone mobile** (iOS et Android) via Expo
- dans un **navigateur web** via Expo Web

---

## 2. Utilisateurs cibles

| Profil | Description |
|---|---|
| **Visiteur** | Utilisateur non connecté. Peut explorer et filtrer les biens, voir les détails. Ne peut pas réserver ni mettre en favoris. |
| **Locataire connecté** | Utilisateur authentifié. Accès à toutes les fonctionnalités : favoris, réservations, profil, notifications. |

---

## 3. Fonctionnalité : Explorer (écran d'accueil)

### Description
L'écran principal de l'application. Il affiche la liste des biens disponibles sous forme de cartes et permet d'effectuer une recherche rapide et de trier les résultats.

### Accès
Onglet **Explorer** (icône maison), accessible sans connexion.

### Composants de l'écran

#### Barre de recherche textuelle
- Champ de texte libre en haut de l'écran
- Recherche dans le nom du logement (`designation_bien`) et la description
- La recherche se déclenche lors de la validation (bouton recherche)

#### Chips de tri rapide
Les chips de tri sont affichés horizontalement en dessous de la barre de recherche, scrollables :
- **Pertinence** (défaut) — les biens les plus récents en premier
- **Prix croissant** — du moins cher au plus cher (par semaine)
- **Prix décroissant** — du plus cher au moins cher
- **Mieux notés** — par note moyenne décroissante

Un seul tri actif à la fois, mis en évidence visuellement.

#### Bouton "Filtres"
Ouvre le panneau de filtres avancés (voir section 4).

Quand des filtres actifs sont présents, les chips de filtre correspondants sont affichés sous les chips de tri (indicateur visuel des filtres appliqués, avec bouton ✕ pour les supprimer un par un).

#### Liste des biens
- Affichage en liste verticale de cartes
- Chaque carte contient :
  - Photo principale du logement
  - Nom du logement
  - Ville + code postal
  - Type de logement (ex: Maison, Appartement, Villa...)
  - Prix minimum par semaine (€/sem)
  - Note moyenne (étoiles) + nombre d'avis
- Appui sur une carte → navigation vers le **Détail du bien**

#### Chargement incrémental (infinite scroll)
- Chargement de 12 biens par page
- Au défilement jusqu'en bas de la liste, les 12 biens suivants sont chargés automatiquement
- Indicateur de chargement en bas de liste pendant le fetch

### États de l'écran

| État | Affichage |
|---|---|
| Chargement initial | Spinner centré |
| Liste vide (aucun résultat) | Message "Aucun logement trouvé" |
| Erreur réseau | Toast d'erreur avec message explicatif |

---

## 4. Fonctionnalité : Filtres avancés

### Description
Un panneau modal complet permet de combiner plusieurs critères de filtrage pour affiner la liste des biens affichés.

### Accès
Bouton **Filtres** depuis l'écran Explorer.

### Filtres disponibles

#### Localisation (multi-villes)
- Champ de recherche avec **autocomplétion** : au fur et à mesure de la saisie (délai 300 ms), des suggestions de villes apparaissent dans une liste déroulante
- Seules les villes possédant au moins un logement validé sont suggérées
- Sélection d'une ville → ajout sous forme de **pastille** (pill) en dessous du champ
- Plusieurs villes peuvent être ajoutées simultanément
- Chaque pastille possède un bouton ✕ pour la retirer
- La recherche porte sur toutes les villes sélectionnées (logique **OU** : un bien affiché si sa ville correspond à l'une des villes choisies)

#### Type de logement
- Liste de cases à cocher dynamique, chargée depuis l'API (`/api/biens/types`)
- Sélection multiple possible (logique **OU** entre les types)
- Indicateur de chargement pendant la récupération des types

#### Prix à la semaine
- Deux curseurs glissants (sliders) indépendants :
  - **Prix minimum** : de 0 à 3 000 €, pas de 50 €
  - **Prix maximum** : de 0 à 3 000 €, pas de 50 €
- Valeurs affichées en temps réel au-dessus de chaque slider
- Le filtre porte sur le prix minimum de la semaine disponible pour le bien

#### Disponibilité (calendrier)
- Calendrier mensuel plein format avec navigation mois par mois
- Sélection d'une **plage de dates** en deux taps :
  1. Premier tap → date de début (marquée en vert)
  2. Second tap → date de fin (plage colorée entre les deux dates)
- Un troisième tap réinitialise la sélection
- Les dates passées sont bloquées (non sélectionnables)
- Résumé de la période sélectionnée affiché sous le calendrier, avec bouton **Effacer**
- Un bien apparaît dans les résultats uniquement s'il n'a aucune réservation qui chevauche la période sélectionnée

#### Voyageurs
- Sélecteur numérique (nombre de personnes)
- Affiche uniquement les biens dont la capacité d'accueil est supérieure ou égale au nombre saisi

#### Note minimale
- Sélecteur ou slider de 0 à 5
- Filtre sur la note moyenne des commentaires publiés

#### Équipements
- Cases à cocher pour sélectionner les équipements souhaités
- Logique **ET** : un bien doit posséder **tous** les équipements cochés pour apparaître

### Compteur de résultats
- En bas du panneau, un compteur affiche le **nombre de biens correspondants** en temps réel
- Ce compteur se met à jour automatiquement 400 ms après chaque modification de filtre (debounce)

### Bouton Appliquer
- Un seul bouton **Appliquer** en bas du panneau
- Ferme le panneau et lance la recherche avec les filtres sélectionnés

### Réinitialisation
- Bouton **Réinitialiser** pour effacer tous les filtres actifs

---

## 5. Fonctionnalité : Détail d'un bien

### Description
Page de détail d'un logement, accessible depuis la liste Explorer ou la Recherche.

### Informations affichées
- Galerie de photos
- Nom et description complète du logement
- Type, surface, nombre de couchages
- Ville et adresse
- Note moyenne et liste des commentaires publiés
- Prix par semaine
- Équipements disponibles

### Actions disponibles
- **Mettre en favori** (utilisateur connecté requis)
- **Réserver** — ouverture d'un formulaire de réservation (utilisateur connecté requis)

> *Note : l'écran de détail est actuellement en cours de développement.*

---

## 6. Fonctionnalité : Recherche

### Description
Écran dédié à la recherche avancée de biens, accessible via l'onglet **Recherche**.

### Accès
Onglet **Recherche** (icône loupe), accessible sans connexion.

> *Note : l'écran de recherche est en cours de développement.*

---

## 7. Fonctionnalité : Favoris

### Description
Permet à un utilisateur connecté de sauvegarder des logements pour les retrouver facilement.

### Accès
Onglet **Favoris** (icône cœur).

### Permissions
- **Non connecté** : un écran d'invitation à la connexion est affiché (cadenas + bouton "Se connecter")
- **Connecté** : accès à la liste des favoris

### Comportement
- Ajout/retrait d'un favori depuis la page de détail d'un bien
- Liste des favoris affichée sous forme de cartes (même format que l'écran Explorer)

---

## 8. Fonctionnalité : Réservations (Voyages)

### Description
Historique et gestion des réservations effectuées par l'utilisateur connecté.

### Accès
Onglet **Voyages** (icône valise).

### Permissions
- **Non connecté** : écran d'invitation à la connexion
- **Connecté** : liste des réservations

### Informations par réservation
- Nom du logement réservé
- Dates de séjour (début / fin)
- Montant total
- Statut de la réservation

> *Note : l'écran de réservations est en cours de développement.*

---

## 9. Fonctionnalité : Profil utilisateur

### Description
Espace personnel de l'utilisateur, accessible via l'onglet **Profil**.

### Accès
Onglet **Profil** (icône personne), accessible sans connexion.

### Pour un visiteur non connecté
- Boutons "Se connecter" et "S'inscrire"

### Pour un utilisateur connecté
- Affichage du nom, prénom, email, photo de profil
- Bouton de déconnexion
- Accès aux **Notifications** (via navigation vers `NotificationsScreen`)

---

## 10. Fonctionnalité : Notifications

### Description
Centre de notifications de l'utilisateur (confirmations de réservation, messages, etc.).

### Accès
Depuis l'écran Profil → bouton Notifications (utilisateur connecté requis).

> *Note : l'écran de notifications est en cours de développement.*

---

## 11. Fonctionnalité : Connexion & Inscription

### Accès
- Depuis l'onglet Profil (boutons "Se connecter" / "S'inscrire")
- Depuis les écrans protégés (Favoris, Voyages) via le bouton de l'écran `AuthRequired`

### Connexion

**Champs requis :**
- Adresse e-mail
- Mot de passe

**Comportement :**
1. L'utilisateur saisit son email et son mot de passe
2. L'application envoie les credentials au serveur
3. En cas de succès : token JWT enregistré localement puis utilisé en Bearer sur les routes protégées
4. L'utilisateur est redirigé vers l'application connectée
5. En cas d'échec (mauvais identifiants) : message d'erreur affiché

### Inscription

**Champs requis :**
- Nom
- Prénom
- Adresse e-mail (unique)
- Mot de passe (minimum 6 caractères)

**Champs optionnels :**
- Numéro de téléphone

**Comportement :**
1. L'application vérifie que l'email n'est pas déjà utilisé
2. En cas de succès : token JWT enregistré, utilisateur automatiquement connecté, contexte global mis à jour immédiatement
3. En cas d'email déjà existant : message d'erreur `"Cet email est déjà utilisé"`

### Déconnexion
- Disponible depuis l'écran Profil
- Supprime le token JWT et le cache utilisateur locaux
- Redirige vers l'écran Profil non connecté

### Persistance de session
- La session est conservée entre les fermetures et réouvertures de l'application (token stocké en local)
- Les appels API protégés envoient automatiquement `Authorization: Bearer <token>`
- Au démarrage, si le token a expiré, la session est automatiquement terminée
- En cas de panne réseau au démarrage, le dernier profil mis en cache est utilisé (mode hors-ligne partiel)

---

## 12. Comportements transverses

### Gestion des erreurs
- Toute erreur réseau ou serveur affiche un **toast** (notification éphémère) avec le message d'erreur
- Les erreurs de validation (champs manquants) sont signalées directement dans les formulaires

### Chargement
- Un **indicateur de chargement** (spinner) est affiché pendant toute opération réseau
- Les listes utilisent un indicateur de chargement incrémental en bas de page

### Timeout réseau
- Toute requête vers l'API est automatiquement annulée après **10 secondes** sans réponse

### Multi-plateforme
- L'interface est identique sur iOS, Android et navigateur web
- Le stockage du token s'adapte à la plateforme (stockage sécurisé mobile, localStorage web)

---

## 13. Règles métier

| Règle | Détail |
|---|---|
| Biens affichés | Seuls les biens avec `statut_validation = 'valide'` sont visibles |
| Commentaires affichés | Seuls les commentaires avec `statut = 'publie'` sont comptabilisés dans la note |
| Note moyenne | Calculée via `AVG(note)`, affichée à 0 si aucun avis |
| Prix affiché | Prix minimum par semaine parmi les tarifs disponibles du bien |
| Disponibilité | Un logement est indisponible si une réservation existante chevauche la période demandée (condition : `date_debut_résa < date_fin_demandée AND date_fin_résa > date_debut_demandée`) |
| Capacité | Le filtre voyageurs filtre sur `nb_couchage >= N` |
| Équipements | Logique ET : tous les équipements sélectionnés doivent être présents |
| Villes | Autocomplétion : uniquement les villes ayant au moins un bien validé, 10 suggestions maximum |
| Mot de passe | Minimum 6 caractères, haché avec bcrypt (coût 10) côté serveur |
| Token JWT | Durée de validité : 7 jours |
| Pagination | Maximum 50 biens par page (limite de sécurité serveur) |

---

## 14. Addendum — Correctifs livrés (Mars 2026)

Cette section décrit les correctifs et fonctionnalités effectivement livrés pendant l'intervention, avec le périmètre impacté.

| Lot | Résultat fonctionnel | Concerné |
|---|---|---|
| CORS + routage API Apache | Les appels API web ne sont plus bloqués par CORS et les routes `/api/*` sont bien résolues vers l'API PHP | API HTTP, navigateur web, configuration Apache, `.htaccess` |
| Suppression des doublons CORS | Plus d'erreur navigateur sur les en-têtes `Access-Control-Allow-Origin` en double | API PHP, middleware CORS, navigateur web |
| Persistance de session | La session utilisateur reste active entre relances (dans la limite de validité JWT) | Authentification, démarrage app, navigation conditionnelle |
| Flux de connexion corrigé | Après login, l'utilisateur est correctement considéré connecté et redirigé vers l'app | Écran Connexion, contexte `useAuth`, navigation |
| Flux d'inscription corrigé | Après inscription, l'utilisateur est connecté immédiatement sans rechargement manuel | `RegisterScreen`, `useAuth`, `AppNavigator` |
| Réservation complète (issue #16) | Un utilisateur connecté peut sélectionner des dates, calculer un tarif, réserver et voir une confirmation | Écran Détail bien, Écran Réservation, Écran Confirmation, onglet Voyages |
| Données de test | Un jeu de test SQL est disponible et importable pour valider les parcours principaux | Base MySQL `goodnight`, API PHP, scénarios QA |
| Correctif token 401 | Les routes protégées (`/auth/me`, `/reservations`, etc.) acceptent correctement le Bearer token | Auth API PHP, middleware auth, Apache rewrite |
| Stabilisation web images | Réduction des erreurs web liées aux images locales manquantes (`/uploads/...`) | Rendu image web, Home/Détail/Réservations |

### Détail des parcours utilisateur impactés

| Parcours | Comportement attendu après correctif | Concerné |
|---|---|---|
| Connexion | Login valide => accès immédiat aux onglets protégés et persistance de session | `LoginScreen`, `useAuth`, `AppNavigator` |
| Inscription | Register valide => connexion immédiate et accès direct à l'app connectée | `RegisterScreen`, `useAuth`, `AppNavigator` |
| Réservation | Sélection de dates valide => calcul de prix => création réservation => écran confirmation | `BienDetailScreen`, `ReservationScreen`, `ConfirmationScreen`, `/api/reservations` |
| Voyages | Les réservations de l'utilisateur connecté sont listées avec infos de séjour et total | `ReservationsScreen`, `reservationsService`, `/api/reservations` |
| Favoris/Routes protégées | Les routes nécessitant auth n'échouent plus à tort avec "Token manquant" | `auth_middleware.php`, `.htaccess`, client HTTP |

### Limites connues (non bloquantes)

- Certains warnings web affichés en dev proviennent de dépendances tierces (`react-navigation` stack et `react-native-calendars`) et non du code métier Goodnight.
- Les photos locales historiques en base (`/uploads/...`) peuvent être absentes du serveur local; un fallback applicatif évite maintenant les erreurs bloquantes côté web.