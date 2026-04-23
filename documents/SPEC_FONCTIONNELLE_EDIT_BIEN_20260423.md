# Spec Fonctionnelle — Édition d'un bien
**Feature :** Édition complète d'un bien existant  
**Date :** 2026-04-23  
**Acteur :** Propriétaire authentifié

---

## 1. Objectif

Permettre à un propriétaire de modifier toutes les informations descriptives et tarifaires d'un bien qu'il possède, sans recréer l'annonce.

---

## 2. Accès

```
Onglet Profil → Mes biens → bouton [Modifier] (icône crayon) sur une carte de bien
```

---

## 3. Écran d'édition

### 3.1 Pré-remplissage
À l'ouverture, tous les champs sont initialisés avec les valeurs actuelles du bien :
- Nom, adresse, complément, description
- Superficie, nombre de couchages, prix/semaine
- Switch animaux acceptés
- Type de bien sélectionné
- Commune affichée sous la forme `NomVille (CodePostal)`

### 3.2 Champs du formulaire

| Champ | Saisie | Validation |
|---|---|---|
| Nom du bien | Texte libre | Requis, non vide |
| Rue | Texte libre | Requis, non vide |
| Complément | Texte libre | Optionnel |
| Description | Zone multiligne | Optionnel |
| Superficie (m²) | Numérique | Requis, > 0 |
| Couchages | Numérique entier | Requis, > 0 |
| Prix/semaine (€) | Numérique décimal | Requis, > 0 |
| Animaux acceptés | Switch on/off | Défaut = valeur existante |
| Type de bien | Liste déroulante | Requis |
| Commune | Autocomplete | Requis |

### 3.3 Autocomplete commune
1. L'utilisateur tape dans le champ commune.
2. Après **250 ms** sans frappe, une recherche est envoyée à l'API.
3. Une liste de suggestions s'affiche (max 12 résultats) avec nom et code postal.
4. L'utilisateur sélectionne une commune → le champ affiche `NomVille (CodePostal)`.
5. Si le texte est identique à la commune déjà sélectionnée, aucune recherche n'est lancée.
6. La recherche commence à partir de **2 caractères** minimum.

### 3.4 Types de bien
- Chargés depuis l'API au montage de l'écran.
- Affichés en liste de boutons sélectionnables.
- Un seul type sélectionnable à la fois.

---

## 4. Validation et soumission

### 4.1 Validation locale (avant envoi)
Les erreurs sont affichées via un toast rouge en bas d'écran :
- Nom ou rue vide → "Nom du bien et adresse requis"
- Aucun type sélectionné → "Choisissez un type de bien"
- Aucune commune sélectionnée → "Choisissez une commune"
- Superficie, couchages ou prix invalides → "Superficie, couchages et prix/semaine doivent être valides"

### 4.2 Soumission
1. L'utilisateur appuie sur **Sauvegarder**.
2. Un indicateur de chargement s'affiche sur le bouton.
3. La requête est envoyée à l'API.

### 4.3 Résultats
| Cas | Comportement |
|---|---|
| Succès | Retour automatique vers la liste Mes biens |
| Erreur API | Toast rouge avec le message d'erreur, l'écran reste ouvert |
| Réseau indisponible | Toast rouge générique, l'écran reste ouvert |

---

## 5. Contraintes métier
- Un propriétaire ne peut modifier **que ses propres biens** (contrôle serveur).
- La modification d'un bien déjà validé ne change **pas** son statut (il reste validé).
- La modification ne déclenche **pas** de nouvelle validation administrative.
