# Plan oral soutenance (10 minutes)

## 0:00 - 1:00 | Introduction
- presentation rapide du besoin
- contexte: application location + back-office
- objectif: systeme multi-clients coherent et securise

## 1:00 - 2:30 | Architecture globale
- montrer le schema: app mobile + back-office -> API -> BDD
- insister sur la centralisation des regles metier

## 2:30 - 4:30 | Parcours fonctionnel cle
- locataire: recherche -> detail -> reservation
- proprietaire: mes biens -> blocages/photos -> reservations recues
- admin: validation/refus annonces (back-office)

## 4:30 - 6:30 | Securite
- JWT Bearer
- ownership et roles
- anti-conflits reservation
- routes protegees RequireAuth/RequireRole

## 6:30 - 8:00 | Qualite logicielle
- typage fort TypeScript (ApiResponse<T>, fetchApi<T>)
- separation logique/UI (services + hooks)
- ErrorBoundary global

## 8:00 - 9:00 | Demonstration rapide
- login
- navigation vers ecran protege
- tentative acces role non autorise
- action reussie avec bon role

## 9:00 - 10:00 | Bilan et ouverture
- ce qui est termine
- ce qui est prevu (React Query, tests automatisees)
- valeur BTS: architecture client/serveur reelle avec 2 clients sur meme API

## Questions probables jury (preparees)
1. Pourquoi centraliser la securite dans l'API et pas dans le front?
2. Comment garantissez-vous qu'un proprietaire ne modifie pas un bien d'un autre?
3. Quel est l'interet de fetchApi<T> et ApiResponse<T>?
4. Quelle difference entre cache local et source de verite serveur?
5. Comment testeriez-vous RequireRole?
