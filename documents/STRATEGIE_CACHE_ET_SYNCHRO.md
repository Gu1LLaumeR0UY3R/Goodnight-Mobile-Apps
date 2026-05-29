# Strategie cache et synchronisation des donnees

## Objectif
Documenter clairement le comportement de cache/refetch pour la soutenance BTS et faciliter une migration future vers React Query.

## Strategie actuelle

### 1. Session utilisateur
- Token JWT persiste localement (SecureStore mobile, localStorage web).
- Au demarrage: verification /auth/me.
- En cas de panne reseau: fallback sur profil local cache.
- En cas de 401: invalidation de session et nettoyage du token.

### 2. Donnees metier ecrans
- Rafraichissement au focus d'ecran (Home/Search/Map) via hook dedie.
- Polling intelligent:
  - Home: 20 s
  - Map: 15 s
- Le polling ne force pas un rerender agressif:
  - detection des nouveaux elements
  - affichage d'un badge
  - rafraichissement sur action utilisateur

### 3. Etats UI standards
Pour chaque ecran critique:
- loading
- erreur
- vide
- donnees

## Contrat de cache
- Source de verite: API serveur.
- Cache local: optimisation UX seulement.
- Ecriture metier (reservation, favoris, edition): priorite serveur puis mise a jour locale.

## Evolution recommandee (prochaine etape)
Migrer vers TanStack Query:
- query keys par ressource (biens, reservations, favoris)
- staleTime explicite
- invalidation automatique apres mutation
- retries et refetchOnWindowFocus controles

## Hooks de couche logique deja poses
- useBiens: chargement/erreur/refetch des biens
- useReservations: chargement/annulation/refetch des reservations

Ces hooks servent de tremplin vers React Query sans refactor massif.
