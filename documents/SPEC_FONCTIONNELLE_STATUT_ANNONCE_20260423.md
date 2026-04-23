# Spec Fonctionnelle — Statut de validation d'une annonce
**Feature :** Affichage du statut et motif de refus  
**Date :** 2026-04-23  
**Acteur :** Propriétaire authentifié

---

## 1. Objectif

Permettre à un propriétaire de connaître à tout moment l'état de validation de chacun de ses biens (brouillon, en attente, validé, refusé) et de consulter le motif communiqué par un administrateur en cas de refus.

---

## 2. Accès

```
Onglet Profil → Mes biens → badge de statut sur chaque carte
```

---

## 3. Statuts possibles

| Valeur interne | Libellé affiché | Fond | Texte |
|---|---|---|---|
| `en_attente` | En attente | Jaune clair | Brun foncé |
| `valide` | Validé ✓ | Vert clair | Vert foncé |
| `refuse` | Refusé | Rouge clair | Rouge foncé |

---

## 4. Badge de statut (sur la liste)

- Le badge coloré est visible sur chaque carte de bien dans **Mes biens**.
- Il est **cliquable**.
- Si un motif de refus est renseigné, une icône **ℹ** s'affiche à droite du libellé pour signaler qu'une information supplémentaire est disponible.

---

## 5. Ordre d'affichage des biens

Les biens dans "Mes biens" sont triés ainsi :
1. **En attente** en premier (action potentielle nécessaire)
2. **Validés** ensuite
3. **Refusés** en dernier

---

## 6. Modal de détail (au clic sur le badge)

Une fenêtre modale s'ouvre avec :

### 6.1 En-tête
- Titre : "Statut de l'annonce"
- Bouton × pour fermer

### 6.2 Zone de statut
- Fond coloré correspondant au statut
- Libellé centré en gras

### 6.3 Motif de refus *(visible uniquement si statut = refusé ET motif non vide)*
- Encadré rouge avec bordure gauche rouge foncée
- Titre : "Motif du refus :"
- Texte complet du motif administrateur

### 6.4 Message contextuel
Un message d'explication adapté au statut :
- *Validé* → "Votre annonce est en ligne et visible par les locataires."
- *En attente* → "Votre annonce est en cours de validation. Cela peut prendre quelques jours."
- *Refusé* → "Votre annonce a été refusée. Vous pouvez la modifier et la soumettre à nouveau."

### 6.5 Bouton "Fermer"
Bouton noir pleine largeur en bas de la modale.

---

## 7. Contraintes métier
- Le motif de refus est renseigné **uniquement par un administrateur** via back-office.
- Un propriétaire ne peut **pas** modifier le statut de son bien lui-même.
- Modifier un bien refusé **ne remet pas** automatiquement son statut à `en_attente` (c'est une décision de l'admin).
