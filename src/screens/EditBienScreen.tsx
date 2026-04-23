/**
 * src/screens/EditBienScreen.tsx
 *
 * RÔLE :
 *   Formulaire de modification d'un bien existant.
 *   Reçoit l'objet `bien` complet via route.params et pré-remplit tous les champs.
 *
 * FONCTIONNALITÉS :
 *   - Champs éditables : nom, adresse, description, superficie, couchages,
 *     animaux (switch), type de bien (liste), commune (autocomplete), prix/semaine
 *   - Autocomplete commune :
 *       Appel à l'API déclenché après 250 ms de pause (debounce via setTimeout).
 *       Guard : ne relance pas si le texte correspond déjà à la commune sélectionnée.
 *   - Validation locale avant envoi : champs requis, valeurs positives
 *   - Soumission : PUT /biens/:id via biensService.update()
 *   - En cas de succès : navigation.goBack() → retour à MyBiensScreen
 *
 * DÉPEND DE :
 *   - biensService.ts  (update, searchCommunes)
 *   - apiClient.ts     (apiFetch pour charger les types de bien)
 *   - ErrorToast       (composant d'affichage d'erreur)
 *
 * NAVIGATION :
 *   MyBiensScreen → (bouton Modifier) → EditBienScreen
 *   EditBienScreen → goBack() → MyBiensScreen
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiFetch } from '../services/apiClient';
import { biensService } from '../services/biensService';
import { ErrorToast } from '../components/ErrorToast';
import type { Bien, CommuneOption } from '../types/models';

interface TypeBien {
  id_typebien: number;
  desc_type_bien: string;
}

function parsePositiveNum(value: string): number | null {
  const num = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}

export default function EditBienScreen({ route, navigation }: any) {
  const bien: Bien = route.params.bien;

  const [designation, setDesignation] = useState(bien.designation_bien ?? '');
  const [rue, setRue] = useState(bien.rue_biens ?? '');
  const [complement, setComplement] = useState(bien.complement_biens ?? '');
  const [description, setDescription] = useState(bien.description_biens ?? '');
  const [superficie, setSuperficie] = useState(String(bien.superficie_biens ?? ''));
  const [nbCouchage, setNbCouchage] = useState(String(bien.nb_couchage ?? ''));
  const [prixSemaine, setPrixSemaine] = useState(String(Math.round(Number(bien.prix_semaine_min ?? 0)) || ''));
  const [animaux, setAnimaux] = useState(Boolean(bien.animaux_biens));

  const [types, setTypes] = useState<TypeBien[]>([]);
  const [selectedType, setSelectedType] = useState<number | null>(bien.id_TypeBien ?? null);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [communeQuery, setCommuneQuery] = useState(
    bien.ville_nom ? `${bien.ville_nom} (${bien.ville_code_postal ?? ''})` : ''
  );
  const [communeOptions, setCommuneOptions] = useState<CommuneOption[]>([]);
  const [selectedCommune, setSelectedCommune] = useState<CommuneOption | null>(
    bien.id_commune
      ? { id_commune: bien.id_commune, ville_nom: bien.ville_nom ?? '', ville_code_postal: bien.ville_code_postal ?? '' }
      : null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const communeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch<TypeBien[]>('/biens/types')
      .then(setTypes)
      .catch(() => setError('Impossible de charger les types de bien'))
      .finally(() => setLoadingTypes(false));
  }, []);

  // Autocomplete commune : déclenché avec debounce 250 ms.
  // Guard : ne relance pas si le texte correspond déjà à la commune sélectionnée
  // (sinon, choisir une commune rouvrirait immédiatement la liste).
  useEffect(() => {
    const q = communeQuery.trim();
    if (selectedCommune && q === `${selectedCommune.ville_nom} (${selectedCommune.ville_code_postal})`) {
      return;
    }

    if (communeTimerRef.current) clearTimeout(communeTimerRef.current);

    if (q.length < 2) {
      setCommuneOptions([]);
      return;
    }

    communeTimerRef.current = setTimeout(async () => {
      try {
        const rows = await biensService.searchCommunes(q);
        setCommuneOptions(rows);
      } catch {
        setCommuneOptions([]);
      }
    }, 250);

    return () => {
      if (communeTimerRef.current) clearTimeout(communeTimerRef.current);
    };
  }, [communeQuery, selectedCommune]);

  async function handleSubmit() {
    const superficieValue = parsePositiveNum(superficie);
    const couchageValue = parsePositiveNum(nbCouchage);
    const prixValue = parsePositiveNum(prixSemaine);

    if (!designation.trim() || !rue.trim()) {
      setError('Nom du bien et adresse requis');
      return;
    }
    if (!selectedType) {
      setError('Choisissez un type de bien');
      return;
    }
    if (!selectedCommune) {
      setError('Choisissez une commune');
      return;
    }
    if (!superficieValue || !couchageValue || !prixValue) {
      setError('Superficie, couchages et prix/semaine doivent être valides');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await biensService.update(bien.id_biens, {
        designation_bien: designation.trim(),
        rue_biens: rue.trim(),
        complement_biens: complement.trim() || undefined,
        description_biens: description.trim() || undefined,
        superficie_biens: superficieValue,
        animaux_biens: animaux,
        nb_couchage: couchageValue,
        id_TypeBien: selectedType,
        id_commune: selectedCommune.id_commune,
        prix_semaine: prixValue,
      });
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Impossible de modifier le bien');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Modifier le bien</Text>
        <Text style={styles.sectionText}>Les modifications seront enregistrées immédiatement.</Text>

        <Text style={styles.label}>Nom du bien</Text>
        <TextInput style={styles.input} value={designation} onChangeText={setDesignation} placeholder="Ex: Villa des pins" />

        <Text style={styles.label}>Adresse</Text>
        <TextInput style={styles.input} value={rue} onChangeText={setRue} placeholder="12 rue du Port" />

        <Text style={styles.label}>Complément d'adresse</Text>
        <TextInput style={styles.input} value={complement} onChangeText={setComplement} placeholder="Bâtiment, étage..." />

        <Text style={styles.label}>Commune</Text>
        <TextInput
          style={styles.input}
          value={communeQuery}
          onChangeText={(text) => {
            setCommuneQuery(text);
            setSelectedCommune(null);
          }}
          placeholder="Ville ou code postal"
        />
        {communeOptions.length > 0 && !selectedCommune && (
          <View style={styles.dropdown}>
            {communeOptions.map((option) => (
              <TouchableOpacity
                key={option.id_commune}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedCommune(option);
                  setCommuneQuery(`${option.ville_nom} (${option.ville_code_postal})`);
                  setCommuneOptions([]);
                }}
              >
                <Text style={styles.dropdownText}>{option.ville_nom} ({option.ville_code_postal})</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Type de bien</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
          {loadingTypes ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            types.map((type) => {
              const active = selectedType === type.id_typebien;
              return (
                <TouchableOpacity
                  key={type.id_typebien}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => setSelectedType(type.id_typebien)}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{type.desc_type_bien}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inlineRow}>
          <View style={styles.inlineField}>
            <Text style={styles.label}>Superficie m²</Text>
            <TextInput style={styles.input} value={superficie} onChangeText={setSuperficie} keyboardType="number-pad" placeholder="75" />
          </View>
          <View style={styles.inlineField}>
            <Text style={styles.label}>Couchages</Text>
            <TextInput style={styles.input} value={nbCouchage} onChangeText={setNbCouchage} keyboardType="number-pad" placeholder="6" />
          </View>
        </View>

        <Text style={styles.label}>Prix / semaine (€)</Text>
        <TextInput style={styles.input} value={prixSemaine} onChangeText={setPrixSemaine} keyboardType="number-pad" placeholder="1200" />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez le bien, ses atouts, l'environnement..."
          multiline
          textAlignVertical="top"
        />

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Animaux acceptés</Text>
            <Text style={styles.switchSubtitle}>Activez si les voyageurs peuvent venir avec leurs animaux.</Text>
          </View>
          <Switch
            value={animaux}
            onValueChange={setAnimaux}
            trackColor={{ true: '#93c5fd', false: '#d1d5db' }}
            thumbColor={animaux ? '#2563eb' : '#f8fafc'}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Enregistrer les modifications</Text>}
        </TouchableOpacity>
      </ScrollView>

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 48 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  sectionText: { marginTop: 6, marginBottom: 18, fontSize: 14, color: '#64748b', lineHeight: 21 },
  label: { marginBottom: 6, fontSize: 13, fontWeight: '700', color: '#334155' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 14,
  },
  textarea: { minHeight: 110 },
  dropdown: {
    marginTop: -8,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  dropdownText: { fontSize: 14, color: '#0f172a' },
  typeRow: { gap: 10, paddingBottom: 10 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  typeChipActive: { backgroundColor: '#1d4ed8' },
  typeChipText: { color: '#334155', fontWeight: '700' },
  typeChipTextActive: { color: '#fff' },
  inlineRow: { flexDirection: 'row', gap: 12 },
  inlineField: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  switchText: { flex: 1, marginRight: 12 },
  switchTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  switchSubtitle: { marginTop: 3, fontSize: 13, color: '#64748b' },
  submitBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
