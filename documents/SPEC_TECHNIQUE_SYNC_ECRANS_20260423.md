# Spec Technique — Synchronisation instantanée des écrans
**Feature :** Rafraîchissement automatique au focus + polling background  
**Date :** 2026-04-23  
**Stack :** React Native / Expo SDK 54 / PHP 8

---

## 1. Fichiers concernés

| Fichier | Rôle |
|---|---|
| `src/hooks/useScreenFocus.ts` | Hook central de déclenchement au focus |
| `src/screens/HomeScreen.tsx` | Refresh au focus + polling 20 s |
| `src/screens/SearchScreen.tsx` | Refresh au focus |
| `src/screens/MapScreen.tsx` | Refresh au focus + polling 15 s |

---

## 2. Hook `useScreenFocus`

### Problème résolu
`useFocusEffect` + `useCallback([callback])` provoque une boucle infinie si `callback` est recrée à chaque render (setState → re-render → nouveau callback → nouvel effet → setState → ...).

### Solution — pattern `ref`
```typescript
// src/hooks/useScreenFocus.ts
import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export function useScreenFocus(callback: (() => void | Promise<void>) | null) {
  // 1. Stocke la dernière version du callback dans une ref
  const callbackRef = useRef<typeof callback>(callback);

  // 2. Met à jour la ref à chaque render, SANS déclencher useFocusEffect
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 3. L'effet de focus a un tableau de dépendances vide → ne se ré-enregistre jamais
  //    Il appelle toujours la version à jour via la ref
  useFocusEffect(
    useCallback(() => {
      if (callbackRef.current) {
        callbackRef.current();
      }
    }, []) // [] stable → zéro boucle
  );
}
```

**Pourquoi ça fonctionne :**
- La `ref` est mutée silencieusement (pas de re-render).
- `useFocusEffect` ne voit jamais de dépendance changer → il ne se ré-exécute qu'à un vrai changement de focus.
- La callback exécutée est toujours la plus récente grâce à `callbackRef.current`.

---

## 3. Intégration — `HomeScreen`

### Refresh au focus
```typescript
const refreshNow = useCallback(async () => {
  setRefreshing(true);
  await fetchBiens(activeFilters, true);  // reset = true → repart de la page 1
  setRefreshing(false);
  setLivePendingCount(0);                 // remet le badge à zéro
}, [activeFilters, fetchBiens]);

useScreenFocus(refreshNow);
// refreshNow est stable (useCallback avec deps explicites) → pas de boucle
```

### Snapshot pour comparaison de polling
```typescript
const biensRef = useRef<Bien[]>([]);

useEffect(() => {
  biensRef.current = biens;
}, [biens]);
// Permet de comparer sans que le setInterval dépende de l'état biens
```

### Polling 20 secondes
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    // Guard : ne poll pas si l'app est en arrière-plan ou si un chargement est en cours
    if (AppState.currentState !== 'active' || loading || loadingMore) return;

    const next = await apiFetch<Bien[]>(`/biens?${buildParams(activeFilters, 1, user?.id_locataire)}`);
    const current = biensRef.current;

    // Comparaison par longueur et identifiants
    const hasChanged =
      next.length !== current.length ||
      next.some((b, idx) => b.id_biens !== current[idx]?.id_biens);

    if (!hasChanged) return;

    const currentIds = new Set(current.map(b => b.id_biens));
    const addedCount = next.reduce((acc, b) => acc + (currentIds.has(b.id_biens) ? 0 : 1), 0);
    setLivePendingCount(addedCount || 1);  // badge, pas de rechargement auto
  }, 20_000);

  return () => clearInterval(interval);
}, [activeFilters, loading, loadingMore, user?.id_locataire]);
```

---

## 4. Intégration — `SearchScreen`

### runSearch — mémorisé
```typescript
const runSearch = useCallback(async (
  text: string,
  activeFilters: SearchFilters,
  showSpinner = true
) => {
  if (showSpinner) setLoading(true);
  const data = await biensService.getAll({
    search: text.trim() || undefined,
    ...activeFilters,
    exclude_owner_id: user?.id_locataire,
    limit: 25,
  });
  setBiens(data);
  setLoading(false);
}, [user?.id_locataire]);
```

### Callback de focus
```typescript
const handleScreenFocus = useCallback(() => {
  // Ne relance pas si aucun résultat (premier affichage géré par useEffect initial)
  if (biens.length > 0) {
    runSearch(query, filters, false); // false = sans spinner
  }
}, [biens.length, query, filters, runSearch]);

useScreenFocus(handleScreenFocus);
```

### Recherche réactive (debounce 350 ms)
```typescript
useEffect(() => {
  const timer = setTimeout(() => runSearch(query, filters), 350);
  return () => clearTimeout(timer);
}, [query, filters, user?.id_locataire]);
```

---

## 5. Intégration — `MapScreen`

### Snapshot pour comparaison
```typescript
const biensRef = useRef<Bien[]>([]);
useEffect(() => { biensRef.current = biens; }, [biens]);
```

### loadBiens
```typescript
async function loadBiens(forceRefresh = false) {
  if (forceRefresh) setRefreshing(true);
  const biensData = await biensService.getAll({ limit: 80, exclude_owner_id: user?.id_locataire });
  setBiens(biensData);
  setPendingBiens(null);     // vide le tampon de nouveaux biens
  setPendingNewCount(0);     // remet le badge à zéro
  setLoading(false);
  if (forceRefresh) setRefreshing(false);
}
```

### Callback de focus
```typescript
const handleScreenFocus = useCallback(() => {
  loadBiens(false); // sans spinner, rechargement silencieux
}, [user?.id_locataire]);

useScreenFocus(handleScreenFocus);
```

### Polling 15 secondes
```typescript
function countNewBiens(current: Bien[], next: Bien[]): number {
  const ids = new Set(current.map(b => b.id_biens));
  return next.reduce((acc, b) => acc + (ids.has(b.id_biens) ? 0 : 1), 0);
}

async function checkForNewBiens() {
  const next = await biensService.getAll({ limit: 80, exclude_owner_id: user?.id_locataire });
  const current = biensRef.current;
  const hasChanged =
    next.length !== current.length ||
    next.some((b, idx) => b.id_biens !== current[idx]?.id_biens);
  if (!hasChanged) return;
  setPendingBiens(next);                           // stocké, pas appliqué
  setPendingNewCount(countNewBiens(current, next)); // badge
}

useEffect(() => {
  const interval = setInterval(() => {
    if (AppState.currentState === 'active') checkForNewBiens();
  }, 15_000);
  return () => clearInterval(interval);
}, [user?.id_locataire]);
```

---

## 6. Tableau récapitulatif

| Écran | Hook focus | Polling | Intervalle | Badge |
|---|---|---|---|---|
| HomeScreen | `useScreenFocus(refreshNow)` | Oui | 20 s | `livePendingCount` |
| SearchScreen | `useScreenFocus(handleScreenFocus)` | Non | — | — |
| MapScreen | `useScreenFocus(handleScreenFocus)` | Oui | 15 s | `pendingNewCount` |

---

## 7. Guard anti-boucle — règles à respecter lors d'une extension

1. La fonction passée à `useScreenFocus` **doit** être stable ou enveloppée dans `useCallback`.
2. Les dépendances de `useCallback` ne doivent **jamais** inclure un état modifié par la callback elle-même.
3. Utiliser `useRef` pour accéder à des valeurs d'état à jour dans les `setInterval` sans les ajouter aux dépendances.
