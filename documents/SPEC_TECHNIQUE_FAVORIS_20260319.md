# SPEC TECHNIQUE FAVORIS - 19 Mars 2026
## Contrats API, logique frontend et controle d'etat

**Version**: 1.0  
**Date**: 19 Mars 2026  
**Statut**: Implemente  
**Type**: Specification technique ciblee (favoris)

---

## Table des matieres

1. [Perimetre](#1-perimetre)
2. [Composants techniques impliques](#2-composants-techniques-impliques)
3. [Contrats API favoris](#3-contrats-api-favoris)
4. [Regles backend](#4-regles-backend)
5. [Logique frontend Explorer](#5-logique-frontend-explorer)
6. [Logique frontend FavoritesScreen](#6-logique-frontend-favoritesscreen)
7. [Gestion des erreurs](#7-gestion-des-erreurs)
8. [Cas de test techniques](#8-cas-de-test-techniques)
9. [Fichiers concernes](#9-fichiers-concernes)

---

## 1. Perimetre

Cette specification couvre:
- API de consultation/ajout/suppression de favoris
- Interaction coeur sur cartes de biens
- Ecran de listing des favoris avec acces detail

---

## 2. Composants techniques impliques

Backend PHP:
- php-api/routes/favoris.php
- php-api/core/auth_middleware.php
- php-api/core/helpers.php

Frontend React Native:
- src/services/favorisService.ts
- src/screens/HomeScreen.tsx
- src/screens/FavoritesScreen.tsx
- src/navigation/AppNavigator.tsx

---

## 3. Contrats API favoris

### GET /api/favoris

- Auth requis: oui (Bearer)
- Reponse 200: liste des biens favoris de l'utilisateur courant

Exemple:

```json
{
  "success": true,
  "data": [
    {
      "id_biens": 12,
      "designation_bien": "Villa Azure",
      "ville_nom": "Nice",
      "photo_principale": "uploads/photos/villa.jpg"
    }
  ]
}
```

### POST /api/favoris

- Auth requis: oui
- Body JSON:

```json
{ "id_biens": 12 }
```

- Reponses:
  - 200: favori ajoute
  - 409: deja en favori

### DELETE /api/favoris/:id_biens

- Auth requis: oui
- Reponses:
  - 200: favori retire
  - 404: favori introuvable

---

## 4. Regles backend

1. Identification utilisateur par JWT (id_locataire).
2. Isolation des donnees: toutes les operations sont filtrees par id_locataire.
3. Prevention des doublons:
   - verification existence avant insertion
   - retour 409 si doublon
4. Suppression ciblee par paire (id_locataire, id_biens).

---

## 5. Logique frontend Explorer

Ecran: HomeScreen

1. Charger les favoris utilisateur connecte (set d'identifiants).
2. Sur chaque carte:
   - afficher coeur plein si id_biens present dans le set
   - afficher coeur contour sinon
3. Au clic coeur:
   - non connecte: navigation Login
   - connecte: toggle favori (add/remove)
4. Strategie UI:
   - update optimiste de l'etat local
   - rollback en cas d'echec API
   - loader sur l'icone pendant la requete
5. Le clic coeur n'ouvre pas la fiche detail (stopPropagation).

---

## 6. Logique frontend FavoritesScreen

1. Chargement des favoris au focus de l'ecran.
2. Etats supportes:
   - loading
   - erreur + retry
   - vide
   - liste
3. Interaction carte:
   - tap carte: navigation vers detail du bien
   - tap bouton retrait: suppression du favori
4. Apres suppression:
   - retrait local de la carte sans rechargement complet

---

## 7. Gestion des erreurs

- Les erreurs API sont mappees via utilitaire frontend central.
- En cas d'echec add/remove:
  - message utilisateur
  - etat local restaure si operation optimiste

---

## 8. Cas de test techniques

API:
- GET /favoris sans token -> 401
- POST /favoris avec id valide -> 200
- POST /favoris doublon -> 409
- DELETE /favoris/:id existant -> 200
- DELETE /favoris/:id non existant -> 404

Frontend:
- Coeur actif/inactif coherent apres refresh
- Clic coeur non connecte -> ecran Login
- Clic coeur connecte -> update immediate + persistance serveur
- Ecran Favoris vide affiche l'etat empty
- Clic carte favori ouvre BienDetail

---

## 9. Fichiers concernes

- php-api/routes/favoris.php
- src/services/favorisService.ts
- src/screens/HomeScreen.tsx
- src/screens/FavoritesScreen.tsx
- src/navigation/AppNavigator.tsx
