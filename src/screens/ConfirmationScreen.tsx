// src/screens/ConfirmationScreen.tsx
// Issue #16 — Écran de confirmation après réservation réussie
// Role: ecran de fin de parcours qui confirme la reservation et propose la suite de navigation.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Écran de confirmation de réservation: récapitulatif final et retour vers l'application.

export default function ConfirmationScreen({ route, navigation }: any) {
  const { reservation } = route.params ?? {};

  if (!reservation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errText}>Réservation introuvable</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Explorer')}>
          <Text style={styles.btnText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ref = `#GN-${(reservation.date_debut ?? '').replace(/-/g, '')}-${reservation.id_reservation ?? '0'}`;

  function formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', {
      day:   '2-digit',
      month: 'long',
      year:  'numeric',
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>

      {/* ── Icône succès ── */}
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark" size={52} color="#fff" />
      </View>

      <Text style={styles.title}>Réservation confirmée !</Text>
      <Text style={styles.subtitle}>Votre séjour a bien été enregistré.</Text>

      {/* ── Référence ── */}
      <View style={styles.refBox}>
        <Text style={styles.refLabel}>Référence de réservation</Text>
        <Text style={styles.refValue}>{ref}</Text>
      </View>

      {/* ── Récap lecture seule ── */}
      <View style={styles.recapCard}>
        {reservation.designation_bien && (
          <RecapRow icon="home-outline"     label={reservation.designation_bien} />
        )}
        {reservation.ville_nom && (
          <RecapRow icon="location-outline" label={reservation.ville_nom} />
        )}
        {reservation.date_debut && (
          <RecapRow icon="calendar-outline" label={`Arrivée : ${formatDate(reservation.date_debut)}`} />
        )}
        {reservation.date_fin && (
          <RecapRow icon="calendar-outline" label={`Départ : ${formatDate(reservation.date_fin)}`} />
        )}
        {reservation.total != null && (
          <>
            <View style={styles.recapSep} />
            <RecapRow icon="card-outline" label={`Total : ${Math.round(reservation.total)} €`} bold />
          </>
        )}
      </View>

      {/* ── CTAs ── */}
      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={() => navigation.navigate('Trips')}
        activeOpacity={0.85}
      >
        <Ionicons name="airplane-outline" size={18} color="#fff" />
        <Text style={styles.btnPrimaryText}>Voir mes réservations</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnGhost}
        onPress={() => navigation.navigate('Explorer')}
        activeOpacity={0.85}
      >
        <Text style={styles.btnGhostText}>Retour à l'accueil</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

function RecapRow({ icon, label, bold }: { icon: any; label: string; bold?: boolean }) {
  return (
    <View style={recapStyles.row}>
      <Ionicons name={icon} size={16} color="#6b7280" />
      <Text style={[recapStyles.label, bold && recapStyles.bold]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const recapStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  label: { flex: 1, fontSize: 14, color: '#374151' },
  bold:  { fontWeight: '700', color: '#111827', fontSize: 15 },
});

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
    paddingTop: 48,
  },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errText:   { fontSize: 15, color: '#374151', marginBottom: 16 },

  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title:    { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 28 },

  refBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  refLabel: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginBottom: 4 },
  refValue: { fontSize: 19, fontWeight: '800', color: '#1d4ed8', letterSpacing: 0.5 },

  recapCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recapSep: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },

  btnPrimary: {
    width: '100%',
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  btnGhost: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  btnGhostText: { color: '#374151', fontSize: 15, fontWeight: '600' },

  btn:     { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8, marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '600' },
});
