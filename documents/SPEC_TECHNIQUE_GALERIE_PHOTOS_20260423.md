# Spec Technique — Gestion multi-photos
**Feature :** Galerie photos d'un bien (ajout, suppression, photo principale)  
**Date :** 2026-04-23  
**Stack :** React Native / Expo SDK 54 / PHP 8 / MySQL

---

## 1. Fichiers concernés

| Fichier | Rôle |
|---|---|
| `src/screens/GalerieBienScreen.tsx` | Écran de gestion de la galerie |
| `src/services/biensService.ts` | Méthodes photos |
| `src/types/models.ts` | Interface `Photo` |
| `php-api/routes/biens.php` | Endpoints photos |
| `php-api/patches/2026-04-23_add_id_photo_pk.sql` | Migration : clé primaire photos |
| `php-api/patches/2026-04-23_add_is_principal_to_photos.sql` | Migration : champ is_principal |

---

## 2. Migrations SQL

Ces deux migrations sont **prérequises** avant tout appel aux endpoints photos.

```sql
-- 2026-04-23_add_id_photo_pk.sql
ALTER TABLE photos
  ADD COLUMN id_photo INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;

-- 2026-04-23_add_is_principal_to_photos.sql
ALTER TABLE photos
  ADD COLUMN is_principal BOOLEAN NOT NULL DEFAULT 0;
```

---

## 3. Interface TypeScript

```typescript
// models.ts
interface Photo {
  id_photo: number;
  lien_photo: string;
  is_principal: boolean;
}
```

---

## 4. Services

```typescript
// biensService.ts

// Lister les photos
getPhotos(id: number): Promise<Photo[]>
// → GET /biens/:id/photos

// Ajouter une photo par URL
addPhoto(id: number, lienPhoto: string): Promise<{ id_photo: number; message: string }>
// → POST /biens/:id/photos  corps: { lien_photo: string, is_principal: false }

// Supprimer une photo
deletePhoto(id: number, photoId: number): Promise<{ message: string }>
// → DELETE /biens/:id/photos/:photoId

// Définir la photo principale
setPhotoAsFirst(id: number, photoId: number): Promise<{ message: string }>
// → PUT /biens/:id/photos/:photoId

// Uploader un fichier local
uploadPhoto(fileUri: string): Promise<{ path: string; message: string }>
// → POST /biens/upload-photo  multipart/form-data, champ: "photo"
```

---

## 5. Composant — `GalerieBienScreen`

### Props (via React Navigation)
```typescript
route.params: {
  bienId: number;
  bienTitle: string;
}
```

### État local
```typescript
const [photos, setPhotos]   = useState<Photo[]>([]);
const [loading, setLoading] = useState(true);
const [addMode, setAddMode] = useState<'url' | 'local' | null>(null);
const [urlInput, setUrlInput] = useState('');
const [adding, setAdding]   = useState(false);
const [error, setError]     = useState<string | null>(null);
```

### Chargement au focus
```typescript
useFocusEffect(
  useCallback(() => { loadPhotos(); }, [loadPhotos])
);

const loadPhotos = useCallback(async () => {
  setLoading(true);
  const rows = await biensService.getPhotos(bienId);
  setPhotos(rows);
  setLoading(false);
}, [bienId]);
```

### Ajout par URL
```typescript
async function addPhotoByUrl() {
  const result = await biensService.addPhoto(bienId, url);
  setPhotos(prev => [...prev, { id_photo: result.id_photo, lien_photo: url, is_principal: false }]);
  // Pas de rechargement complet : mise à jour locale
}
```

### Upload local (galerie / caméra)
```typescript
async function pickAndUpload(source: 'library' | 'camera') {
  // 1. Demande permission si besoin
  const perm = source === 'library'
    ? await ImagePicker.requestMediaLibraryPermissionsAsync()
    : await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) { setError('Autorisez...'); return; }

  // 2. Ouvre le picker
  const result = source === 'library'
    ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true })
    : await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true });

  if (result.canceled || !result.assets?.[0]?.uri) return;

  // 3. Upload multipart
  const uploaded = await biensService.uploadPhoto(result.assets[0].uri);

  // 4. Enregistre en BDD
  const added = await biensService.addPhoto(bienId, uploaded.path);
  setPhotos(prev => [...prev, { id_photo: added.id_photo, lien_photo: uploaded.path, is_principal: false }]);
}
```

### Suppression
```typescript
async function handleDeletePhoto(photo: Photo) {
  Alert.alert('Supprimer la photo', 'Cette photo sera supprimée définitivement.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await biensService.deletePhoto(bienId, photo.id_photo);
        setPhotos(prev => prev.filter(p => p.id_photo !== photo.id_photo));
    }},
  ]);
}
```

### Photo principale
```typescript
async function handleSetPrincipal(photo: Photo) {
  await biensService.setPhotoAsFirst(bienId, photo.id_photo);
  setPhotos(prev => prev.map(p => ({ ...p, is_principal: p.id_photo === photo.id_photo })));
}
```

---

## 6. Endpoints PHP

### `GET /biens/:id/photos`
```sql
SELECT id_photo, lien_photo, is_principal
FROM photos
WHERE id_biens = ?
ORDER BY id_photo ASC
```
- Auth + ownership requis
- Retourne `Photo[]`

### `POST /biens/:id/photos`
- Auth + ownership requis
- Corps JSON : `{ "lien_photo": "..." }`
```sql
INSERT INTO photos (id_biens, lien_photo) VALUES (?, ?)
```
- `201` → `{ "id_photo": N, "message": "Photo ajoutée" }`

### `DELETE /biens/:id/photos/:photoId`
- Auth + ownership requis
```sql
DELETE FROM photos WHERE id_photo = ? AND id_biens = ?
```
- `200` → `{ "message": "Photo supprimée" }`
- `404` si `rowCount() === 0`

### `PUT /biens/:id/photos/:photoId` — Photo principale
- Auth + ownership requis
- **Transaction** :
```sql
-- 1. Réinitialise toutes les photos du bien
UPDATE photos SET is_principal = 0 WHERE id_biens = ?

-- 2. Définit la cible
UPDATE photos SET is_principal = 1 WHERE id_photo = ? AND id_biens = ?
-- Si rowCount() === 0 → ROLLBACK + 404

COMMIT
```
- `200` → `{ "message": "Photo définie comme principale" }`

### `POST /biens/upload-photo`
- Auth requise (pas de vérification ownership car pas de bien associé à ce stade)
- Reçoit un fichier multipart nommé `photo`

**Validations :**
| Contrôle | Règle |
|---|---|
| Présence fichier | `$_FILES['photo']` doit exister |
| Code d'erreur upload | Doit être `UPLOAD_ERR_OK` |
| Fichier réel | `is_uploaded_file($tmpName)` doit être true |
| Taille | 0 < size ≤ 8 Mo (8 388 608 octets) |
| Type MIME réel | `mime_content_type()` : `image/jpeg`, `image/png`, `image/webp` uniquement |

**Génération du fichier :**
```php
$ext      = $allowed[$mime];           // jpg / png / webp
$filename = 'bien_' . $ownerId . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
$dest     = __DIR__ . '/../uploads/' . $filename;
move_uploaded_file($tmpName, $dest);
```
- `201` → `{ "path": "/uploads/bien_1_abc123def456.jpg", "message": "Photo uploadée avec succès" }`

---

## 7. Upload côté client — construction du FormData

```typescript
// biensService.ts — uploadPhoto()
const filename = fileUri.split('/').pop() || `photo_${Date.now()}.jpg`;
const ext  = filename.toLowerCase().split('.').pop();
const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

const formData = new FormData();
formData.append('photo', { uri: fileUri, name: filename, type: mime } as any);

return apiUpload<{ path: string; message: string }>('/biens/upload-photo', formData);
// apiUpload envoie avec Content-Type: multipart/form-data + Authorization: Bearer
```

---

## 8. Navigation

```typescript
// MyBiensScreen.tsx
navigation.navigate('GalerieBien', { bienId: item.id_biens, bienTitle: item.designation_bien })

// AppNavigator.tsx — ProfileStack
<Stack.Screen name="GalerieBien" component={GalerieBienScreen} />
```
