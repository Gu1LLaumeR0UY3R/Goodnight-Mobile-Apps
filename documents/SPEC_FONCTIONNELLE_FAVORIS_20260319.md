# SPEC FONCTIONNELLE FAVORIS - 19 Mars 2026
## Experience utilisateur et regles metier

**Version**: 1.0  
**Date**: 19 Mars 2026  
**Statut**: Implemente  
**Type**: Specification fonctionnelle ciblee (favoris)

---

## Table des matieres

1. [Perimetre](#1-perimetre)
2. [Objectif metier](#2-objectif-metier)
3. [Regles fonctionnelles](#3-regles-fonctionnelles)
4. [Parcours utilisateur](#4-parcours-utilisateur)
5. [Cas d'erreur et messages](#5-cas-derreur-et-messages)
6. [Acceptance criteria](#6-acceptance-criteria)

---

## 1. Perimetre

Cette specification couvre uniquement:
- L'ajout d'un bien en favoris via l'icone coeur
- Le retrait d'un bien des favoris
- L'acces rapide au detail d'un bien depuis l'ecran Favoris

Hors perimetre:
- Algorithme de recommandation
- Tri avance des favoris
- Notifications push dediees aux favoris

---

## 2. Objectif metier

Permettre a un utilisateur connecte de memoriser des biens preferes pour y revenir rapidement sans refaire une recherche complete.

Valeur utilisateur:
- Gain de temps sur la navigation
- Constitution d'une short-list de biens
- Reduction de la friction avant reservation

---

## 3. Regles fonctionnelles

1. Seul un utilisateur authentifie peut gerer ses favoris.
2. Au clic sur l'icone coeur d'un bien:
   - si le bien n'est pas en favoris: il est ajoute
   - si le bien est deja en favoris: il est retire
3. Un meme bien ne peut pas etre ajoute deux fois dans les favoris du meme utilisateur.
4. L'onglet Favoris affiche uniquement les favoris de l'utilisateur connecte.
5. Chaque favori donne un acces rapide au detail du bien (tap sur la carte).
6. L'utilisateur peut retirer un favori directement depuis l'ecran Favoris.

---

## 4. Parcours utilisateur

### Journey 1: Ajout en favoris depuis Explorer

```text
START: Utilisateur connecte sur Explorer
   ↓
Voit un bien dans la liste
   ↓
Clique sur l'icone coeur
   ↓
Le coeur devient rempli (etat favori)
   ↓
Le bien est enregistre dans ses favoris
END
```

### Journey 2: Retrait depuis Explorer

```text
START: Utilisateur connecte sur Explorer
   ↓
Bien deja en favoris (coeur rempli)
   ↓
Clique sur l'icone coeur
   ↓
Le coeur redevient contour
   ↓
Le bien est retire des favoris
END
```

### Journey 3: Consultation des favoris

```text
START: Utilisateur ouvre onglet Favoris
   ↓
Affichage de la liste des biens favoris
   ↓
Clique sur une carte
   ↓
Navigation vers ecran detail du bien
END
```

### Journey 4: Retrait depuis l'ecran Favoris

```text
START: Utilisateur sur onglet Favoris
   ↓
Clique sur l'icone retrait (coeur retire)
   ↓
Le bien disparait de la liste
END
```

---

## 5. Cas d'erreur et messages

- Non connecte: redirection vers l'ecran de connexion lors d'une tentative d'ajout/retrait.
- Erreur reseau/API: message d'erreur utilisateur et conservation de l'etat precedent.
- Favori deja existant (doublon): l'API retourne un conflit (409), le front reste coherent.

---

## 6. Acceptance criteria

```gherkin
Scenario: Ajouter un bien en favoris
  Etant donne que je suis connecte
  Quand je clique sur le coeur d'un bien non favori
  Alors le bien est ajoute a mes favoris
  Et l'icone coeur passe a l'etat actif

Scenario: Retirer un favori depuis Explorer
  Etant donne que je suis connecte
  Et que le bien est deja en favoris
  Quand je clique sur le coeur
  Alors le bien est retire de mes favoris
  Et l'icone coeur repasse a l'etat inactif

Scenario: Acces rapide depuis onglet Favoris
  Etant donne que je suis connecte
  Et que j'ai au moins un favori
  Quand j'ouvre l'onglet Favoris
  Et je clique sur un favori
  Alors je suis redirige vers le detail de ce bien

Scenario: Utilisateur non connecte
  Etant donne que je ne suis pas connecte
  Quand je clique sur le coeur d'un bien
  Alors je suis redirige vers la connexion
```
