// src/screens/EditProfileScreen.tsx
// Permet à l'utilisateur connecté de modifier son profil (nom, email, tel, mdp)

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../services/apiClient';
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
      const body: Record<string, string> = {
        nom_locataire:    nom.trim(),
        prenom_locataire: prenom.trim(),
        email_locataire:  email.trim(),
        tel_locataire:    tel.trim(),
      };
      if (ancienMdp || nouveauMdp) {
        body.ancien_mdp  = ancienMdp;
        body.nouveau_mdp = nouveauMdp;
      }

      const updated = await apiFetch<Locataire>('/auth/me', 'PUT', body);
      updateUser(updated);
      setSuccess(true);
      setAncienMdp('');
      setNouveauMdp('');

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
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
