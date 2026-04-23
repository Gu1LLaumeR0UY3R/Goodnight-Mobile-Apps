# Spec Fonctionnelle — Gestion multi-photos
**Feature :** Galerie photos d'un bien (ajout, suppression, photo principale)  
**Date :** 2026-04-23  
**Acteur :** Propriétaire authentifié

---

## 1. Objectif

Permettre à un propriétaire de gérer toutes les photos de son bien : les consulter, en ajouter depuis une URL ou depuis son téléphone (galerie/caméra), en supprimer, et définir laquelle est la photo principale (affichée en avant dans les listes et fiches).

---

## 2. Accès

```
Onglet Profil → Mes biens → bouton [Photos] (icône images) sur une carte de bien
```

---

## 3. Affichage de la galerie

- Les photos sont affichées en **grille à 2 colonnes**.
- Un compteur "X photo(s)" est visible en en-tête.
- Chaque photo affiche deux boutons superposés :
  - **Étoile** (haut gauche) : définir comme photo principale.
  - **Poubelle** (haut droit) : supprimer.
- La photo principale porte une **étoile dorée** et un badge **"Principale"** visible en bas.

---

## 4. Ajout d'une photo

Un bouton **"Ajouter une photo"** est visible en permanence au-dessus de la grille.

### 4.1 Mode URL
1. Appuyer sur "Ajouter une photo".
2. Sélectionner l'onglet **URL**.
3. Saisir une URL (ex. `https://...`).
4. Appuyer sur **OK**.
5. La photo apparaît immédiatement dans la grille.

### 4.2 Mode Locale
1. Appuyer sur "Ajouter une photo".
2. Sélectionner l'onglet **Locale**.
3. Choisir la source :
   - **Galerie** → ouvre la bibliothèque de photos du téléphone.
   - **Caméra** → ouvre l'appareil photo.
4. L'application demande l'autorisation si elle n'a pas encore été accordée.
5. L'utilisateur sélectionne ou prend une photo.
6. La photo est uploadée, puis apparaît dans la grille.

### 4.3 Annulation
- Un bouton **×** ferme la zone d'ajout sans rien enregistrer.

---

## 5. Suppression d'une photo

1. Appuyer sur l'icône **poubelle**.
2. Une alerte de confirmation s'affiche :
   - **Annuler** → rien ne se passe.
   - **Supprimer** (bouton rouge) → la photo est supprimée et disparaît immédiatement de la grille.

---

## 6. Photo principale

1. Appuyer sur l'icône **étoile** d'une photo.
2. L'étoile de la photo choisie devient **dorée**.
3. Les étoiles des autres photos redeviennent vides.
4. Cette photo sera affichée :
   - Dans la liste des biens (`HomeScreen`, `SearchScreen`, `MapScreen`).
   - En première position dans la fiche détail (`BienDetailScreen`).

---

## 7. États et messages d'erreur

| Situation | Message affiché |
|---|---|
| URL vide à la validation | "Entrez une URL valide" |
| Permission galerie refusée | "Autorisez l'accès aux photos" |
| Permission caméra refusée | "Autorisez la caméra" |
| Échec de l'upload | "Impossible d'uploader la photo" |
| Échec de la suppression | "Impossible de supprimer la photo" |
| Échec du chargement initial | Message d'erreur avec possibilité de réessayer |

---

## 8. Contraintes métier
- Un propriétaire ne peut gérer **que les photos de ses propres biens**.
- Il n'y a **pas de limite** au nombre de photos par bien.
- Une seule photo peut être **principale** à la fois.
- Supprimer la photo principale ne désigne **pas** automatiquement une nouvelle principale.
