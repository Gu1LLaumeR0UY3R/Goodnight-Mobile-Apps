// src/navigation/ProtectedRoute.tsx
// Role: gardes declaratives pour bloquer l'acces selon l'authentification et le role.
import React, { type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import type { AppRole } from '../types/auth';

// Composants de garde: ils bloquent l'accès aux écrans protégés côté interface.
// La sécurité réelle reste toujours côté API, mais ce fichier évite les parcours inutiles.

interface RequireAuthProps {
  children: ReactNode;
  navigation: any;
  title: string;
}

interface RequireRoleProps extends RequireAuthProps {
  roles: AppRole | AppRole[];
}

function AuthRequiredCard({ navigation, title }: { navigation: any; title: string }) {
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed-outline" size={44} color="#6b7280" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Connectez-vous pour accéder à cette section.</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.secondaryButtonText}>Créer un compte</Text>
      </TouchableOpacity>
    </View>
  );
}

function RoleRequiredCard({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <Ionicons name="shield-checkmark-outline" size={44} color="#6b7280" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Votre rôle ne permet pas d'accéder à cet écran.</Text>
    </View>
  );
}

export function RequireAuth({ children, navigation, title }: RequireAuthProps) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <AuthRequiredCard navigation={navigation} title={title} />;
  }
  return <>{children}</>;
}

export function RequireRole({ children, navigation, title, roles }: RequireRoleProps) {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <AuthRequiredCard navigation={navigation} title={title} />;
  }

  if (!hasRole(roles)) {
    return <RoleRequiredCard title={title} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 15,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 16,
  },
});
