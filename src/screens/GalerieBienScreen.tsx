/**
 * src/screens/GalerieBienScreen.tsx
 *
 * RÔLE :
 *   Gestion complète des photos d'un bien : affichage en grille,
 *   ajout, suppression, et définition de la photo principale.
 *
 * FONCTIONNALITÉS :
 *   - Affichage en grille 2 colonnes (FlatList numColumns=2)
 *   - Photo principale : étoile dorée visible, tap → définit comme principale
 *     (PUT /biens/:id/photos/:photoId, remet toutes les autres à 0 en BDD)
 *   - Suppression : confirmation Alert déstructive, DELETE /biens/:id/photos/:photoId
 *   - Ajout par URL : champ texte libre + bouton "Ajouter"
 *   - Ajout local :
 *       Mode galerie (ImagePicker.launchImageLibraryAsync)
 *       Mode caméra  (ImagePicker.launchCameraAsync)
 *       → Upload multipart (POST /biens/upload-photo) puis enregistrement
 *         du chemin en BDD (POST /biens/:id/photos)
 *   - Mises à jour optimistes : l'état local est mis à jour immédiatement
 *     après la réponse API, sans rechargement complet de la liste
 *
 * DÉPEND DE :
 *   - biensService.ts  (getPhotos, addPhoto, deletePhoto, setPhotoAsFirst, uploadPhoto)
 *   - apiClient.ts     (getImageUrl)
 *   - expo-image-picker (accès galerie / caméra)
 *   - ErrorToast       (composant d'erreur)
 *
 * NAVIGATION :
 *   MyBiensScreen → (bouton Photos) → GalerieBienScreen
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { biensService } from '../services/biensService';
import { apiUpload, getImageUrl } from '../services/apiClient';
import { ErrorToast } from '../components/ErrorToast';
import type { Photo } from '../types/models';

export default function GalerieBienScreen({ route }: any) {
  const { bienId, bienTitle } = route.params as { bienId: number; bienTitle: string };

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState<'url' | 'local' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await biensService.getPhotos(bienId);
      setPhotos(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [bienId]);

  useFocusEffect(
    useCallback(() => {
      loadPhotos();
    }, [loadPhotos])
  );

  async function handleDeletePhoto(photo: Photo) {
    Alert.alert(
      'Supprimer la photo',
      'Cette photo sera supprimée définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await biensService.deletePhoto(bienId, photo.id_photo);
              setPhotos((prev) => prev.filter((p) => p.id_photo !== photo.id_photo));
            } catch (e: any) {
              setError(e?.message ?? 'Impossible de supprimer la photo');
            }
          },
        },
      ]
    );
  }

  async function addPhotoByUrl() {
    const url = urlInput.trim();
    if (!url) {
      setError('Entrez une URL valide');
      return;
    }
    setAdding(true);
    try {
      const result = await biensService.addPhoto(bienId, url);
      setPhotos((prev) => [...prev, { id_photo: result.id_photo, lien_photo: url, is_principal: false }]);
      setUrlInput('');
      setAddMode(null);
    } catch (e: any) {
      setError(e?.message ?? 'Impossible d\'ajouter la photo');
    } finally {
      setAdding(false);
    }
  }

  async function pickAndUpload(source: 'library' | 'camera') {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'library') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setError('Autorisez l\'accès aux photos'); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true });
    } else {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setError('Autorisez la caméra'); return; }
      result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true });
    }

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setAdding(true);
    try {
      const uploaded = await biensService.uploadPhoto(result.assets[0].uri);
      const added = await biensService.addPhoto(bienId, uploaded.path);
      setPhotos((prev) => [...prev, { id_photo: added.id_photo, lien_photo: uploaded.path, is_principal: false }]);
      setAddMode(null);
    } catch (e: any) {
      setError(e?.message ?? 'Impossible d\'uploader la photo');
    } finally {
      setAdding(false);
    }
  }

  function pickAndUploadWeb() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setAdding(true);
      try {
        const formData = new FormData();
        formData.append('photo', file);
        const uploaded = await apiUpload<{ path: string; message: string }>('/biens/upload-photo', formData);
        const added = await biensService.addPhoto(bienId, uploaded.path);
        setPhotos((prev) => [...prev, { id_photo: added.id_photo, lien_photo: uploaded.path, is_principal: false }]);
        setAddMode(null);
      } catch (e: any) {
        setError(e?.message ?? 'Impossible d\'uploader la photo');
      } finally {
        setAdding(false);
      }
    };
    input.click();
  }

  const numColumns = 2;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{bienTitle}</Text>
      <Text style={styles.subtitle}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</Text>

      {/* Zone d'ajout */}
      {addMode === null ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddMode('url')}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Ajouter une photo</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.addCard}>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, addMode === 'url' && styles.modeBtnActive]}
              onPress={() => setAddMode('url')}
            >
              <Text style={[styles.modeBtnText, addMode === 'url' && styles.modeBtnTextActive]}>URL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, addMode === 'local' && styles.modeBtnActive]}
              onPress={() => setAddMode('local')}
            >
              <Text style={[styles.modeBtnText, addMode === 'local' && styles.modeBtnTextActive]}>Locale</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAddMode(null); setUrlInput(''); }}>
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {addMode === 'url' ? (
            <View style={styles.urlRow}>
              <TextInput
                style={styles.urlInput}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="https://..."
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.confirmBtn} onPress={addPhotoByUrl} disabled={adding}>
                {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>OK</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.localRow}>
              {Platform.OS === 'web' ? (
                <TouchableOpacity style={styles.localBtn} onPress={pickAndUploadWeb} disabled={adding}>
                  <Ionicons name="folder-outline" size={18} color="#1d4ed8" />
                  <Text style={styles.localBtnText}>Parcourir…</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.localBtn} onPress={() => pickAndUpload('library')} disabled={adding}>
                    <Ionicons name="images-outline" size={18} color="#1d4ed8" />
                    <Text style={styles.localBtnText}>Galerie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.localBtn} onPress={() => pickAndUpload('camera')} disabled={adding}>
                    <Ionicons name="camera-outline" size={18} color="#1d4ed8" />
                    <Text style={styles.localBtnText}>Caméra</Text>
                  </TouchableOpacity>
                </>
              )}
              {adding && <ActivityIndicator color="#2563eb" />}
            </View>
          )}
        </View>
      )}

      {/* Grille de photos */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="images-outline" size={54} color="#cbd5e1" />
          <Text style={styles.emptyText}>Aucune photo pour ce bien</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => String(item.id_photo)}
          numColumns={numColumns}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const uri = getImageUrl(item.lien_photo);
            return (
              <View style={styles.photoCard}>
                {uri ? (
                  <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Ionicons name="image-outline" size={28} color="#94a3b8" />
                  </View>
                )}
                {item.is_principal && <View style={styles.mainBadge}><Ionicons name="star" size={14} color="#fff" /></View>}
                <TouchableOpacity style={styles.starBtn} onPress={() => {
                  if (!item.is_principal) {
                    biensService.setPhotoAsFirst(bienId, item.id_photo)
                      .then(() => loadPhotos())
                      .catch((e: any) => setError(e?.message || 'Erreur'));
                  }
                }}>
                  <Ionicons name={item.is_principal ? 'star' : 'star-outline'} size={18} color={item.is_principal ? '#eab308' : '#cbd5e1'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePhoto(item)}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 14 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 14 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  addCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  modeBtnActive: { borderColor: '#2563eb', backgroundColor: '#dbeafe' },
  modeBtnText: { color: '#334155', fontWeight: '700' },
  modeBtnTextActive: { color: '#1d4ed8' },
  cancelBtn: { padding: 6 },
  urlRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  urlInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  confirmBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 48,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
  localRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  localBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
  },
  localBtnText: { color: '#1d4ed8', fontWeight: '700', fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { marginTop: 10, color: '#94a3b8', fontSize: 15 },
  grid: { paddingBottom: 24 },
  row: { gap: 10, marginBottom: 10 },
  photoCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    position: 'relative',
  },
  photo: { width: '100%', aspectRatio: 1 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  mainBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#eab308',
    borderRadius: 12,
    padding: 4,
  },
  starBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 6,
  },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 6,
  },
});
