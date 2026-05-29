// src/screens/EditProfileScreen.tsx
// Permet à l'utilisateur connecté de modifier son profil (nom, email, tel, mdp)
// Role: edition du profil, du mot de passe et de la photo de profil de l'utilisateur connecte.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  ScrollView, StyleSheet, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, apiUpload, getImageUrl } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import type { Locataire } from '../types/models';

export default function EditProfileScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();

  const [nom,    setNom]    = useState(user?.nom_locataire    ?? '');
  const [prenom, setPrenom] = useState(user?.prenom_locataire ?? '');
  const [email,  setEmail]  = useState(user?.email_locataire  ?? '');
  const [tel,    setTel]    = useState(user?.tel_locataire    ?? '');

  const [ancienMdp,  setAncienMdp]  = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');

  const [pfpUri,     setPfpUri]     = useState<string | null>(null);
  const [webPfpFile, setWebPfpFile] = useState<File | null>(null);

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    if (!nom.trim() || !prenom.trim() || !email.trim()) {
      setError('Nom, prénom et email sont obligatoires');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // Upload photo de profil si une nouvelle a été choisie
      let pfpLoca: string | undefined;
      if (Platform.OS === 'web' && webPfpFile) {
        const fd = new FormData();
        fd.append('photo', webPfpFile);
        const uploaded = await apiUpload<{ path: string }>('/biens/upload-photo', fd);
        pfpLoca = uploaded.path;
      } else if (pfpUri) {
        const filename = pfpUri.split('/').pop() || `pfp_${Date.now()}.jpg`;
        const ext = filename.toLowerCase().split('.').pop();
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const fd = new FormData();
        fd.append('photo', { uri: pfpUri, name: filename, type: mime } as any);
        const uploaded = await apiUpload<{ path: string }>('/biens/upload-photo', fd);
        pfpLoca = uploaded.path;
      }

      const body: Record<string, string> = {
        nom_locataire:    nom.trim(),
        prenom_locataire: prenom.trim(),
        email_locataire:  email.trim(),
        tel_locataire:    tel.trim(),
      };
      if (pfpLoca) body.pfp_loca = pfpLoca;
      if (ancienMdp || nouveauMdp) {
        body.ancien_mdp  = ancienMdp;
        body.nouveau_mdp = nouveauMdp;
      }

      const updated = await apiFetch<Locataire>('/auth/me', 'PUT', body);
      updateUser(updated);
      setSuccess(true);
      setAncienMdp('');
      setNouveauMdp('');
      setPfpUri(null);
      setWebPfpFile(null);

      if (Platform.OS !== 'web') {
        Alert.alert('Succès', 'Profil mis à jour', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  }

  function pickPhotoWeb() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setWebPfpFile(file);
      setPfpUri(URL.createObjectURL(file));
    };
    input.click();
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError("Autorisez l'accès aux photos"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.uri) setPfpUri(result.assets[0].uri);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { setError('Autorisez la caméra'); return; }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.uri) setPfpUri(result.assets[0].uri);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Photo de profil ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo de profil</Text>
        <View style={styles.pfpSection}>
          {pfpUri ? (
            <Image source={{ uri: pfpUri }} style={styles.pfpPreview} />
          ) : user?.pfp_loca && getImageUrl(user.pfp_loca) ? (
            <Image source={{ uri: getImageUrl(user.pfp_loca)! }} style={styles.pfpPreview} />
          ) : (
            <View style={[styles.pfpPreview, styles.pfpPlaceholder]}>
              <Ionicons name="person-outline" size={40} color="#9ca3af" />
            </View>
          )}
          {Platform.OS === 'web' ? (
            <TouchableOpacity style={styles.changePhotoBtn} onPress={pickPhotoWeb}>
              <Ionicons name="camera-outline" size={16} color="#2563eb" />
              <Text style={styles.changePhotoBtnText}>Changer la photo</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.pfpActions}>
              <TouchableOpacity style={styles.changePhotoBtn} onPress={pickFromLibrary}>
                <Ionicons name="images-outline" size={16} color="#2563eb" />
                <Text style={styles.changePhotoBtnText}>Galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.changePhotoBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={16} color="#2563eb" />
                <Text style={styles.changePhotoBtnText}>Caméra</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ── Informations personnelles ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>

        <Text style={styles.label}>Prénom</Text>
        <TextInput
          style={styles.input}
          value={prenom}
          onChangeText={setPrenom}
          placeholder="Prénom"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Nom</Text>
        <TextInput
          style={styles.input}
          value={nom}
          onChangeText={setNom}
          placeholder="Nom"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Téléphone</Text>
        <TextInput
          style={styles.input}
          value={tel}
          onChangeText={setTel}
          placeholder="Téléphone (optionnel)"
          keyboardType="phone-pad"
        />
      </View>

      {/* ── Changement de mot de passe ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Changer le mot de passe</Text>
        <Text style={styles.sectionHint}>
          Laissez vide pour conserver votre mot de passe actuel.
        </Text>

        <Text style={styles.label}>Mot de passe actuel</Text>
        <TextInput
          style={styles.input}
          value={ancienMdp}
          onChangeText={setAncienMdp}
          placeholder="••••••••"
          secureTextEntry
        />

        <Text style={styles.label}>Nouveau mot de passe (6 car. min.)</Text>
        <TextInput
          style={styles.input}
          value={nouveauMdp}
          onChangeText={setNouveauMdp}
          placeholder="••••••••"
          secureTextEntry
        />
      </View>

      {/* ── Feedback ── */}
      {!!error && (
        <View style={styles.feedbackBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {success && Platform.OS === 'web' && (
        <View style={[styles.feedbackBox, styles.successBox]}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
          <Text style={styles.successText}>Profil mis à jour avec succès</Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Enregistrer</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  content:      { padding: 20, paddingBottom: 40 },

  section:      {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionHint:  { fontSize: 13, color: '#9ca3af', marginBottom: 4 },

  pfpSection:       { alignItems: 'center', gap: 12, paddingTop: 8 },
  pfpPreview:       { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f3f4f6' },
  pfpPlaceholder:   { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  pfpActions:       { flexDirection: 'row', gap: 10 },
  changePhotoBtn:   {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  changePhotoBtnText: { color: '#2563eb', fontWeight: '700', fontSize: 13 },

  label:  { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 4 },
  input:  {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },

  feedbackBox:  {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successBox:   { backgroundColor: '#dcfce7' },
  errorText:    { flex: 1, color: '#b91c1c', fontSize: 14 },
  successText:  { flex: 1, color: '#15803d', fontSize: 14 },

  saveBtn:      {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
});
