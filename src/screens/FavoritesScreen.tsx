// src/screens/FavoritesScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { favorisService } from '../services/favorisService';
import { getImageUrl } from '../services/apiClient';
import { getErrorMessage } from '../utils/errorHandler';
import type { Bien } from '../types/models';

export default function FavoritesScreen({ navigation }: any) {
  const [favoris, setFavoris] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const loadFavoris = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await favorisService.getAll();
      setFavoris(data);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavoris();
    }, [loadFavoris])
  );

  async function handleRemove(id_biens: number) {
    setRemovingId(id_biens);
    try {
      await favorisService.remove(id_biens);
      setFavoris((prev) => prev.filter((b) => b.id_biens !== id_biens));
    } catch (e: unknown) {
      Alert.alert('Erreur', getErrorMessage(e));
    } finally {
      setRemovingId(null);
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
        <TouchableOpacity style={styles.retryBtn} onPress={loadFavoris}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (favoris.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="heart-outline" size={56} color="#d1d5db" />
        <Text style={styles.emptyTitle}>Aucun favori pour le moment</Text>
        <Text style={styles.emptySub}>Ajoutez des biens avec l'icône coeur pour un accès rapide.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={favoris}
      keyExtractor={(item) => String(item.id_biens)}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const photoUri = getImageUrl(item.photo_principale);
        const isRemoving = removingId === item.id_biens;

        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Explorer', {
              screen: 'BienDetail',
              params: { id: item.id_biens },
            })}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Ionicons name="home-outline" size={28} color="#d1d5db" />
              </View>
            )}

            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={1}>{item.designation_bien ?? 'Logement'}</Text>
              <View style={styles.rowIcon}>
                <Ionicons name="location-outline" size={13} color="#6b7280" />
                <Text style={styles.city} numberOfLines={1}>{item.ville_nom ?? 'Localisation inconnue'}</Text>
              </View>
              <Text style={styles.quickAccess}>Appuyez pour voir le détail</Text>
            </View>

            <TouchableOpacity
              style={styles.removeBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleRemove(item.id_biens);
              }}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="heart-dislike-outline" size={19} color="#ef4444" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 16, gap: 12, backgroundColor: '#f9fafb' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 24,
    gap: 8,
  },
  errorText: { fontSize: 14, color: '#374151', textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  photo: { width: 96, height: 96 },
  photoPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 5 },
  rowIcon: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  city: { fontSize: 12, color: '#6b7280', flex: 1 },
  quickAccess: { marginTop: 7, fontSize: 12, color: '#2563eb', fontWeight: '600' },
  removeBtn: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#f3f4f6',
    backgroundColor: '#fff1f2',
  },
});
