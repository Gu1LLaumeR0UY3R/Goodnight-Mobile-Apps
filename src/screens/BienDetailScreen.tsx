// src/screens/BienDetailScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BienDetailScreen({ route }: any) {
  const { id } = route?.params ?? {};
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Détail du bien #{id} — bientôt disponible</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  text:      { color: '#6b7280', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
});
