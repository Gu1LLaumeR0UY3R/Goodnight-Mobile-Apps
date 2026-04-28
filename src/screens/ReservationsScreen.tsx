// src/screens/ReservationsScreen.tsx
// Issue #16 — Liste des réservations du locataire connecté

import React, { useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { reservationsService } from '../services/reservationsService';
import { getImageUrl } from '../services/apiClient';
import { getErrorMessage } from '../utils/errorHandler';
import type { Reservation } from '../types/models';

export default function ReservationsScreen({ navigation }: any) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [cancelling, setCancelling]     = useState<number | null>(null);

  async function loadReservations() {
    setLoading(true);
    setError(null);

    try {
      const data = await reservationsService.getAll();
      setReservations(data);
    } catch (e: any) {
      setError(e.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      loadReservations();
    }, [])
  );

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  async function executeCancelReservation(id: number) {
    setCancelling(id);
    try {
      await reservationsService.cancel(id);
      setReservations(prev => prev.filter(r => r.id_reservation !== id));
      Alert.alert('Succès', 'Réservation annulée');
    } catch (e: any) {
      Alert.alert('Erreur', getErrorMessage(e));
    } finally {
      setCancelling(null);
    }
  }

  async function handleCancelReservation(id: number, designation: string, debut: string, fin: string) {
    const message = `Confirmer l'annulation de "${designation}" du ${formatDate(debut)} au ${formatDate(fin)} ?`;

    if (Platform.OS === 'web') {
      const confirmed = typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : true;
      if (confirmed) {
        await executeCancelReservation(id);
      }
      return;
    }

    Alert.alert(
      'Annuler la réservation',
      message,
      [
        { text: 'Non', onPress: () => {}, style: 'cancel' },
        {
          text: 'Oui, annuler',
          onPress: () => { void executeCancelReservation(id); },
          style: 'destructive',
        },
      ],
    );
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errText}>{error}</Text>
      </View>
    );
  }

  if (reservations.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="airplane-outline" size={56} color="#d1d5db" />
        <Text style={styles.emptyTitle}>Aucun voyage pour le moment</Text>
        <Text style={styles.emptySub}>Vos réservations apparaissent ici</Text>
        <TouchableOpacity
          style={styles.exploreBtn}
          onPress={() => navigation.navigate('Explorer')}
        >
          <Text style={styles.exploreBtnText}>Explorer les logements</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={reservations}
      keyExtractor={r => String(r.id_reservation)}
      contentContainerStyle={styles.listContent}
      renderItem={({ item: r }) => {
        const photoUrl = r.photo_principale ? getImageUrl(r.photo_principale) : null;
        const isCancelling = cancelling === r.id_reservation;
        return (
          <View style={styles.card}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.cardPhoto} resizeMode="cover" />
            ) : (
              <View style={[styles.cardPhoto, styles.photoPlaceholder]}>
                <Ionicons name="home-outline" size={28} color="#d1d5db" />
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {r.designation_bien ?? 'Logement'}
              </Text>
              {r.ville_nom && (
                <View style={styles.rowIcon}>
                  <Ionicons name="location-outline" size={13} color="#6b7280" />
                  <Text style={styles.cardMeta}>{r.ville_nom}</Text>
                </View>
              )}
              <View style={styles.rowIcon}>
                <Ionicons name="calendar-outline" size={13} color="#6b7280" />
                <Text style={styles.cardMeta}>
                  {formatDate(r.date_debut)} → {formatDate(r.date_fin)}
                </Text>
              </View>
              {r.montant_total != null && (
                <Text style={styles.cardPrice}>{Math.round(r.montant_total)} €</Text>
              )}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() =>
                  handleCancelReservation(r.id_reservation, r.designation_bien ?? 'Logement', r.date_debut, r.date_fin)
                }
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list:           { flex: 1, backgroundColor: '#f9fafb' },
  listContent:    { padding: 16, gap: 12 },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 10 },
  errText:        { fontSize: 15, color: '#374151', textAlign: 'center' },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptySub:       { fontSize: 14, color: '#9ca3af' },
  exploreBtn:     { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 10 },
  exploreBtnText: { color: '#fff', fontWeight: '700' },

  card:             { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  cardPhoto:        { width: 90, height: 85 },
  photoPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  cardContent:      { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTitle:        { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 5 },
  rowIcon:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardMeta:         { fontSize: 12, color: '#6b7280', flex: 1 },
  cardPrice:        { fontSize: 15, fontWeight: '800', color: '#2563eb', marginTop: 2, marginBottom: 8 },
  
  cancelBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fee2e2', borderRadius: 8, alignSelf: 'flex-start' },
  cancelBtnText:    { fontSize: 12, fontWeight: '600', color: '#ef4444' },
});

