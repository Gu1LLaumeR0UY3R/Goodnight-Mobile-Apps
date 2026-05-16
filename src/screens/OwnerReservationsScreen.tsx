// src/screens/OwnerReservationsScreen.tsx
// Réservations reçues sur un bien spécifique (vue propriétaire)
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { biensService } from '../services/biensService';
import { reservationsService } from '../services/reservationsService';
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
  const [updating, setUpdating] = useState<Set<number>>(new Set());

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

  function getStatusStyle(statut?: string | null): { bg: string; color: string; label: string } {
    switch (statut) {
      case 'confirmee': return { bg: '#dcfce7', color: '#16a34a', label: 'Confirmée' };
      case 'refusee':   return { bg: '#fee2e2', color: '#ef4444', label: 'Refusée' };
      case 'annulee':   return { bg: '#f3f4f6', color: '#6b7280', label: 'Annulée' };
      default:          return { bg: '#fef3c7', color: '#d97706', label: 'En attente' };
    }
  }

  async function handleUpdateStatut(item: ReservationWithLocataire, newStatut: 'confirmee' | 'refusee') {
    const label = newStatut === 'confirmee' ? 'Confirmer' : 'Refuser';
    const guestName = `${item.prenom_locataire ?? ''} ${item.nom_locataire ?? ''}`.trim() || 'ce locataire';
    const message = `${label} la réservation de ${guestName} du ${formatDate(item.date_debut)} au ${formatDate(item.date_fin)} ?`;

    const doUpdate = async () => {
      setUpdating(prev => new Set([...prev, item.id_reservation]));
      try {
        await reservationsService.updateStatut(item.id_reservation, newStatut);
        setReservations(prev =>
          prev.map(r => r.id_reservation === item.id_reservation ? { ...r, statut: newStatut } : r)
        );
      } catch (e: any) {
        Alert.alert('Erreur', e?.message ?? 'Impossible de mettre à jour');
      } finally {
        setUpdating(prev => { const next = new Set(prev); next.delete(item.id_reservation); return next; });
      }
    };

    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : true) void doUpdate();
    } else {
      Alert.alert(label + ' la réservation', message, [
        { text: 'Annuler', style: 'cancel' },
        { text: label, onPress: () => { void doUpdate(); } },
      ]);
    }
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
        const statusStyle = getStatusStyle(item.statut);
        const isUpdating = updating.has(item.id_reservation);
        const isPending = item.statut === 'en_attente' || item.statut == null;

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
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
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

            {isPending && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleUpdateStatut(item, 'confirmee')}
                  disabled={isUpdating}
                >
                  {isUpdating
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="checkmark-outline" size={16} color="#fff" /><Text style={styles.acceptBtnText}>Confirmer</Text></>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.refuseBtn}
                  onPress={() => handleUpdateStatut(item, 'refusee')}
                  disabled={isUpdating}
                >
                  <Ionicons name="close-outline" size={16} color="#ef4444" />
                  <Text style={styles.refuseBtnText}>Refuser</Text>
                </TouchableOpacity>
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginLeft: 'auto',
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 10,
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  refuseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 10,
  },
  refuseBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
});
