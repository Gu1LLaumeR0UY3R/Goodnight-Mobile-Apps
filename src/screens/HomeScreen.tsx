/**
 * src/screens/HomeScreen.tsx
 *
 * RÔLE :
 *   Écran principal de l'application. Affiche la liste paginiée des biens
 *   disponibles, avec un panneau de filtres avancés (prix, équipements,
 *   distances, dates, note, tri).
 *
 * FONCTIONNALITÉS :
 *   - Pagination   : 12 biens par page, bouton "Charger plus"
 *   - Filtres      : panneau modal, s'appliquent via "Appliquer"
 *   - Favoris      : clic sur le cœur → bascule favori (nécessite connexion)
 *   - Rafraîchissement au focus (useScreenFocus) :
 *       Quand l'utilisateur revient sur cet écran (retour depuis détail,
 *       changement d'onglet), la liste est rechargée silencieusement.
 *   - Polling 20 s :
 *       Vérifie toutes les 20 secondes si de nouveaux biens sont disponibles.
 *       Si oui, affiche un badge "N nouveau(x)" — l'utilisateur clique
 *       pour appliquer le rafraîchissement (pas d'auto-scroll intrusif).
 *
 * DÉPEND DE :
 *   - apiClient.ts       (apiFetch, getImageUrl)
 *   - favorisService.ts  (toggle favori)
 *   - useAuth            (id de l'utilisateur pour exclure ses propres biens)
 *   - useScreenFocus     (hook de rafraîchissement au focus)
 *
 * NAVIGATION :
 *   BienDetail  ← Tap sur une carte de bien
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, ScrollView, Image, ActivityIndicator, StyleSheet, Platform,
  AppState, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Calendar, DateData } from 'react-native-calendars';
import { apiFetch, getImageUrl } from '../services/apiClient';
import { favorisService } from '../services/favorisService';
import { useAuth } from '../hooks/useAuth';
import { useScreenFocus } from '../hooks/useScreenFocus';
import type { Bien } from '../types/models';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TypeBien { id_typebien: number; desc_type_bien: string; }

interface FiltersState {
  search: string;
  villes: string[];
  types: number[];
  equipements: number[];
  prix_min?: number;
  prix_max?: number;
  min_note?: number;
  voyageurs?: number;
  distance_km?: number;
  date_debut?: string;
  date_fin?: string;
  sort: 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc';
}

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PAGE_SIZE = 12;
const PRICE_MAX = 3000;

const DEFAULT_FILTERS: FiltersState = {
  search: '', villes: [], types: [], equipements: [],
  sort: 'relevance',
};

const DISTANCE_OPTIONS: (number | undefined)[] = [undefined, 5, 10, 20, 50, 100];

const NOTE_OPTIONS = [
  { label: 'Toutes', value: undefined },
  { label: '★4+',   value: 4 },
  { label: '★4.5+', value: 4.5 },
  { label: '★5',    value: 5 },
];

const SORT_OPTIONS: { label: string; value: FiltersState['sort'] }[] = [
  { label: 'Récents',  value: 'relevance'   },
  { label: 'Prix ↑',   value: 'price_asc'   },
  { label: 'Prix ↓',   value: 'price_desc'  },
  { label: 'Note ↓',   value: 'rating_desc' },
];

const EQUIPMENT_CATEGORIES = [
  { label: 'Confort',    items: [{ id: 1, label: 'WiFi' }, { id: 2, label: 'Clim' }, { id: 3, label: 'TV' }, { id: 4, label: 'Lave-linge' }] },
  { label: 'Extérieur',  items: [{ id: 5, label: 'Jacuzzi' }, { id: 6, label: 'Piscine' }, { id: 7, label: 'Terrasse' }, { id: 8, label: 'Parking' }] },
  { label: 'Cuisine',    items: [{ id: 9, label: 'Cuisine équipée' }, { id: 10, label: 'Micro-ondes' }, { id: 11, label: 'Lave-vaisselle' }, { id: 12, label: 'Four' }] },
  { label: 'Services',   items: [{ id: 13, label: 'Bébé OK' }, { id: 14, label: 'Accessible PMR' }] },
];

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildParams(filters: FiltersState, page: number, excludeOwnerId?: number): URLSearchParams {
  const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort: filters.sort });
  if (filters.search)              p.set('search', filters.search);
  if (filters.villes.length)       p.set('villes', filters.villes.join(','));
  if (filters.types.length)        p.set('types', filters.types.join(','));
  if (filters.equipements.length)  p.set('equipements', filters.equipements.join(','));
  if (filters.prix_min != null)    p.set('prix_min', String(filters.prix_min));
  if (filters.prix_max != null)    p.set('prix_max', String(filters.prix_max));
  if (filters.min_note != null)    p.set('min_note', String(filters.min_note));
  if (filters.voyageurs != null)   p.set('voyageurs', String(filters.voyageurs));
  if (filters.date_debut)          p.set('date_debut', filters.date_debut);
  if (filters.date_fin)            p.set('date_fin', filters.date_fin);
  if (filters.distance_km != null) p.set('distance_km', String(filters.distance_km));
  if (excludeOwnerId != null)      p.set('exclude_owner_id', String(excludeOwnerId));
  return p;
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function HomeScreen({ navigation }: any) {
  const { isAuthenticated, user } = useAuth();

  const [biens, setBiens]           = useState<Bien[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [livePendingCount, setLivePendingCount] = useState(0);
  const pageRef                     = useRef(1);
  // Snapshot de la liste pour le polling : permet de comparer sans
  // que setInterval dépende de l'état `biens` (ce qui forcerait de
  // recréer l'intervalle à chaque mise à jour de la liste)
  const biensRef                    = useRef<Bien[]>([]);

  const [activeFilters, setActiveFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters]   = useState<FiltersState>(DEFAULT_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const [previewCount, setPreviewCount]   = useState<number | null>(null);

  const [typeOptions, setTypeOptions]     = useState<TypeBien[]>([]);
  const [typesLoading, setTypesLoading]   = useState(true);
  const [openCats, setOpenCats]           = useState<Record<string, boolean>>({ Confort: true, Extérieur: true });
  const [favoriteIds, setFavoriteIds]     = useState<Set<number>>(new Set());
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<Set<number>>(new Set());

  // Localisation autocomplete
  const [villeQuery, setVilleQuery]           = useState('');
  const [villeSuggestions, setVilleSuggestions] = useState<string[]>([]);
  const [villeLoading, setVilleLoading]       = useState(false);
  const villeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load types once
  useEffect(() => {
    setTypesLoading(true);
    apiFetch<TypeBien[]>('/biens/types')
      .then(d => { setTypeOptions(d); setTypesLoading(false); })
      .catch(() => setTypesLoading(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }

    let cancelled = false;
    favorisService.getAll()
      .then((data) => {
        if (cancelled) return;
        setFavoriteIds(new Set(data.map((b) => b.id_biens)));
      })
      .catch(() => {
        if (!cancelled) setFavoriteIds(new Set());
      });

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Fetch list
  const fetchBiens = useCallback(async (filters: FiltersState, reset: boolean) => {
    if (reset) { setLoading(true); setError(null); pageRef.current = 1; }
    else        setLoadingMore(true);

    try {
      const page = reset ? 1 : pageRef.current;
      const data = await apiFetch<Bien[]>(`/biens?${buildParams(filters, page, user?.id_locataire)}`);
      if (reset) setBiens(data);
      else       setBiens(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      if (!reset) pageRef.current += 1;
    } catch (err: any) {
      setError(err.message ?? 'Erreur de chargement');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id_locataire]);

  useEffect(() => {
    // Synchronise le snapshot à chaque fois que la liste change
    biensRef.current = biens;
  }, [biens]);

  useEffect(() => { fetchBiens(activeFilters, true); }, [activeFilters, fetchBiens]);

  const refreshNow = useCallback(async () => {
    setRefreshing(true);
    await fetchBiens(activeFilters, true);
    setRefreshing(false);
    setLivePendingCount(0);
  }, [activeFilters, fetchBiens]);

  useScreenFocus(refreshNow);

  // Polling 20 s : vérifie si de nouveaux biens sont disponibles.
  // N'applique PAS le rafraîchissement automatiquement pour ne pas
  // perturber la navigation de l'utilisateur. Affiche un badge à la place.
  useEffect(() => {
    const interval = setInterval(async () => {
      // Ne poll pas si l'app est en arrière-plan ou si un chargement est en cours
      if (AppState.currentState !== 'active' || loading || loadingMore) return;
      try {
        const next = await apiFetch<Bien[]>(`/biens?${buildParams(activeFilters, 1, user?.id_locataire)}`);
        const current = biensRef.current;
        const hasChanged =
          next.length !== current.length ||
          next.some((b, idx) => b.id_biens !== current[idx]?.id_biens);

        if (!hasChanged) return;

        // Compte uniquement les ID absents de la liste actuelle
        const currentIds = new Set(current.map((b) => b.id_biens));
        const addedCount = next.reduce((acc, b) => acc + (currentIds.has(b.id_biens) ? 0 : 1), 0);
        setLivePendingCount(addedCount || 1);
      } catch {
        // Ignore polling errors; manual refresh remains available.
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [activeFilters, loading, loadingMore, user?.id_locataire]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      pageRef.current += 1;
      fetchBiens(activeFilters, false);
    }
  }, [loadingMore, hasMore, loading, activeFilters, fetchBiens]);

  // Live count preview in modal
  useEffect(() => {
    if (!filterVisible) return;
    if (countTimer.current) clearTimeout(countTimer.current);
    setPreviewCount(null);
    countTimer.current = setTimeout(async () => {
      try {
        const d = await apiFetch<{ total: number }>(`/biens/count?${buildParams(draftFilters, 1, user?.id_locataire)}`);
        setPreviewCount(d.total);
      } catch { setPreviewCount(null); }
    }, 400);
    return () => { if (countTimer.current) clearTimeout(countTimer.current); };
  }, [draftFilters, filterVisible, user?.id_locataire]);

  // Search debounce
  function handleSearch(text: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setActiveFilters(p => ({ ...p, search: text }));
    }, 500);
  }

  // Modal
  function openModal()  { setDraftFilters({ ...activeFilters }); setFilterVisible(true); }
  function closeModal() { setFilterVisible(false); }
  function applyFilters()  { setActiveFilters({ ...draftFilters }); setFilterVisible(false); }
  function resetDraft()    { setDraftFilters({ ...DEFAULT_FILTERS }); }
  function clearAll()      { setActiveFilters({ ...DEFAULT_FILTERS }); }

  // Active chips summary
  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    activeFilters.villes.forEach(v =>
      chips.push({ label: `📍 ${v}`, clear: () => setActiveFilters(p => ({ ...p, villes: p.villes.filter(x => x !== v) })) })
    );
    if (activeFilters.types.length)
      chips.push({ label: `${activeFilters.types.length} type(s)`, clear: () => setActiveFilters(p => ({ ...p, types: [] })) });
    if (activeFilters.prix_min != null || activeFilters.prix_max != null)
      chips.push({ label: `${activeFilters.prix_min ?? '?'}€ – ${activeFilters.prix_max ?? '?'}€`, clear: () => setActiveFilters(p => ({ ...p, prix_min: undefined, prix_max: undefined })) });
    if (activeFilters.min_note != null)
      chips.push({ label: `★ ${activeFilters.min_note}+`, clear: () => setActiveFilters(p => ({ ...p, min_note: undefined })) });
    if (activeFilters.voyageurs != null)
      chips.push({ label: `${activeFilters.voyageurs} voy.`, clear: () => setActiveFilters(p => ({ ...p, voyageurs: undefined })) });
    if (activeFilters.distance_km != null)
      chips.push({ label: `< ${activeFilters.distance_km}km`, clear: () => setActiveFilters(p => ({ ...p, distance_km: undefined })) });
    if (activeFilters.equipements.length)
      chips.push({ label: `${activeFilters.equipements.length} équip.`, clear: () => setActiveFilters(p => ({ ...p, equipements: [] })) });
    if (activeFilters.date_debut)
      chips.push({ label: `${activeFilters.date_debut} → ${activeFilters.date_fin ?? '?'}`, clear: () => setActiveFilters(p => ({ ...p, date_debut: undefined, date_fin: undefined })) });
    return chips;
  }, [activeFilters]);

  const toggleCardFavori = useCallback(async (id_biens: number) => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    if (favoriteBusyIds.has(id_biens)) return;
    const wasFavori = favoriteIds.has(id_biens);

    setFavoriteBusyIds((prev) => new Set(prev).add(id_biens));
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavori) next.delete(id_biens);
      else next.add(id_biens);
      return next;
    });

    try {
      if (wasFavori) await favorisService.remove(id_biens);
      else await favorisService.add(id_biens);
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavori) next.add(id_biens);
        else next.delete(id_biens);
        return next;
      });
    } finally {
      setFavoriteBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id_biens);
        return next;
      });
    }
  }, [favoriteBusyIds, favoriteIds, isAuthenticated, navigation]);

  // â”€â”€ Bien card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderBien = useCallback(({ item }: { item: Bien }) => {
    const photoUri = getImageUrl(item.photo_principale);
    const price = item.prix_semaine_min ?? item.prix_nuit;
    const isFavori = favoriteIds.has(item.id_biens);
    const isBusy = favoriteBusyIds.has(item.id_biens);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('BienDetail', { id: item.id_biens })}
      >
        {photoUri ? (
          <View>
            <Image source={{ uri: photoUri }} style={styles.cardImage} resizeMode="cover" />
            <TouchableOpacity
              style={styles.cardFavBtn}
              onPress={(e) => {
                e.stopPropagation();
                toggleCardFavori(item.id_biens);
              }}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={isFavori ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavori ? '#ef4444' : '#fff'}
                />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="home-outline" size={40} color="#d1d5db" />
            </View>
            <TouchableOpacity
              style={styles.cardFavBtn}
              onPress={(e) => {
                e.stopPropagation();
                toggleCardFavori(item.id_biens);
              }}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={isFavori ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavori ? '#ef4444' : '#fff'}
                />
              )}
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.designation_bien}</Text>
          {item.desc_type_bien && <Text style={styles.cardType}>{item.desc_type_bien}</Text>}
          <Text style={styles.cardCity} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color="#9ca3af" /> {item.ville_nom ?? '—'}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>
              {price != null ? `${Math.round(Number(price))} €/sem` : '— €/sem'}
            </Text>
            <View style={styles.cardRating}>
              <Ionicons name="star" size={13} color="#fbbf24" />
              <Text style={styles.cardRatingText}>
                {Number(item.note_moyenne ?? 0).toFixed(1)}
                {item.nb_avis ? ` (${item.nb_avis})` : ''}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [favoriteBusyIds, favoriteIds, navigation, toggleCardFavori]);

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const applyLabel = `Afficher les résultats${previewCount != null ? ` (${previewCount})` : ''}`;

  return (
    <View style={styles.container}>

      {/* â”€â”€ Top bar: search + filter button â”€â”€â”€ */}
      <View style={styles.topRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un bien..."
            placeholderTextColor="#9ca3af"
            onChangeText={handleSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={openModal}>
          <Ionicons name="options-outline" size={18} color="#1d4ed8" />
          <Text style={styles.filterBtnText}>Filtres</Text>
          {activeChips.length > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{activeChips.length}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* â”€â”€ Active filter chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeChips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {activeChips.map((chip, i) => (
            <TouchableOpacity key={i} style={styles.chip} onPress={chip.clear}>
              <Text style={styles.chipText}>{chip.label}</Text>
              <Ionicons name="close-circle" size={14} color="#6b7280" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.clearChip} onPress={clearAll}>
            <Text style={styles.clearChipText}>Tout effacer</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* â”€â”€ Sort chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll} contentContainerStyle={styles.sortRow}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.sortChip, activeFilters.sort === opt.value && styles.sortChipActive]}
            onPress={() => setActiveFilters(p => ({ ...p, sort: opt.value }))}
          >
            <Text style={[styles.sortText, activeFilters.sort === opt.value && styles.sortTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* â”€â”€ Error banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity onPress={() => fetchBiens(activeFilters, true)}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {livePendingCount > 0 && (
        <TouchableOpacity style={styles.liveBanner} onPress={refreshNow}>
          <Ionicons name="sparkles-outline" size={15} color="#fff" />
          <Text style={styles.liveBannerText}>
            {livePendingCount} nouveau(x) bien(s) disponible(s) · Appuyer pour actualiser
          </Text>
        </TouchableOpacity>
      )}

      {/* â”€â”€ List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {loading && biens.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Chargement des biens...</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={biens}
          keyExtractor={item => String(item.id_biens)}
          renderItem={renderBien}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshNow}
              tintColor="#3b82f6"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={biens.length === 0 ? styles.centered : { paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="home-outline" size={52} color="#e5e7eb" />
              <Text style={styles.emptyTitle}>Aucun bien trouvé</Text>
              <Text style={styles.emptyText}>Modifiez vos filtres pour voir plus de résultats.</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#3b82f6" /> : null}
        />
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ FILTER MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal visible={filterVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <View style={styles.modal}>

          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={resetDraft}>
              <Text style={styles.clearText}>Tout effacer</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable sections */}
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>

            {/* Prix */}
            <Text style={styles.sectionTitle}>Prix par semaine</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{draftFilters.prix_min ?? 0} €</Text>
              <Text style={styles.priceSep}>–</Text>
              <Text style={styles.priceLabel}>{draftFilters.prix_max ?? PRICE_MAX} €{draftFilters.prix_max == null ? '+' : ''}</Text>
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderBound}>0 €</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sliderSubLabel}>Min</Text>
                <Slider
                  style={{ width: '100%' }}
                  minimumValue={0}
                  maximumValue={PRICE_MAX}
                  step={50}
                  value={draftFilters.prix_min ?? 0}
                  minimumTrackTintColor="#bfdbfe"
                  maximumTrackTintColor="#e5e7eb"
                  thumbTintColor="#2563eb"
                  onValueChange={v => setDraftFilters(p => ({ ...p, prix_min: v === 0 ? undefined : v }))}
                />
                <Text style={styles.sliderSubLabel}>Max</Text>
                <Slider
                  style={{ width: '100%' }}
                  minimumValue={0}
                  maximumValue={PRICE_MAX}
                  step={50}
                  value={draftFilters.prix_max ?? PRICE_MAX}
                  minimumTrackTintColor="#2563eb"
                  maximumTrackTintColor="#bfdbfe"
                  thumbTintColor="#1d4ed8"
                  onValueChange={v => setDraftFilters(p => ({ ...p, prix_max: v === PRICE_MAX ? undefined : v }))}
                />
              </View>
              <Text style={styles.sliderBound}>{PRICE_MAX} €</Text>
            </View>

            {/* Types */}
            <Text style={styles.sectionTitle}>Type de logement</Text>
            {typesLoading ? (
              <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 8 }} />
            ) : typeOptions.length === 0 ? (
              <Text style={S.hint}>Aucun type disponible</Text>
            ) : (
              <View style={styles.typeGrid}>
                {typeOptions.map(t => {
                  const sel = draftFilters.types.includes(t.id_typebien);
                  return (
                    <TouchableOpacity
                      key={t.id_typebien}
                      style={[styles.typeCard, sel && styles.typeCardSel]}
                      onPress={() => setDraftFilters(p => ({
                        ...p,
                        types: sel ? p.types.filter(id => id !== t.id_typebien) : [...p.types, t.id_typebien],
                      }))}
                    >
                      <Ionicons name="home-outline" size={15} color={sel ? '#1d4ed8' : '#6b7280'} />
                      <Text style={[styles.typeCardText, sel && styles.typeCardTextSel]}>{t.desc_type_bien}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Équipements */}
            <Text style={styles.sectionTitle}>Équipements</Text>
            {EQUIPMENT_CATEGORIES.map(cat => {
              const checked = cat.items.filter(i => draftFilters.equipements.includes(i.id)).length;
              const open = openCats[cat.label] ?? false;
              return (
                <View key={cat.label} style={styles.accordion}>
                  <TouchableOpacity style={styles.accHeader} onPress={() => setOpenCats(p => ({ ...p, [cat.label]: !p[cat.label] }))}>
                    <Text style={styles.accTitle}>
                      {cat.label}{checked > 0 ? <Text style={styles.accBadge}> ●{checked}</Text> : null}
                    </Text>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color="#6b7280" />
                  </TouchableOpacity>
                  {open && (
                    <View style={styles.accBody}>
                      {cat.items.map(item => {
                        const on = draftFilters.equipements.includes(item.id);
                        return (
                          <TouchableOpacity key={item.id} style={styles.checkRow}
                            onPress={() => setDraftFilters(p => ({
                              ...p,
                              equipements: on ? p.equipements.filter(id => id !== item.id) : [...p.equipements, item.id],
                            }))}
                          >
                            <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? '#2563eb' : '#d1d5db'} />
                            <Text style={[styles.checkLabel, on && styles.checkLabelOn]}>{item.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Disponibilité */}
            <Text style={styles.sectionTitle}>Disponibilité</Text>
            {/* Selected dates summary */}
            {(draftFilters.date_debut || draftFilters.date_fin) && (
              <View style={styles.calDateRow}>
                <View style={styles.calDateBadge}>
                  <Ionicons name="log-in-outline" size={14} color="#2563eb" />
                  <Text style={styles.calDateText}>{draftFilters.date_debut ?? '—'}</Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color="#9ca3af" />
                <View style={styles.calDateBadge}>
                  <Ionicons name="log-out-outline" size={14} color="#2563eb" />
                  <Text style={styles.calDateText}>{draftFilters.date_fin ?? '—'}</Text>
                </View>
                <TouchableOpacity onPress={() => setDraftFilters(p => ({ ...p, date_debut: undefined, date_fin: undefined }))} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            )}
            <Calendar
              markingType="period"
              markedDates={(() => {
                const marks: Record<string, any> = {};
                const start = draftFilters.date_debut;
                const end = draftFilters.date_fin;
                if (!start) return marks;
                marks[start] = { startingDay: true, color: '#2563eb', textColor: '#fff' };
                if (end && end > start) {
                  // fill in between
                  let cur = new Date(start);
                  cur.setDate(cur.getDate() + 1);
                  const endDate = new Date(end);
                  while (cur < endDate) {
                    const key = cur.toISOString().slice(0, 10);
                    marks[key] = { color: '#dbeafe', textColor: '#1d4ed8' };
                    cur.setDate(cur.getDate() + 1);
                  }
                  marks[end] = { endingDay: true, color: '#2563eb', textColor: '#fff' };
                } else if (!end) {
                  marks[start] = { startingDay: true, endingDay: true, color: '#2563eb', textColor: '#fff' };
                }
                return marks;
              })()}
              onDayPress={(day: DateData) => {
                const d = day.dateString;
                setDraftFilters(p => {
                  // If no start or both set → start fresh
                  if (!p.date_debut || (p.date_debut && p.date_fin)) {
                    return { ...p, date_debut: d, date_fin: undefined };
                  }
                  // Start is set but no end → set end (ensure end >= start)
                  if (d < p.date_debut) return { ...p, date_debut: d, date_fin: undefined };
                  return { ...p, date_fin: d };
                });
              }}
              minDate={new Date().toISOString().slice(0, 10)}
              theme={{
                backgroundColor: '#fff',
                calendarBackground: '#fff',
                selectedDayBackgroundColor: '#2563eb',
                selectedDayTextColor: '#fff',
                todayTextColor: '#2563eb',
                dayTextColor: '#111827',
                textDisabledColor: '#d1d5db',
                dotColor: '#2563eb',
                monthTextColor: '#111827',
                textMonthFontWeight: '700',
                arrowColor: '#2563eb',
                textDayFontSize: 14,
                textMonthFontSize: 15,
              }}
              style={styles.calendarBox}
            />

            {/* Localisation */}
            <Text style={styles.sectionTitle}>Localisation</Text>
            {/* Selected cities chips */}
            {draftFilters.villes.length > 0 && (
              <View style={styles.villePills}>
                {draftFilters.villes.map(v => (
                  <TouchableOpacity
                    key={v}
                    style={styles.villePill}
                    onPress={() => setDraftFilters(p => ({ ...p, villes: p.villes.filter(x => x !== v) }))}
                  >
                    <Text style={styles.villePillText}>{v}</Text>
                    <Ionicons name="close" size={12} color="#1d4ed8" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {/* Autocomplete input */}
            <View style={styles.villeInputWrap}>
              <Ionicons name="search-outline" size={15} color="#9ca3af" style={{ marginLeft: 10 }} />
              <TextInput
                style={styles.villeInput}
                placeholder="Ajouter une ville..."
                placeholderTextColor="#9ca3af"
                value={villeQuery}
                onChangeText={text => {
                  setVilleQuery(text);
                  if (villeTimer.current) clearTimeout(villeTimer.current);
                  if (!text.trim()) { setVilleSuggestions([]); return; }
                  villeTimer.current = setTimeout(async () => {
                    setVilleLoading(true);
                    try {
                      const res = await apiFetch<string[]>(`/biens/villes?q=${encodeURIComponent(text.trim())}`);
                      setVilleSuggestions(res.filter(s => !draftFilters.villes.includes(s)));
                    } catch { setVilleSuggestions([]); }
                    finally { setVilleLoading(false); }
                  }, 300);
                }}
              />
              {villeLoading && <ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 10 }} />}
            </View>
            {/* Suggestions dropdown */}
            {villeSuggestions.length > 0 && (
              <View style={styles.villeSuggestions}>
                {villeSuggestions.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={styles.villeSuggRow}
                    onPress={() => {
                      if (!draftFilters.villes.includes(s)) {
                        setDraftFilters(p => ({ ...p, villes: [...p.villes, s] }));
                      }
                      setVilleQuery('');
                      setVilleSuggestions([]);
                    }}
                  >
                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                    <Text style={styles.villeSuggText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={S.subLabel}>Distance max</Text>
            <View style={styles.chipRow}>
              {DISTANCE_OPTIONS.map(opt => {
                const label = opt == null ? 'Tout' : `${opt}km`;
                const sel = draftFilters.distance_km === opt;
                return (
                  <TouchableOpacity key={label} style={[styles.optChip, sel && styles.optChipSel]}
                    onPress={() => setDraftFilters(p => ({ ...p, distance_km: opt }))}
                  >
                    <Text style={[styles.optChipText, sel && styles.optChipTextSel]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Note minimale */}
            <Text style={styles.sectionTitle}>Note minimale</Text>
            <View style={styles.chipRow}>
              {NOTE_OPTIONS.map(opt => {
                const sel = draftFilters.min_note === opt.value;
                return (
                  <TouchableOpacity key={opt.label} style={[styles.optChip, sel && styles.optChipSel]}
                    onPress={() => setDraftFilters(p => ({ ...p, min_note: opt.value }))}
                  >
                    <Text style={[styles.optChipText, sel && styles.optChipTextSel]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Voyageurs */}
            <Text style={styles.sectionTitle}>Voyageurs</Text>
            <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn}
                onPress={() => setDraftFilters(p => ({ ...p, voyageurs: Math.max(1, (p.voyageurs ?? 1) - 1) }))}>
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterVal}>{draftFilters.voyageurs ?? 1}</Text>
              <TouchableOpacity style={styles.counterBtn}
                onPress={() => setDraftFilters(p => ({ ...p, voyageurs: (p.voyageurs ?? 1) + 1 }))}>
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>

          {/* Sticky bottom apply button */}
          <TouchableOpacity style={styles.applyBtnBottom} onPress={applyFilters}>
            <Text style={styles.applyBtnText}>{applyLabel}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// â”€â”€ Shared inline style helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const S = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dash:     { color: '#9ca3af', fontSize: 16 },
  subLabel: { marginTop: 10, marginBottom: 6, fontSize: 13, color: '#6b7280', fontWeight: '500' },
  hint:     { color: '#9ca3af', fontSize: 13, marginBottom: 8 },
});

// â”€â”€ Main styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SHADOW = Platform.OS === 'web'
  ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
  : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },

  // Top bar
  topRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchBox:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f9fafb', borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 9 },
  searchInput:   { flex: 1, fontSize: 14, color: '#111827' },
  filterBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8' },
  badge:         { marginLeft: 4, backgroundColor: '#2563eb', borderRadius: 999, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText:     { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Active chips
  chipsRow:      { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  chip:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText:      { fontSize: 12, color: '#374151', fontWeight: '500' },
  clearChip:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  clearChipText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },

  // Sort
  sortScroll:    { flexShrink: 0, flexGrow: 0 },
  sortRow:       { paddingHorizontal: 14, paddingVertical: 6, gap: 6, alignItems: 'center' },
  sortChip:      { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  sortChipActive:{ borderColor: '#60a5fa', backgroundColor: '#eff6ff' },
  sortText:      { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  sortTextActive:{ color: '#1d4ed8', fontWeight: '700' },

  // Error
  errorBanner: { margin: 12, padding: 12, backgroundColor: '#fff1f2', borderRadius: 10, borderWidth: 1, borderColor: '#fecaca' },
  errorMsg:    { color: '#991b1b', fontSize: 14 },
  retryText:   { marginTop: 6, color: '#b91c1c', fontWeight: '600' },
  liveBanner: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#0f766e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // States
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:  { marginTop: 12, color: '#6b7280' },
  emptyBox:     { alignItems: 'center', paddingTop: 64, paddingHorizontal: 24 },
  emptyTitle:   { marginTop: 12, fontSize: 17, fontWeight: '700', color: '#374151' },
  emptyText:    { marginTop: 6, textAlign: 'center', color: '#9ca3af' },

  // Card
  card:              { backgroundColor: '#fff', marginHorizontal: 14, marginVertical: 6, borderRadius: 14, overflow: 'hidden', ...SHADOW },
  cardImage:         { width: '100%', height: 190 },
  cardImagePlaceholder: { width: '100%', height: 190, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  cardFavBtn:        { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'center', alignItems: 'center' },
  cardBody:          { padding: 14 },
  cardTitle:         { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardType:          { fontSize: 12, color: '#6b7280', marginBottom: 3 },
  cardCity:          { fontSize: 13, color: '#9ca3af', marginBottom: 8 },
  cardFooter:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice:         { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  cardRating:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardRatingText:    { fontSize: 13, color: '#374151' },

  // Modal
  modal:        { flex: 1, backgroundColor: '#fff' },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: '#111827' },
  clearText:    { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  applyBtnBottom:{ margin: 16, backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalScroll:  { paddingHorizontal: 16, paddingBottom: 20 },

  // Price sliders
  priceRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  priceLabel:   { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  priceSep:     { fontSize: 15, color: '#9ca3af' },
  sliderRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderBound:  { fontSize: 11, color: '#9ca3af', width: 36, textAlign: 'center' },
  sliderSubLabel:{ fontSize: 11, color: '#6b7280', marginBottom: 4, marginLeft: 2 },
  priceInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 16 },
  priceInputGroup: { flex: 1 },
  priceInput:    { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: '#f9fafb', color: '#111827' },

  // Calendar
  calendarBox:   { borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', marginBottom: 4 },
  calDateRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, padding: 10, backgroundColor: '#eff6ff', borderRadius: 10 },
  calDateBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calDateText:   { fontSize: 13, fontWeight: '600', color: '#1d4ed8' },

  // Localisation autocomplete
  villePills:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  villePill:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  villePillText:   { fontSize: 13, color: '#1d4ed8', fontWeight: '600' },
  villeInputWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fafafa', marginBottom: 2 },
  villeInput:      { flex: 1, fontSize: 14, color: '#111827', paddingHorizontal: 8, paddingVertical: 10 },
  villeSuggestions:{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', overflow: 'hidden', marginBottom: 4 },
  villeSuggRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  villeSuggText:   { fontSize: 14, color: '#111827' },

  // Sections
  sectionTitle: { marginTop: 20, marginBottom: 10, fontSize: 15, fontWeight: '700', color: '#111827' },
  textBox:      { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827', backgroundColor: '#fafafa', fontSize: 14 },

  // Types
  typeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa' },
  typeCardSel:     { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  typeCardText:    { fontSize: 13, color: '#374151', fontWeight: '500' },
  typeCardTextSel: { color: '#1d4ed8', fontWeight: '600' },

  // Accordion
  accordion:  { borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  accHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fafafa' },
  accTitle:   { fontSize: 14, fontWeight: '600', color: '#374151' },
  accBadge:   { color: '#2563eb', fontWeight: '700' },
  accBody:    { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  checkRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkLabel: { fontSize: 14, color: '#6b7280' },
  checkLabelOn:{ color: '#111827', fontWeight: '600' },

  // Option chips (distance, note)
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optChip:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa' },
  optChipSel:     { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  optChipText:    { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  optChipTextSel: { color: '#1d4ed8', fontWeight: '700' },

  // Counter
  counter:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 8 },
  counterBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  counterBtnText:{ fontSize: 20, fontWeight: '700', color: '#111827' },
  counterVal:    { minWidth: 28, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#111827' },
});
