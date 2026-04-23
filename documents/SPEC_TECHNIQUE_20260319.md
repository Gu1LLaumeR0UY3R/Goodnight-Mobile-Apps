# SPEC TECHNIQUE RESERVATION BIEN — 19 Mars 2026
## Disponibilites, calcul tarifaire, validation et creation de reservation

**Version**: 1.2  
**Date**: 19 Mars 2026  
**Statut**: Implemente  
**Type**: Specification technique ciblee (reservation uniquement)

---

## Table des matieres

1. [Perimetre](#1-perimetre)
2. [Composants techniques impliques](#2-composants-techniques-impliques)
3. [Contrat disponibilites](#3-contrat-disponibilites)
4. [Contrat calcul tarifaire](#4-contrat-calcul-tarifaire)
5. [Contrat creation reservation](#5-contrat-creation-reservation)
6. [Regles de validation serveur](#6-regles-de-validation-serveur)
7. [Logique frontend ReservationScreen](#7-logique-frontend-reservationscreen)
8. [Cas de test techniques](#8-cas-de-test-techniques)
9. [Fichiers concernes](#9-fichiers-concernes)
10. [Contrat annulation reservation](#10-contrat-annulation-reservation)

---

## 1. Perimetre

Cette specification couvre uniquement:
- La consultation des disponibilites d'un bien
- Le calcul du tarif pour une plage de sejour
- La validation et la creation d'une reservation

---

## 2. Composants techniques impliques

Backend PHP:
- `php-api/routes/biens.php` (disponibilites + tarif)
- `php-api/routes/reservations.php` (creation + validations)
- `php-api/core/auth_middleware.php` (auth JWT pour route protegee)

Frontend React Native:
- `src/screens/ReservationScreen.tsx` (selection dates + soumission)
- `src/screens/ConfirmationScreen.tsx` (accuse de creation)
- `src/services/reservationsService.ts` (appel POST reservation)

---

## 3. Contrat disponibilites

Endpoint:
- `GET /api/biens/:id/disponibilites`

Objectif:
- Retourner les plages a bloquer dans le calendrier client.

Reponse attendue:

```json
{
  "success": true,
  "data": [
    { "date_debut": "2026-07-10", "date_fin": "2026-07-17", "type": "reservation" },
    { "date_debut": "2026-08-03", "date_fin": "2026-08-10", "type": "blocage" }
  ]
}
```

Sources de donnees:
- Table `reservations`
- Table `blocages` (si disponible)

Interpretation date (regle cle):
- Une plage occupe les nuits dans l'intervalle semi-ouvert `[date_debut, date_fin[`.
- Le jour `date_fin` est le jour de depart et n'est pas marque comme nuit occupee.

---

## 4. Contrat calcul tarifaire

Endpoint:
- `GET /api/biens/:id/tarif?debut=YYYY-MM-DD&fin=YYYY-MM-DD`

Parametres:
- `debut` obligatoire
- `fin` obligatoire
- Condition: `fin > debut`

Formules:
- $nb_nuits = fin - debut$
- $semaines = \lfloor nb_nuits / 7 \rfloor$
- $nuits_extra = nb_nuits \bmod 7$
- $prix_nuit = round(prix_semaine / 7, 2)$
- $total = round((semaines \times prix_semaine) + (nuits_extra \times prix_nuit), 2)$

Exemple reponse:

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

---

## 5. Contrat creation reservation

Endpoint protege:
- `POST /api/reservations`

Header obligatoire:
- `Authorization: Bearer <jwt>`

Payload entrant:

```json
{
  "id_biens": 6,
  "date_debut": "2026-07-12",
  "date_fin": "2026-07-22",
  "id_tarif": 19
}
```

Reponse succes:

```json
{
  "success": true,
  "data": {
    "id_reservation": 154,
    "message": "Reservation creee"
  }
}
```

Codes de sortie:
- `201` reservation creee
- `400` payload invalide
- `401` token manquant/invalide
- `403` tentative de reserver son propre bien
- `404` bien non trouve/non valide
- `409` dates en conflit (reservation ou blocage)

---

## 6. Regles de validation serveur

Ordre d'execution recommande (backend):
1. Verifier presence champs requis
2. Verifier format date + contrainte `date_fin > date_debut`
3. Verifier existence du bien et statut `valide`
4. Verifier que l'utilisateur n'est pas proprietaire du bien
5. Verifier non-chevauchement avec reservations existantes
6. Verifier non-chevauchement avec blocages proprietaire
7. Inserer reservation
8. Inserer notification proprietaire (best effort)

Regle SQL de chevauchement:

```text
Conflit si A.date_debut < B.date_fin
      ET A.date_fin   > B.date_debut
```

Cette formule couvre:
- chevauchement partiel gauche
- chevauchement partiel droit
- inclusion totale
- egalite stricte d'une borne exclue correctement

---

## 7. Logique frontend ReservationScreen

Modes de selection:
- `single`: un clic reserve automatiquement 1 nuit `[J, J+1]`
- `range`: deux clics selectionnent `[debut, fin]`

Comportements attendus:
- Les dates passees sont non selectionnables
- Les dates bloquees (reservations + blocages) sont disablees
- Un bouton de reinitialisation nettoie la selection et le tarif
- Le calcul de tarif est relance a chaque plage valide

Regle de blocage client:
- Le controle de disponibilite suit la meme convention semi-ouverte `[debut, fin[`.
- Une arrivee le jour exact d'une fin de sejour existante est autorisee.

Flux de soumission:
1. Verifier `date_debut`, `date_fin`, `id_tarif`
2. Appeler `POST /api/reservations` avec Bearer token
3. En cas de succes, naviguer vers `ConfirmationScreen`
4. En cas d'erreur 409, afficher indisponibilite

---

## 8. Cas de test techniques

Disponibilites:
- `GET /biens/:id/disponibilites` retourne au moins une plage `reservation` si donnees existantes
- Plage retournee avec `date_fin` non incluse comme nuit bloquee

Tarif:
- 7 nuits exactes: `semaines=1`, `nuits_extra=0`
- 10 nuits: `semaines=1`, `nuits_extra=3`
- Total coherent avec `prix_semaine`

Reservation:
- Token absent: `401`
- Bien invalide: `404`
- Proprietaire reserve son bien: `403`
- Dates chevauchantes: `409`
- Plage libre: `201` et `id_reservation` present

UI:
- Mode `single` produit automatiquement `date_fin = date_debut + 1`
- Mode `range` fonctionne en 2 taps
- Reset efface dates + marquage + tarif

---

## 9. Fichiers concernes

- `php-api/routes/biens.php`
- `php-api/routes/reservations.php`
- `php-api/core/auth_middleware.php`
- `src/screens/ReservationScreen.tsx`
- `src/screens/ConfirmationScreen.tsx`
- `src/services/reservationsService.ts`
- `src/types/reservation.ts`

---

## 10. Contrat annulation reservation

### Endpoint protege:
- `DELETE /api/reservations/:id`

### Header obligatoire:
- `Authorization: Bearer <jwt>`

### Parametres:
- `id` (URL param): identifiant numerique de la reservation

### Reponse succes (200):

```json
{
  "message": "Réservation annulée"
}
```

### Codes de sortie:
- `200` annulation reussite
- `409` reservation deja annulee
- `403` utilisateur n'est ni locataire ni proprietaire
- `404` reservation non trouvee
- `500` erreur base de donnees

### Logique serveur:

1. **Authentification**: Verifier token Bearer present et valide
2. **Fetch**: Recuperer reservation + bien associe
3. **Permission**: Verifier que l'utilisateur auth est:
   - Soit le locataire (id_utilisateur = user.id)
   - Soit le proprietaire du bien
4. **Suppression**:
  - Detection du schema (`SHOW COLUMNS ... LIKE 'statut'`)
  - Si colonne `statut` presente: soft delete `UPDATE reservations SET statut = 'annulee'`
  - Si colonne absente: hard delete `DELETE FROM reservations`
  - Si deja annulee: retour `409`
5. **Notifications**:
   - Insert notification pour locataire: `"Votre réservation du [DATES] a été annulée"`
   - Insert notification pour proprietaire: `"Une réservation pour [BIEN] du [DATES] a été annulée"`
   - Best effort (pas de blocage si echec)

### Logique frontend (ReservationsScreen):

1. Afficher bouton "Annuler" sur chaque carte de reservation
2. Au clic:
  - Mobile natif: `Alert.alert` de confirmation
  - Web: `confirm()` pour garantir l'execution du callback
  - Message: `"Confirmer l'annulation de [BIEN] du [DATE] au [DATE]?"`
3. Si utilisateur confirme:
   - Call `DELETE /reservations/:id` via `reservationsService.cancel(id)`
   - Loading state sur le bouton (spinner)
4. Si succes:
   - Retirer carte de la liste (FlatList)
   - Toast: `"Réservation annulée"`
5. Si erreur:
   - Alert: `"Erreur: [message]"`
   - Card reste visible pour retry

### Service TypeScript:

```typescript
async cancel(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/reservations/${id}`, 'DELETE');
}
```

### Cas de test techniques:

- **401 non-auth**: `DELETE /reservations/1` sans header Bearer
- **403 permission**: Utilisateur non-owner annule reservation d'un autre
- **404 inexistant**: `DELETE /reservations/99999`
- **409 deja annulee**: `DELETE /reservations/:id` sur reservation deja annulee
- **200 succes locataire**: Locataire annule sa propre reservation
- **200 succes proprietaire**: Proprietaire annule une reservation sur son bien
- **Notification**: Verifier deux notifications creees (locataire + proprietaire)

Compatibilite schema:
- Table `reservations` avec colonne `statut`: reservation annulee non retournee dans la liste
- Table `reservations` sans colonne `statut`: annulation par suppression physique
