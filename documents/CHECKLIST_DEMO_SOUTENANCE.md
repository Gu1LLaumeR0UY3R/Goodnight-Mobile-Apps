# Checklist demo soutenance

## Avant la soutenance
- API demarree
- base de donnees accessible
- comptes de test prets (locataire, proprietaire, admin/back-office)
- jeu de donnees present (biens, reservations, notifications)
- smartphone/emulateur + version web verifies

## Demo technique minimum
### A. Auth
- inscription ou login reussi
- persistance session apres relance
- logout

### B. Locataire
- recherche + filtres
- ajout/suppression favori
- creation reservation
- affichage voyages

### C. Proprietaire
- acces Mes biens
- ajout/modification bien
- ajout photo
- ajout blocage
- confirmation/refus reservation recue

### D. Securite
- tentative acces ecran protege sans connexion
- tentative acces ecran proprietaire avec compte locataire
- montrer comportement RequireAuth/RequireRole

### E. Robustesse
- montrer gestion erreur (ex: reseau coupe)
- mentionner ErrorBoundary global

## Elements a montrer au jury (fichiers)
- DOSSIER_SOUTENANCE_BTS.md
- ARCHITECTURE_GLOBALE_APP_API_BDD.md
- STRATEGIE_CACHE_ET_SYNCHRO.md
- PLAN_ORAL_SOUTENANCE_10_MIN.md

## Arguments forts a dire explicitement
- Deux clients differents consomment la meme API.
- Les regles metier et la securite sont centralisees cote serveur.
- Le front est type et structure (services/hooks/guards), pas un prototype monolithique.
