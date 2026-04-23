// src/screens/ReservationsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ReservationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mes voyages — bientôt disponible</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  text:      { color: '#6b7280', fontSize: 16 },
});
