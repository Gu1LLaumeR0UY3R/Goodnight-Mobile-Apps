import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, apiUpload } from '../services/apiClient';
import { biensService } from '../services/biensService';
import { ErrorToast } from '../components/ErrorToast';
import type { CommuneOption } from '../types/models';

interface TypeBien {
  id_typebien: number;
  desc_type_bien: string;
}

function parsePositiveInt(value: string): number | null {
  const num = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}

export default function AddBienScreen({ navigation }: any) {
  const { user } = useAuth();
  const isOwner = user?.type_compte === 'proprietaire';
  const [photoMode, setPhotoMode] = useState<'url' | 'local'>('url');
  const [designation, setDesignation] = useState('');
  const [rue, setRue] = useState('');
  const [complement, setComplement] = useState('');
  const [description, setDescription] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [nbCouchage, setNbCouchage] = useState('');
  const [prixSemaine, setPrixSemaine] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [localPhotoUri, setLocalPhotoUri] = useState('');
  const [webPhotoFile, setWebPhotoFile] = useState<File | null>(null);
  const [animaux, setAnimaux] = useState(false);
  const [types, setTypes] = useState<TypeBien[]>([]);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [communeQuery, setCommuneQuery] = useState('');
  const [communeOptions, setCommuneOptions] = useState<CommuneOption[]>([]);
  const [selectedCommune, setSelectedCommune] = useState<CommuneOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsLatitude, setGpsLatitude] = useState('');
  const [gpsLongitude, setGpsLongitude] = useState('');
  const communeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch<TypeBien[]>('/biens/types')
      .then((rows) => {
        setTypes(rows);
        setSelectedType(rows[0]?.id_typebien ?? null);
      })
      .catch(() => setError('Impossible de charger les types de bien'))
      .finally(() => setLoadingTypes(false));
  }, []);

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
    if (!isOwner) {
      setError('Seuls les propriétaires peuvent publier des biens.');
      return;
    }

    const superficieValue = parsePositiveInt(superficie);
    const couchageValue = parsePositiveInt(nbCouchage);
    const prixValue = parsePositiveInt(prixSemaine);

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
      let finalPhoto: string | undefined;
      if (photoMode === 'url') {
        finalPhoto = photoUrl.trim() || undefined;
      } else if (Platform.OS === 'web' && webPhotoFile) {
        const fd = new FormData();
        fd.append('photo', webPhotoFile);
        const uploaded = await apiUpload<{ path: string }>('/biens/upload-photo', fd);
        finalPhoto = uploaded.path;
      } else if (localPhotoUri) {
        const uploaded = await biensService.uploadPhoto(localPhotoUri);
        finalPhoto = uploaded.path;
      }

      await biensService.create({
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
        photo_url: finalPhoto,
        latitude:  (() => { const v = parseFloat(gpsLatitude.replace(',', '.')); return isNaN(v) ? undefined : v; })(),
        longitude: (() => { const v = parseFloat(gpsLongitude.replace(',', '.')); return isNaN(v) ? undefined : v; })(),
      });
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Impossible de créer le bien');
    } finally {
      setLoading(false);
    }
  }

  function pickFileWeb() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setWebPhotoFile(file);
      setLocalPhotoUri(URL.createObjectURL(file));
    };
    input.click();
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Autorisez l\'accès aux photos pour choisir une image');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalPhotoUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Autorisez la caméra pour prendre une photo');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalPhotoUri(result.assets[0].uri);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Nouveau bien</Text>
        <Text style={styles.sectionText}>Ajoutez un bien depuis votre téléphone. Il sera ensuite envoyé en validation.</Text>
        {!isOwner && (
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              Votre compte est configuré en tant que locataire. Vous ne pouvez pas publier de biens.
            </Text>
          </View>
        )}

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

        <Text style={styles.label}>Prix / semaine</Text>
        <TextInput style={styles.input} value={prixSemaine} onChangeText={setPrixSemaine} keyboardType="number-pad" placeholder="1200" />

        <Text style={styles.label}>Photo principale</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modeBtn, photoMode === 'url' && styles.modeBtnActive]} onPress={() => setPhotoMode('url')}>
            <Text style={[styles.modeBtnText, photoMode === 'url' && styles.modeBtnTextActive]}>URL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, photoMode === 'local' && styles.modeBtnActive]} onPress={() => setPhotoMode('local')}>
            <Text style={[styles.modeBtnText, photoMode === 'local' && styles.modeBtnTextActive]}>Locale</Text>
          </TouchableOpacity>
        </View>

        {photoMode === 'url' ? (
          <TextInput style={styles.input} value={photoUrl} onChangeText={setPhotoUrl} placeholder="https://..." autoCapitalize="none" />
        ) : (
          <View style={styles.localPhotoCard}>
            {localPhotoUri ? (
              <Image source={{ uri: localPhotoUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={24} color="#94a3b8" />
                <Text style={styles.photoPlaceholderText}>Aucune photo sélectionnée</Text>
              </View>
            )}
            <View style={styles.localPhotoActions}>
              {Platform.OS === 'web' ? (
                <TouchableOpacity style={styles.localBtn} onPress={pickFileWeb}>
                  <Ionicons name="folder-outline" size={16} color="#1d4ed8" />
                  <Text style={styles.localBtnText}>Parcourir…</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.localBtn} onPress={pickFromLibrary}>
                    <Ionicons name="images-outline" size={16} color="#1d4ed8" />
                    <Text style={styles.localBtnText}>Galerie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.localBtn} onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={16} color="#1d4ed8" />
                    <Text style={styles.localBtnText}>Caméra</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez le bien, ses atouts, l'environnement..."
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Coordonnées GPS (optionnel)</Text>
        <Text style={styles.gpsHint}>Précise la position exacte sur la carte. Laissez vide pour utiliser celle de la commune.</Text>
        <View style={styles.inlineRow}>
          <View style={styles.inlineField}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={gpsLatitude}
              onChangeText={setGpsLatitude}
              keyboardType="decimal-pad"
              placeholder="48.8566"
            />
          </View>
          <View style={styles.inlineField}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={gpsLongitude}
              onChangeText={setGpsLongitude}
              keyboardType="decimal-pad"
              placeholder="2.3522"
            />
          </View>
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>Animaux acceptés</Text>
            <Text style={styles.switchSubtitle}>Activez si les voyageurs peuvent venir avec leurs animaux.</Text>
          </View>
          <Switch value={animaux} onValueChange={setAnimaux} trackColor={{ true: '#93c5fd', false: '#d1d5db' }} thumbColor={animaux ? '#2563eb' : '#f8fafc'} />
        </View>

        <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Créer le bien</Text>}
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
  gpsHint: { fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 18 },
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
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeBtnActive: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  modeBtnText: {
    color: '#334155',
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: '#1d4ed8',
  },
  localPhotoCard: {
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 14,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#e2e8f0',
  },
  photoPlaceholder: {
    height: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoPlaceholderText: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 13,
  },
  localPhotoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  localBtn: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
  },
  localBtnText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 13,
  },
  inlineRow: { flexDirection: 'row', gap: 12 },
  inlineField: { flex: 1 },
  switchRow: {
    marginTop: 4,
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  switchTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  switchSubtitle: { marginTop: 4, fontSize: 13, color: '#64748b', maxWidth: 240 },
  submitBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  infoBox: {
    marginVertical: 18,
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 14,
  },
  infoBoxText: {
    color: '#1e293b',
    fontSize: 14,
    lineHeight: 20,
  },
});