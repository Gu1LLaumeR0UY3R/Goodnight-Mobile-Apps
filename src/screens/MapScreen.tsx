/**
 * src/screens/MapScreen.tsx
 *
 * RÔLE :
 *   Affiche tous les biens sur une carte interactive (React Native Maps).
 *   Chaque marqueur est cliquable et affiche une mini-fiche du bien.
 *
 * FONCTIONNALITÉS :
 *   - Géolocalisation : demande la permission, centre la carte sur l'utilisateur
 *   - Marqueurs       : un par bien, tap → callout avec photo + titre + prix
 *   - Filtrage texte  : barre de recherche filtre localement les marqueurs visibles
 *   - Rafraîchissement au focus (useScreenFocus) :
 *       Recharge tous les biens quand l'écran reprend le focus.
 *   - Polling 15 s :
 *       Vérifie si de nouveaux biens sont apparus. Si oui, stocke le résultat
 *       dans `pendingBiens` et affiche un badge "N nouveau(x)".
 *       L'utilisateur clique le badge pour appliquer (pas de rechargement auto).
 *
 * DÉPEND DE :
 *   - biensService.ts  (getAll)
 *   - apiClient.ts     (getImageUrl)
 *   - useAuth          (exclure les biens du propriétaire connecté)
 *   - useScreenFocus   (hook de rafraîchissement au focus)
 *
 * PATTERN SNAPSHOT (biensRef) :
 *   Le polling utilise `biensRef` (un useRef) pour lire la liste actuelle
 *   sans que setInterval dépende de l'état `biens` (ce qui forcerait
 *   de recréer l'intervalle à chaque chargement).
 */
// src/screens/MapScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AppState,
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { biensService } from '../services/biensService';
import { getImageUrl } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import { useScreenFocus } from '../hooks/useScreenFocus';
import type { Bien } from '../types/models';

// Carte mobile: marqueurs, géolocalisation, mini-fiches et détection de nouveaux biens.

const FRANCE_CENTER: Region = {
  latitude: 46.6,
  longitude: 2.35,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export default function MapScreen({ navigation }: any) {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [biens, setBiens] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedBien, setSelectedBien] = useState<Bien | null>(null);
  const [query, setQuery] = useState('');
  const [pendingBiens, setPendingBiens] = useState<Bien[] | null>(null);
  const [pendingNewCount, setPendingNewCount] = useState(0);

  const biensRef = useRef<Bien[]>([]);

  // Synchronise le snapshot à chaque mise à jour de la liste.
  // Le polling lit biensRef.current pour comparer sans dépendre
  // de l'état `biens` (ce qui forcerait de recréer l'intervalle).
  useEffect(() => {
    biensRef.current = biens;
  }, [biens]);

  // Compte le nombre de biens de `next` qui ne sont pas dans `current`
  function countNewBiens(current: Bien[], next: Bien[]) {
    const ids = new Set(current.map((b) => b.id_biens));
    return next.reduce((acc, b) => acc + (ids.has(b.id_biens) ? 0 : 1), 0);
  }

  async function loadBiens(forceRefresh = false) {
    if (forceRefresh) setRefreshing(true);
    try {
      const biensData = await biensService.getAll({
        limit: 80,
        exclude_owner_id: user?.id_locataire,
      });
      setBiens(biensData);
      setPendingBiens(null);
      setPendingNewCount(0);
    } finally {
      setLoading(false);
      if (forceRefresh) setRefreshing(false);
    }
  }

  const handleScreenFocus = useCallback(() => {
    loadBiens(false);
  }, [user?.id_locataire]);

  useScreenFocus(handleScreenFocus);

  // Polling 15 s : stocke les nouveaux biens dans `pendingBiens`
  // au lieu de les appliquer directement, pour ne pas bouger les
  // marqueurs pendant que l'utilisateur navigue sur la carte.
  // L'utilisateur voit un badge et clique pour appliquer.
  async function checkForNewBiens() {
    try {
      const next = await biensService.getAll({
        limit: 80,
        exclude_owner_id: user?.id_locataire,
      });
      const current = biensRef.current;
      const hasChanged =
        next.length !== current.length ||
        next.some((b, idx) => b.id_biens !== current[idx]?.id_biens);

      if (!hasChanged) return;

      setPendingBiens(next);
      setPendingNewCount(countNewBiens(current, next));
    } catch {
      // On ignore les erreurs silencieusement pour le polling.
    }
  }

  // Chargement initial + localisation utilisateur
  useEffect(() => {
    (async () => {
      await Promise.all([
        loadBiens(),
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            }
          } catch { /* permission refusée ou indisponible */ }
        })(),
      ]);
    })();
  }, [user?.id_locataire]);

  // Actualisation auto type Google Maps sans quitter l'écran.
  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') checkForNewBiens();
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.id_locataire]);

  // Recentrer sur la position de l'utilisateur
  function centerOnUser() {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    }, 600);
  }

  function openBienDetail(bienId: number) {
    navigation.navigate('Explorer', {
      screen: 'BienDetail',
      params: { id: bienId },
    });
  }

  // Biens avec coordonnées valides
  const biensAvecCoords = biens.filter(
    (b) => b.ville_latitude_deg != null && b.ville_longitude_deg != null,
  );

  const q = query.trim().toLowerCase();
  const filteredBiens = q
    ? biensAvecCoords.filter((b) =>
      [b.designation_bien, b.ville_nom, b.desc_type_bien]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)))
    : biensAvecCoords;

  useEffect(() => {
    if (!selectedBien) return;
    const visible = filteredBiens.some((b) => b.id_biens === selectedBien.id_biens);
    if (!visible) setSelectedBien(null);
  }, [filteredBiens, selectedBien]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchOverlay}>
        <Ionicons name="search-outline" size={18} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Recherche rapide : ville, type, nom"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          userLocation
            ? { ...userLocation, latitudeDelta: 0.8, longitudeDelta: 0.8 }
            : FRANCE_CENTER
        }
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelectedBien(null)}
      >
        {filteredBiens.map((b) => (
          <Marker
            key={b.id_biens}
            coordinate={{
              latitude: b.ville_latitude_deg!,
              longitude: b.ville_longitude_deg!,
            }}
            pinColor={selectedBien?.id_biens === b.id_biens ? '#7c3aed' : '#2563eb'}
            onPress={() => setSelectedBien(b)}
          >
            <Callout
              tooltip={false}
              onPress={() => openBienDetail(b.id_biens)}
            >
              <View style={styles.callout}>
                <Text style={styles.calloutTitle} numberOfLines={1}>{b.designation_bien}</Text>
                <Text style={styles.calloutVille}>{b.ville_nom}</Text>
                {(b.prix_semaine_min ?? b.prix_nuit) != null && (
                  <Text style={styles.calloutPrix}>{Math.round(Number(b.prix_semaine_min ?? b.prix_nuit))} €/sem</Text>
                )}
                <Text style={styles.calloutLink}>Voir le bien →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {selectedBien && (
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.previewCard}
          onPress={() => openBienDetail(selectedBien.id_biens)}
        >
          {getImageUrl(selectedBien.photo_principale) ? (
            <Image
              source={{ uri: getImageUrl(selectedBien.photo_principale)! }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.previewImage, styles.previewPlaceholder]}>
              <Ionicons name="home-outline" size={26} color="#94a3b8" />
            </View>
          )}
          <View style={styles.previewContent}>
            <Text style={styles.previewTitle} numberOfLines={1}>{selectedBien.designation_bien}</Text>
            <Text style={styles.previewVille} numberOfLines={1}>
              {selectedBien.ville_nom}
              {selectedBien.ville_code_postal ? ` (${selectedBien.ville_code_postal})` : ''}
            </Text>
            <View style={styles.previewMetaRow}>
              {(selectedBien.prix_semaine_min ?? selectedBien.prix_nuit) != null && (
                <Text style={styles.previewPrice}>{Math.round(Number(selectedBien.prix_semaine_min ?? selectedBien.prix_nuit))} €/sem</Text>
              )}
              {selectedBien.note_moyenne != null && Number(selectedBien.note_moyenne) > 0 && (
                <View style={styles.previewRating}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.previewRatingText}>{Number(selectedBien.note_moyenne).toFixed(1)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.previewLink}>Voir le bien</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Bouton recentrer */}
      {userLocation && (
        <TouchableOpacity style={styles.locateBtn} onPress={centerOnUser}>
          <Ionicons name="locate" size={22} color="#2563eb" />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.refreshBtn} onPress={() => loadBiens(true)} disabled={refreshing}>
        {refreshing
          ? <ActivityIndicator size="small" color="#2563eb" />
          : <Ionicons name="refresh" size={21} color="#2563eb" />}
      </TouchableOpacity>

      {pendingBiens && (
        <TouchableOpacity
          style={styles.liveUpdateBanner}
          onPress={() => {
            setBiens(pendingBiens);
            setPendingBiens(null);
            setPendingNewCount(0);
          }}
        >
          <Ionicons name="sparkles-outline" size={16} color="#fff" />
          <Text style={styles.liveUpdateText}>
            {pendingNewCount > 0
              ? `${pendingNewCount} nouveau(x) bien(s) · Appuyer pour actualiser`
              : 'Liste mise à jour · Appuyer pour actualiser'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Compteur de biens */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{filteredBiens.length} bien{filteredBiens.length !== 1 ? 's' : ''} affiché{filteredBiens.length !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },
  loader:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },

  searchOverlay: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    zIndex: 2,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
  },

  locateBtn: {
    position: 'absolute',
    bottom: 86,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 28,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

  refreshBtn: {
    position: 'absolute',
    bottom: 28,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 28,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

  badge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(37,99,235,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  liveUpdateBanner: {
    position: 'absolute',
    top: 112,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f766e',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveUpdateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  callout: {
    width: 200,
    padding: 10,
  },
  calloutTitle: { fontWeight: '700', fontSize: 14, color: '#111827', marginBottom: 2 },
  calloutVille: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  calloutPrix:  { fontSize: 13, color: '#2563eb', fontWeight: '600', marginBottom: 4 },
  calloutLink:  { fontSize: 12, color: '#7c3aed', fontWeight: '600' },

  previewCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  previewImage: {
    width: 110,
    height: 110,
    backgroundColor: '#e2e8f0',
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  previewVille: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  previewPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  previewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewRatingText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  previewLink: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '700',
  },
});
