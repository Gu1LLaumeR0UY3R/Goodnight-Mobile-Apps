/**
 * src/screens/MyBiensScreen.tsx
 *
 * RÔLE :
 *   Liste les biens qui appartiennent au propriétaire connecté.
 *   Chaque carte affiche : photo, titre, ville, statut de validation
 *   (badge cliquable via <StatusBadge>), et les boutons d'action.
 *
 * FONCTIONNALITÉS :
 *   - Chargement automatique à chaque focus (à chaque retour sur cet écran)
 *   - Bouton "Modifier"   → EditBienScreen  (passe l'objet bien complet)
 *   - Bouton "Photos"     → GalerieBienScreen
 *   - Bouton "Blocages"   → BienBlocagesScreen
 *   - StatusBadge : badge cliquable qui ouvre une modale détaillant le statut
 *     et le motif de refus si le bien a été refusé par l'administrateur
 *
 * DÉPEND DE :
 *   - biensService.ts    (getMine)
 *   - apiClient.ts       (getImageUrl)
 *   - StatusBadge        (composant badge + modale)
 *
 * NAVIGATION (entrées) :
 *   ProfileScreen → "Mes biens" → MyBiensScreen
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { biensService } from '../services/biensService';
import { getImageUrl } from '../services/apiClient';
import { StatusBadge } from '../components/StatusBadge';
import type { Bien } from '../types/models';

export default function MyBiensScreen({ navigation }: any) {
  const { user } = useAuth();
  const canPublish = user?.type_compte === 'proprietaire';
  const [biens, setBiens] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const data = await biensService.getMine();
      setBiens(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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

  if (biens.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="business-outline" size={54} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>Vous n'avez pas encore de bien</Text>
        <Text style={styles.emptyText}>Quand vous publierez des biens, ils seront gérables ici.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={biens}
      keyExtractor={(item) => String(item.id_biens)}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor="#2563eb"
        />
      }
      renderItem={({ item }) => {
        const photoUri = getImageUrl(item.photo_principale);
        const prix = item.prix_semaine_min ?? item.prix_nuit;

        return (
          <View style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Explorer', {
                screen: 'BienDetail',
                params: { id: item.id_biens },
              })}
              style={styles.cardTop}
            >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Ionicons name="home-outline" size={28} color="#cbd5e1" />
              </View>
            )}

            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>{item.designation_bien}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.ville_nom ?? 'Ville inconnue'}
                {item.desc_type_bien ? ` · ${item.desc_type_bien}` : ''}
              </Text>

              <View style={styles.rowBottom}>
                <StatusBadge bien={item} />
                <Text style={styles.priceText}>
                  {prix != null ? `${Math.round(Number(prix))} €/sem` : 'Prix indisponible'}
                </Text>
              </View>
            </View>
            </TouchableOpacity>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditBien', { bien: item })}>
                <Ionicons name="pencil-outline" size={16} color="#1d4ed8" />
                <Text style={styles.actionBtnText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('GalerieBien', { bienId: item.id_biens, bienTitle: item.designation_bien })}>
                <Ionicons name="images-outline" size={16} color="#1d4ed8" />
                <Text style={styles.actionBtnText}>Photos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('BienBlocages', { bienId: item.id_biens, bienTitle: item.designation_bien })}>
                <Ionicons name="calendar-outline" size={16} color="#1d4ed8" />
                <Text style={styles.actionBtnText}>Blocages</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
      ListHeaderComponent={
        canPublish ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddBien')}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Ajouter un bien</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Vous êtes inscrit en tant que locataire. Seuls les propriétaires peuvent publier des biens.
            </Text>
          </View>
        )
      }
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
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTop: {
    flexDirection: 'row',
  },
  photo: {
    width: 95,
    height: 92,
    backgroundColor: '#e2e8f0',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    marginTop: 3,
    fontSize: 13,
    color: '#6b7280',
  },
  rowBottom: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtn: {
    marginBottom: 12,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  actionsRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
  },
  actionBtnText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 13,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priceText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 10,
    color: '#374151',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 14,
  },
  infoText: {
    color: '#1e293b',
    fontSize: 14,
    lineHeight: 20,
  },
});
