# SPEC FONCTIONNELLE CORRECTIFS — 19 Mars 2026
## Corrections Métier & User Experience

**Version**: 1.1  
**Date**: 19 Mars 2026  
**Statut**: ✅ Complété  
**Type**: Spécification Fonctionnelle (métier, workflows, user journey)

---

## 📋 Table des Matières

1. [Correctif #1 — Inscription Auto-Login](#correctif-1--inscription-auto-login)
2. [Correctif #2 — Persistance JWT et Bearer automatique](#correctif-2--persistance-jwt-et-bearer-automatique)
3. [User Journeys](#user-journeys)
4. [Acceptance Criteria](#acceptance-criteria)

---

## Correctif #1 — Inscription Auto-Login

### 🎯 User Story

**En tant que** nouvel utilisateur  
**Je veux** être immédiatement connecté après créer mon compte  
**Afin que** je puisse accéder directement à l'app sans étapes additionnelles

### ❌ Situation Actuelle (BUG)

```
Utilisateur remplit formulaire d'inscription
     ↓
Clique "Créer mon compte"
     ↓
API crée le compte ✅
     ↓
Écran RegisterScreen reçoit la réponse
     ↓
appelle authService.register() DIRECTEMENT
     ↓
❌ Contexte global AuthContext.user reste NULL
     ↓
❌ Navigation échoue ou utilisateur reste non-authentifié
     ↓
❌ Utilisateur obligé de recharger l'app
```

**Impact Utilisateur**:
- 🔴 Expérience frustante (création de compte échoue visiblement)
- 🔴 Confiance réduite (l'app semble "buguée")
- 🔴 Friction augmentée (rechargement nécessaire)

### ✅ Solution (FIX)

```
Utilisateur remplit formulaire d'inscription
     ↓
Clique "Créer mon compte"
     ↓
API crée le compte ✅
     ↓
Écran RegisterScreen reçoit la réponse
     ↓
appelle useAuth().register() via contexte
     ↓
✅ useAuth() met à jour AuthContext.user
     ↓
✅ isAuthenticated = true
     ↓
✅ Navigation automatique vers HomeScreen
     ↓
✅ Utilisateur voit immédiatement l'app
     ↓
✅ Session persiste même après fermeture de l'app (JWT stocké)
```

**Impact Utilisateur**:
- 🟢 Expérience fluide (signup → login → home en 3 secondes)
- 🟢 Cohérence (même pattern que Login)
- 🟢 Zéro friction post-inscription

### 📊 Comportement Avant/Après

| Étape | Avant | Après |
|-------|-------|-------|
| **1. Inscription réussie** | ✅ Compte créé | ✅ Compte créé |
| **2. JWT stocké** | ✅ Oui | ✅ Oui |
| **3. useAuth() mis à jour** | ❌ Non | ✅ Oui |
| **4. isAuthenticated** | `false` | `true` |
| **5. Navigation** | ❌ Échoue / Redirect | ✅ HomeScreen |
| **6. Fermer l'app** | ❌ Session perdue | ✅ Session persiste |
| **7. Rouvrir l'app** | ❌ Non-connecté | ✅ Connecté |

### 🎬 User Journey Complète

```
┌─────────────────────────────────────────────────────────────┐
│ 1. REGISTER_SCREEN - Remplissage formulaire                │
│    - Prénom: Alice                                           │
│    - Nom: Dupont                                             │
│    - Email: alice@goodnight.test                             │
│    - Password: secretpass123                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓ click "Créer mon compte"
┌──────────────────────────────────────────────────────────────┐
│ 2. API POST /auth/register (success)                        │
│    Response: { token: "abc...", user: {...} }              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ↓ useAuth().register() called
┌──────────────────────────────────────────────────────────────┐
│ 3. CONTEXT UPDATE                                            │
│    - AuthContext.user = { id: 42, email: "alice@...", ... } │
│    - AuthContext.isAuthenticated = true                     │
│    - JWT stored in localStorage/SecureStore                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ↓ Navigation via AppNavigator
┌──────────────────────────────────────────────────────────────┐
│ 4. REDIRECT TO HOME_SCREEN                                  │
│    - User sees: Biens list, search, navigation tabs         │
│    - onRegisterSuccess() callback triggered                 │
└──────────────────────────────────────────────────────────────┘
```

### ✋ Cas d'Erreur Géré

Si la création de compte échoue (email déjà existant, validation erreur):

```
POST /auth/register → 400/409 Error
     ↓
catch block attrape l'erreur
     ↓
setError(getErrorMessage(e))
     ↓
ErrorToast affiche le message
     ↓
Utilisateur peut corriger et réessayer
```

---

## Correctif #2 — Persistance JWT et Bearer automatique

### 🎯 Problème Métier

Un utilisateur pouvait être connecté visuellement, mais certaines actions protégées (ex: reservation) pouvaient echouer si le token n'etait pas transporte de maniere fiable en Bearer.

### ✅ Solution

Le token JWT est:
- Sauvegarde localement des le login/register
- Reutilise automatiquement sur les appels proteges via `Authorization: Bearer <token>`
- Supprime localement si le serveur retourne `401` (session invalide)

### 📊 Comportement Avant/Apres

| Etape | Avant | Apres |
|---|---|---|
| Persistance token | Partielle selon parcours | Uniforme login + register |
| Appels proteges | Risque d'appel sans Bearer | Bearer automatique sur routes protegees |
| Reservation connectee | Peut echouer a tort | Flux stable si token valide |
| Session invalide | Etat parfois ambigu | Nettoyage token et retour etat non connecte |

---

## User Journeys

### Journey 1: New User Registration (Fixed)

```
START: User opens app
   ↓
SCREEN: LoginScreen (no token yet)
   ↓ click "Créer un compte"
SCREEN: RegisterScreen
   ↓ fills form:
     - Prénom: Alice
     - Nom: Dupont
     - Email: alice@goodnight.test
     - Password: ***
   ↓ click "Créer mon compte"
LOADING: handleRegister() via useAuth()
   ↓
API: POST /api/auth/register
   ↓ (success 201)
CONTEXT: AuthContext.user = Alice
CONTEXT: isAuthenticated = true
   ↓
NAVIGATION: → HomeScreen
END: User sees biens list, fully logged in
```

### Journey 2: Returning User (Unchanged)

```
START: App reopens
   ↓
HOOK: useAuth() → useEffect checks stored JWT
   ↓
API: GET /api/auth/me (JWT sent)
   ↓ (success 200)
CONTEXT: AuthContext.user = Alice (hydrated from cache or API)
CONTEXT: isAuthenticated = true
   ↓
NAVIGATION: → HomeScreen (skips LoginScreen)
END: User navigates as before
```

### Journey 3: Reservation as Authenticated User (Fixed)

```
START: User is logged in (token saved)
     ↓
SCREEN: BienDetailScreen
     ↓ click "Reserver"
SCREEN: ReservationScreen
     ↓ select dates + tariff calculation
API: POST /api/reservations with Authorization: Bearer <token>
     ↓
SUCCESS: 201 reservation created
     ↓
NAVIGATION: ConfirmationScreen
END: User receives reservation confirmation
```

### Journey 4: Cancel Reservation (New)

```
START: User is logged in and viewing ReservationsScreen
     ↓
SCREEN: ReservationsScreen
     ↓ sees list of existing reservations with "Annuler" button
INTERACTION: User clicks "Annuler" button on reservation card
     ↓
DIALOG: Confirmation modal appears
     Message: "Confirmer l'annulation de [BIEN] du [DATE] au [DATE]?"
     Buttons: [Non] [Oui, annuler]
     Note: Sur Web, confirmation via popup native du navigateur
     ↓
BRANCH 1: User clicks "Non"
     ↓ Dialog closes, nothing happens
     
BRANCH 2: User clicks "Oui, annuler"
     ↓ Loading spinner shows on button
API: DELETE /api/reservations/:id with Authorization: Bearer <token>
     ↓
SUCCESS: 200 "Réservation annulée"
     ↓
STATE: Remove reservation card from FlatList
     ↓
TOAST: "Réservation annulée" (success notification)
     ↓
BACKEND: Notifications created for both:
       - Locataire: "Votre réservation a été annulée"
       - Propriétaire: "Une réservation sur votre bien a été annulée"
     ↓
END: User sees updated list without cancelled reservation
```

---

## Acceptance Criteria

### Correctif #1 — RegisterScreen Auto-Login

```gherkin
Scénario: Inscription crée et connecte l'utilisateur
  Étant donné que je suis sur RegisterScreen
  Quand je remplis le formulaire correctement
  Et je clique "Créer mon compte"
  Alors l'API crée le compte (201)
  Et le contexte AuthContext.user est mis à jour
  Et isAuthenticated devient true
  Et je suis redirigé vers HomeScreen
  Et la session persiste après app restart

Scénario: Inscription échoue
  Étant donné que je suis sur RegisterScreen
  Quand je remplis un email déjà existant
  Et je clique "Créer mon compte"
  Alors l'API retourne 409
  Et un message d'erreur s'affiche
  Et je reste sur RegisterScreen
  Et je peux corriger et réessayer
```

### Correctif #2 — Persistance JWT et Bearer

```gherkin
Scénario: Action protégée avec token valide
     Étant donné que je suis connecté
     Et que mon token est stocké localement
     Quand je crée une réservation
     Alors la requête envoie Authorization Bearer automatiquement
     Et l'API retourne 201 si les dates sont disponibles

Scénario: Session expirée
     Étant donné que mon token est expiré
     Quand j'appelle une route protégée
     Alors l'API retourne 401
     Et l'application supprime le token local
     Et je repasse en état non connecté
```

### Correctif #3 — Annulation de Réservation

```gherkin
Scénario: Locataire annule sa réservation
     Étant donné que je suis connecté en tant que locataire
     Et que j'ai une réservation en cours
     Quand je vois ReservationsScreen
     Et je clique le bouton "Annuler" sur une carte de réservation
     Alors une dialog de confirmation s'affiche
     Et je clique "Oui, annuler"
     Alors l'API reçoit DELETE /reservations/:id avec Bearer token
     Et la réservation est supprimée (soft delete statut='annulee')
     Et la carte disparaît de la liste
     Et une notification de confirmation s'affiche
     Et le propriétaire reçoit une notification d'annulation

Scénario: Propriétaire annule une réservation sur son bien
     Étant donné que je suis connecté en tant que propriétaire
     Et qu'un locataire a une réservation sur mon bien
     Quand je vois ReservationsScreen
     Et je clique "Annuler" sur la réservation
     Alors le même flux s'applique
     Et la réservation est annulée
     Et le locataire reçoit notification d'annulation
     Et moi je reçois une notification de confirmation

Scénario: Annulation échoue - utilisateur non autorisé
     Étant donné que je suis connecté
     Et que je n'ai aucun lien avec la réservation (ni locataire ni propriétaire)
     Quand j'appelle DELETE /reservations/:id
     Alors l'API retourne 403 Forbidden
     Et une toast d'erreur s'affiche
     Et la carte reste visible pour retry

Scénario: Annulation échoue - réservation inexistante
     Étant donné que je clique "Annuler"
     Et que la réservation a déjà été supprimée
     Quand DELETE /reservations/:id est appelé
     Alors l'API retourne 404
     Et une toast "Réservation non trouvée" s'affiche

Scénario: Annulation échoue - déjà annulée
     Étant donné que je suis connecté
     Et que la réservation est déjà au statut "annulée"
     Quand DELETE /reservations/:id est appelé
     Alors l'API retourne 409
     Et un message "Réservation déjà annulée" est affiché
```

---

## Checklist Métier

- [x] Bug RegisterScreen identifié
- [x] Solution proposée (useAuth hook)
- [x] User journey documentée
- [x] Acceptance criteria définie
- [x] Règles Bearer token documentées
- [x] Annulation réservation — Feature ajoutée (Journey 4 + DELETE)
- [x] Scénarios gherkin annulation documentés
- [ ] Tests UAT en staging
- [ ] Validation métier avant prod
- [ ] Validation bout-en-bout réservation connectée (create + cancel)

---

## Références Liées

- [SPEC_FONCTIONNELLE.md](SPEC_FONCTIONNELLE.md) — Spec métier complète
- [SPEC_TECHNIQUE.md](SPEC_TECHNIQUE.md) — Spec technique détaillée
- [SPEC_TECHNIQUE_20260319.md](SPEC_TECHNIQUE_20260319.md) — Voir côté technique réservation (incl. section 10 - annulation)

