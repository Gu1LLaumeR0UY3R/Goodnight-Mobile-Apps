# Spec Technique — Statut de validation d'une annonce
**Feature :** Affichage du statut et motif de refus  
**Date :** 2026-04-23  
**Stack :** React Native / Expo SDK 54 / PHP 8 / MySQL

---

## 1. Fichiers concernés

| Fichier | Rôle |
|---|---|
| `src/components/StatusBadge.tsx` | Composant badge + modale de détail |
| `src/screens/MyBiensScreen.tsx` | Intégration du badge |
| `src/types/models.ts` | Champ `motif_refus` sur interface `Bien` |
| `php-api/patches/2026-04-23_add_motif_refus_to_biens.sql` | Migration BDD |
| `php-api/routes/biens.php` | Tri dans `GET /biens/mine` |

---

## 2. Migration SQL

```sql
-- php-api/patches/2026-04-23_add_motif_refus_to_biens.sql
ALTER TABLE biens
  ADD COLUMN motif_refus TEXT NULL DEFAULT NULL
  COMMENT 'Motif de refus de validation (rempli si statut_validation = refuse)';
```

À exécuter **une seule fois** sur la base de données goodnight.

---

## 3. Interface TypeScript

```typescript
// models.ts — ajout sur l'interface Bien existante
interface Bien {
  // ...champs existants...
  statut_validation: 'en_attente' | 'valide' | 'refuse'; // existant
  motif_refus?: string | null;                            // nouveau
}
```

---

## 4. Composant `StatusBadge`

### Props
```typescript
interface StatusBadgeProps {
  bien: Bien;
}
```

### Logique de couleur
```typescript
const getStatusColor = (status: Bien['statut_validation']) => {
  switch (status) {
    case 'valide':     return { bg: '#dcfce7', color: '#166534', label: 'Validé ✓' };
    case 'en_attente': return { bg: '#fef3c7', color: '#92400e', label: 'En attente' };
    case 'refuse':     return { bg: '#fee2e2', color: '#991b1b', label: 'Refusé' };
    default:           return { bg: '#f3f4f6', color: '#374151', label: 'Inconnu' };
  }
};
```

### État local
```typescript
const [showModal, setShowModal] = useState(false);
```

### Rendu du badge
```typescript
<TouchableOpacity
  style={[styles.badge, { backgroundColor: status.bg }]}
  onPress={() => setShowModal(true)}
>
  <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
  {bien.motif_refus && (
    <Ionicons name="information-circle" size={14} color={status.color} />
  )}
</TouchableOpacity>
```

### Rendu de la modale
```typescript
<Modal visible={showModal} transparent animationType="fade">
  <View style={styles.centeredView}>
    <View style={styles.modalView}>
      {/* En-tête */}
      <View style={styles.headerRow}>
        <Text style={styles.modalTitle}>Statut de l'annonce</Text>
        <TouchableOpacity onPress={() => setShowModal(false)}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Zone statut colorée */}
        <View style={[styles.statusBox, { backgroundColor: status.bg + '40' }]}>
          <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
        </View>

        {/* Motif de refus — conditionnel */}
        {bien.motif_refus && bien.statut_validation === 'refuse' && (
          <View style={styles.motifBox}>
            <Text style={styles.motifTitle}>Motif du refus :</Text>
            <Text style={styles.motifText}>{bien.motif_refus}</Text>
          </View>
        )}

        {/* Message contextuel */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{messageContextuel}</Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)}>
        <Text style={styles.closeButtonText}>Fermer</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

---

## 5. Intégration dans `MyBiensScreen`

```typescript
// Avant (badge statique non cliquable)
<View style={[styles.statusChip, { backgroundColor: status.bg }]}>
  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
</View>

// Après (composant cliquable avec modale)
<StatusBadge bien={item} />
```

---

## 6. Endpoint PHP — `GET /biens/mine`

La requête retourne le champ `motif_refus` via `SELECT b.*` (tous les champs de biens, dont `motif_refus`).  
Le tri prioritaire est intégré à la requête :

```sql
SELECT b.*, c.ville_nom, c.ville_code_postal, tb.desc_type_bien,
       (SELECT pb.lien_photo FROM photos pb WHERE pb.id_biens = b.id_biens LIMIT 1) AS photo_principale,
       (SELECT MIN(t.prix_semaine) FROM tarifs t WHERE t.id_biens = b.id_biens)     AS prix_semaine_min
FROM biens b
LEFT JOIN commune c    ON b.id_commune  = c.id_commune
LEFT JOIN type_bien tb ON b.id_TypeBien = tb.id_typebien
WHERE b.id_locataire = ?
ORDER BY
  CASE b.statut_validation
    WHEN 'en_attente' THEN 1
    WHEN 'valide'     THEN 2
    WHEN 'refuse'     THEN 3
    ELSE 4
  END,
  b.id_biens DESC
```

---

## 7. Responsabilité administrateur (hors scope frontend actuel)

Le champ `motif_refus` est destiné à être renseigné par un administrateur via un back-office ou une requête SQL directe :

```sql
UPDATE biens
SET statut_validation = 'refuse',
    motif_refus = 'Les photos ne sont pas conformes à la charte qualité.'
WHERE id_biens = 42;
```

Aucun endpoint propriétaire ne permet de modifier `statut_validation` ou `motif_refus`.
