# Spec Fonctionnelle — Synchronisation instantanée des écrans
**Feature :** Rafraîchissement automatique des données au retour sur un écran  
**Date :** 2026-04-23  
**Acteurs :** Locataire, Propriétaire (tous utilisateurs)

---

## 1. Objectif

Garantir que les données affichées dans l'application sont à jour dès que l'utilisateur revient sur un écran, sans qu'il ait à tirer manuellement pour rafraîchir. En complément, détecter les nouvelles annonces en arrière-plan et en notifier l'utilisateur via un badge.

---

## 2. Écrans concernés

| Écran | Déclencheur | Comportement |
|---|---|---|
| `HomeScreen` | Retour sur l'onglet | Rechargement silencieux de la liste avec les filtres actifs |
| `SearchScreen` | Retour sur l'onglet | Relance de la recherche courante (si résultats déjà présents) |
| `MapScreen` | Retour sur l'onglet | Rechargement silencieux des markers |

---

## 3. Rafraîchissement au focus

### Comportement commun
- Chaque écran surveille la navigation : quand il repasse au **premier plan** (l'utilisateur change d'onglet ou revient en arrière), un rechargement est déclenché automatiquement.
- Le rechargement est **silencieux** (pas de spinner de chargement initial, pas de flash d'écran vide).
- Le rechargement ne se déclenche **qu'une fois** au retour sur l'écran, pas en boucle.

### Cas particulier — SearchScreen
- Si la liste est **vide** (premier affichage), le rafraîchissement au focus ne se déclenche pas (le chargement initial gère déjà ce cas).
- Si la liste contient des résultats, la même recherche est relancée avec les mêmes filtres.

---

## 4. Polling automatique en arrière-plan

### HomeScreen — toutes les 20 secondes
- Pendant que l'app est **active** (au premier plan), l'écran sonde l'API toutes les 20 secondes.
- Si de nouveaux biens ont été publiés :
  - Un badge **"X nouveau(x)"** apparaît dans la barre supérieure.
  - La liste n'est **pas** rechargée automatiquement (pour ne pas perturber la navigation).
  - Un bouton **"Rafraîchir"** permet à l'utilisateur d'appliquer les changements quand il le souhaite.
- Le badge est remis à zéro après un rafraîchissement manuel.
- Si l'app passe en arrière-plan (autre app ouverte), le polling se met en pause.

### MapScreen — toutes les 15 secondes
- Même principe : détection silencieuse des nouveaux biens.
- Un badge **"X nouveaux biens disponibles"** s'affiche sur la carte.
- Un bouton **"Charger"** permet d'appliquer les changements.
- Les markers ne se déplacent pas automatiquement (pour ne pas désorienter l'utilisateur qui navigue sur la carte).

---

## 5. Rafraîchissement manuel (pull-to-refresh)

En plus du rafraîchissement automatique, l'utilisateur peut à tout moment **tirer vers le bas** sur la liste pour forcer un rechargement complet.

---

## 6. Contraintes
- Le polling **s'arrête** quand l'app passe en arrière-plan.
- Le polling **ne démarre pas** si un chargement est déjà en cours.
- Si une requête de polling échoue (réseau coupé), l'erreur est ignorée silencieusement — le polling reprend au prochain intervalle.
