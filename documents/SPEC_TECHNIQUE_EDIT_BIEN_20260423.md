# Spec Technique — Édition d'un bien
**Feature :** Édition complète d'un bien existant  
**Date :** 2026-04-23  
**Stack :** React Native / Expo SDK 54 / PHP 8 / MySQL

---

## 1. Fichiers concernés

| Fichier | Rôle |
|---|---|
| `src/screens/EditBienScreen.tsx` | Écran de formulaire d'édition |
| `src/services/biensService.ts` | Méthode `update()` |
| `src/types/models.ts` | Interface `Bien`, `CommuneOption` |
| `php-api/routes/biens.php` | Endpoint `PUT /biens/:id` |

---

## 2. Composant — `EditBienScreen`

### Props (via React Navigation)
```typescript
route.params.bien: Bien  // Le bien à modifier, passé par MyBiensScreen
```

### État local
```typescript
const [designation, setDesignation]   = useState(bien.designation_bien ?? '');
const [rue, setRue]                   = useState(bien.rue_biens ?? '');
const [complement, setComplement]     = useState(bien.complement_biens ?? '');
const [description, setDescription]  = useState(bien.description_biens ?? '');
const [superficie, setSuperficie]     = useState(String(bien.superficie_biens ?? ''));
const [nbCouchage, setNbCouchage]     = useState(String(bien.nb_couchage ?? ''));
const [prixSemaine, setPrixSemaine]   = useState(String(Math.round(bien.prix_semaine_min ?? 0)));
const [animaux, setAnimaux]           = useState(Boolean(bien.animaux_biens));
const [types, setTypes]               = useState<TypeBien[]>([]);
const [selectedType, setSelectedType] = useState<number | null>(bien.id_TypeBien ?? null);
const [selectedCommune, setSelectedCommune] = useState<CommuneOption | null>(...);
const [loading, setLoading]           = useState(false);
const [error, setError]               = useState<string | null>(null);
```

### Chargement des types au montage
```typescript
useEffect(() => {
  apiFetch<TypeBien[]>('/biens/types')
    .then(setTypes)
    .finally(() => setLoadingTypes(false));
}, []);
```

### Autocomplete commune — debounce 250 ms
```typescript
const communeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  const q = communeQuery.trim();
  // Guard : ne pas relancer si la valeur correspond déjà à la commune sélectionnée
  if (selectedCommune && q === `${selectedCommune.ville_nom} (${selectedCommune.ville_code_postal})`) return;
  if (communeTimerRef.current) clearTimeout(communeTimerRef.current);
  if (q.length < 2) { setCommuneOptions([]); return; }
  communeTimerRef.current = setTimeout(async () => {
    const rows = await biensService.searchCommunes(q);
    setCommuneOptions(rows);
  }, 250);
  return () => { if (communeTimerRef.current) clearTimeout(communeTimerRef.current); };
}, [communeQuery, selectedCommune]);
```

### Validation et soumission
```typescript
function parsePositiveNum(value: string): number | null {
  const num = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}

async function handleSubmit() {
  // Validations locales → setError() si KO
  await biensService.update(bien.id_biens, {
    designation_bien: designation.trim(),
    rue_biens: rue.trim(),
    complement_biens: complement.trim() || undefined,
    superficie_biens: superficieValue,
    description_biens: description.trim() || undefined,
    animaux_biens: animaux,
    nb_couchage: couchageValue,
    id_TypeBien: selectedType,
    id_commune: selectedCommune.id_commune,
    prix_semaine: prixValue,
  });
  navigation.goBack();
}
```

---

## 3. Interface TypeScript

```typescript
// biensService.ts
interface UpdateBienPayload {
  designation_bien: string;
  rue_biens: string;
  complement_biens?: string;
  superficie_biens: number;
  description_biens?: string;
  animaux_biens: boolean;
  nb_couchage: number;
  id_TypeBien: number;
  id_commune: number;
  prix_semaine: number;
}

// models.ts
interface CommuneOption {
  id_commune: number;
  ville_nom: string;
  ville_code_postal: string;
}
```

---

## 4. Service

```typescript
// biensService.ts
async update(id: number, data: UpdateBienPayload): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/biens/${id}`, 'PUT', data);
}
```
→ `apiFetch` ajoute automatiquement le header `Authorization: Bearer <token>` et sérialise le corps en JSON.

---

## 5. Endpoint PHP : `PUT /biens/:id`

### Route matching
```php
if ($method === 'PUT' && $param1 !== null && ctype_digit((string) $param1) && $param2 === null)
```

### Auth & ownership
```php
$payload = requireAuth();           // Vérifie JWT, retourne le payload
$ownerId = (int) $payload['id_locataire'];
requireOwnedBien($pdo, $bienId, $ownerId);
// SELECT * FROM biens WHERE id_biens = ?
// → 404 si introuvable, 403 si id_locataire ≠ ownerId
```

### Validation serveur
- `designation_bien` et `rue_biens` : non vides après `trim()` → 400
- `superficie_biens` et `nb_couchage` : cast `(int)`, doit être > 0 → 400
- `id_TypeBien` et `id_commune` : cast `(int)`, doit être > 0 → 400
- `prix_semaine` : cast `(float)`, doit être > 0 → 400

### Transaction SQL
```sql
-- 1. Mise à jour du bien
UPDATE biens
SET designation_bien = ?, rue_biens = ?, complement_biens = ?,
    superficie_biens = ?, description_biens = ?, animaux_biens = ?,
    nb_couchage = ?, id_TypeBien = ?, id_commune = ?
WHERE id_biens = ?

-- 2a. Si tarif sans saison existe
UPDATE tarifs SET prix_semaine = ?
WHERE id_biens = ? AND id_saison IS NULL

-- 2b. Sinon
INSERT INTO tarifs (id_biens, annee, id_saison, prix_semaine)
VALUES (?, YEAR(NOW()), NULL, ?)

COMMIT / ROLLBACK
```

### Réponses HTTP
| Code | Cas |
|---|---|
| `200` | `{ "message": "Bien mis à jour avec succès" }` |
| `400` | Champ manquant ou valeur invalide |
| `401` | Token absent, expiré ou malformé |
| `403` | Le bien appartient à un autre propriétaire |
| `404` | `id_biens` introuvable en base |
| `500` | Exception PDO |

---

## 6. Navigation

```typescript
// MyBiensScreen.tsx
navigation.navigate('EditBien', { bien: item })

// AppNavigator.tsx — ProfileStack
<Stack.Screen name="EditBien" component={EditBienScreen} />
```
