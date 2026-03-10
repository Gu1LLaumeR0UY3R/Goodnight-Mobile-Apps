// src/components/ErrorToast.tsx
// Issue #15 — Composant d'affichage des erreurs (React Native)
// Usage : <ErrorToast message={error} onDismiss={() => setError(null)} />

import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ErrorToastProps {
  message: string | null;
  onDismiss?: () => void;
  duration?: number; // ms avant fermeture automatique (défaut : 4000)
}

export function ErrorToast({ message, onDismiss, duration = 4000 }: ErrorToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} accessibilityLabel="Fermer l'erreur">
        <Text style={styles.close}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  close: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
});
