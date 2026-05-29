// src/screens/RegisterScreen.tsx
// Écran d'inscription — création de compte locataire
// Role: creation d'un compte utilisateur avec validation minimale des champs d'inscription.

import { useState } from 'react';
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
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errorHandler';
import { ErrorToast } from '../components/ErrorToast';

// Formulaire d'inscription: crée le compte puis lance l'auto-connexion via le contexte auth.

interface Props {
  onRegisterSuccess: () => void;
  onGoToLogin: () => void;
}

export function RegisterScreen({ onRegisterSuccess, onGoToLogin }: Props) {
  const { register } = useAuth();
  const [prenom,   setPrenom]   = useState('');
  const [nom,      setNom]      = useState('');
  const [email,    setEmail]    = useState('');
  const [tel,      setTel]      = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [isEntreprise, setIsEntreprise] = useState(false);
  const [siret, setSiret] = useState('');
  const [accountType, setAccountType] = useState<'locataire' | 'proprietaire'>('locataire');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleRegister() {
    if (!prenom.trim() || !nom.trim() || !email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (isEntreprise && !siret.trim()) {
      setError('Veuillez indiquer votre numéro de SIRET');
      return;
    }
    if (!isEntreprise && !dateNaissance.trim()) {
      setError('Veuillez indiquer votre date de naissance');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(
        nom.trim(),
        prenom.trim(),
        email.trim(),
        tel.trim() || null,
        password,
        isEntreprise ? null : dateNaissance.trim(),
        accountType,
        isEntreprise,
        siret.trim() || null,
      );
      onRegisterSuccess();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Goodnight</Text>
        <Text style={styles.subtitle}>Créer un compte</Text>

        <TextInput
          style={styles.input}
          placeholder="Prénom *"
          placeholderTextColor="#64748b"
          autoCapitalize="words"
          value={prenom}
          onChangeText={setPrenom}
        />
        <TextInput
          style={styles.input}
          placeholder="Nom *"
          placeholderTextColor="#64748b"
          autoCapitalize="words"
          value={nom}
          onChangeText={setNom}
        />
        <TextInput
          style={styles.input}
          placeholder="Email *"
          placeholderTextColor="#64748b"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Téléphone (optionnel)"
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
          value={tel}
          onChangeText={setTel}
        />

        <View style={styles.radioGroup}>
          <Text style={styles.radioLabel}>Je souhaite être :</Text>
          <View style={styles.radioRow}>
            <TouchableOpacity
              style={[styles.radioOption, accountType === 'locataire' && styles.radioOptionActive]}
              onPress={() => setAccountType('locataire')}
            >
              <Text style={[styles.radioText, accountType === 'locataire' && styles.radioTextActive]}>
                Locataire
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioOption, accountType === 'proprietaire' && styles.radioOptionActive]}
              onPress={() => setAccountType('proprietaire')}
            >
              <Text style={[styles.radioText, accountType === 'proprietaire' && styles.radioTextActive]}>
                Propriétaire
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.radioHint}>
            {accountType === 'locataire'
              ? 'Un locataire pourra uniquement réserver des biens.'
              : 'Un propriétaire pourra publier des annonces.'}
          </Text>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Je suis une entreprise</Text>
          <Switch
            value={isEntreprise}
            onValueChange={setIsEntreprise}
            thumbColor={isEntreprise ? '#6366f1' : '#f8fafc'}
            trackColor={{ false: '#94a3b8', true: '#818cf8' }}
          />
        </View>

        {isEntreprise ? (
          <TextInput
            style={styles.input}
            placeholder="SIRET *"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            value={siret}
            onChangeText={setSiret}
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Date de naissance * (YYYY-MM-DD)"
            placeholderTextColor="#64748b"
            value={dateNaissance}
            onChangeText={setDateNaissance}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Mot de passe * (min. 6 caractères)"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Créer mon compte</Text>
          }
        </TouchableOpacity>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Déjà un compte ?  </Text>
          <TouchableOpacity onPress={onGoToLogin}>
            <Text style={styles.link}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        <ErrorToast message={error} onDismiss={() => setError(null)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll:    {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title:    { fontSize: 36, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#94a3b8', marginBottom: 32 },
  input: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#f8fafc',
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button:         { width: '100%', backgroundColor: '#6366f1', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkRow:        { flexDirection: 'row', marginTop: 24, alignItems: 'center' },
  linkText:       { color: '#94a3b8', fontSize: 15 },
  link:           { color: '#818cf8', fontSize: 15, fontWeight: '600' },
  radioGroup:     { width: '100%', marginBottom: 14 },
  radioLabel:     { color: '#cbd5e1', marginBottom: 8 },
  radioRow:       { flexDirection: 'row', gap: 10 },
  radioOption:    { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155', alignItems: 'center', backgroundColor: '#1e293b' },
  radioOptionActive: { borderColor: '#6366f1', backgroundColor: '#312e81' },
  radioText:      { color: '#f8fafc', fontSize: 15 },
  radioTextActive: { color: '#e0e7ff', fontWeight: '700' },
  radioHint:      { marginTop: 8, color: '#94a3b8', fontSize: 13 },
  switchRow:      { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  switchLabel:    { color: '#cbd5e1', fontSize: 15 },
});
