// src/screens/MapScreen.web.tsx
// Stub web : react-native-maps n'est pas supporté sur web.
// Cette version s'affiche à la place sur platform=web.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={56} color="#2563eb" />
      <Text style={styles.title}>Carte</Text>
      <Text style={styles.text}>
        La carte interactive est disponible uniquement sur l'application mobile (iOS / Android).
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Explorer')}
      >
        <Text style={styles.buttonText}>Revenir à l'exploration</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  text:  { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  button: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
