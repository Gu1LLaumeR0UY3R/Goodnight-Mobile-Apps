// src/screens/OwnerReservationsScreen.tsx
// Réservations reçues sur un bien spécifique (vue propriétaire)
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { biensService } from '../services/biensService';
import type { Reservation } from '../types/models';

interface ReservationWithLocataire extends Reservation {
  nom_locataire?: string;
  prenom_locataire?: string;
  email_locataire?: string;
  tel_locataire?: string;
  prix_semaine?: number;
  nb_nuits?: number;
}

export default function OwnerReservationsScreen({ route, navigation }: any) {
  const { bienId, bienTitle } = route?.params ?? {};

  const [reservations, setReservations] = useState<ReservationWithLocataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await biensService.getReservations(bienId) as ReservationWithLocataire[];
      setReservations(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bienId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('fr-FR');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={reservations}
      keyExtractor={item => String(item.id_reservation)}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2563eb" />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Ionicons name="people-outline" size={20} color="#2563eb" />
          <Text style={styles.headerText}>
            {reservations.length} réservation{reservations.length !== 1 ? 's' : ''} · {bienTitle}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={52} color="#e5e7eb" />
          <Text style={styles.emptyTitle}>Aucune réservation</Text>
          <Text style={styles.emptyText}>Ce bien n'a pas encore été réservé.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const nuits = item.nb_nuits ?? 0;
        const total = item.prix_semaine != null
          ? Math.round((item.prix_semaine / 7) * nuits)
          : null;

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={18} color="#fff" />
              </View>
              <View style={styles.guestInfo}>
                <Text style={styles.guestName}>
                  {item.prenom_locataire ?? ''} {item.nom_locataire ?? 'Locataire inconnu'}
                </Text>
                {item.email_locataire ? (
                  <Text style={styles.guestMeta}>{item.email_locataire}</Text>
                ) : null}
                {item.tel_locataire ? (
                  <Text style={styles.guestMeta}>{item.tel_locataire}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.dates}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Arrivée</Text>
                <Text style={styles.dateValue}>{formatDate(item.date_debut)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Départ</Text>
                <Text style={styles.dateValue}>{formatDate(item.date_fin)}</Text>
              </View>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Durée</Text>
                <Text style={styles.dateValue}>{nuits} nuit{nuits !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            {total != null && (
              <View style={styles.priceRow}>
                <Ionicons name="cash-outline" size={15} color="#6b7280" />
                <Text style={styles.priceText}>Total estimé : {total} €</Text>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 14,
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e40af',
    flexShrink: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginTop: 14,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#ef4444',
    marginTop: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  guestMeta: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  dates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
  },
  dateItem: { alignItems: 'center' },
  dateLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  dateValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceText: { fontSize: 14, color: '#374151' },
});
