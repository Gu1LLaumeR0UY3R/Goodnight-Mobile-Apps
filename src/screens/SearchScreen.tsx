/**
 * src/screens/SearchScreen.tsx
 *
 * RÔLE :
 *   Recherche full-text de biens avec filtres rapides (ville, type,
 *   prix, note, nb voyageurs, tri).
 *
 * FONCTIONNALITÉS :
 *   - Saisie texte avec debounce 350 ms avant de lancer la requête
 *   - Autocomplete ville (debounce 400 ms) via l'API
 *   - Panneau de filtres avancés en modal
 *   - Rafraîchissement au focus (useScreenFocus) :
 *       Si des résultats existent déjà, relance la recherche en arrière-plan
 *       quand l'écran reprend le focus (retour depuis un détail).
 *       Guard: ne fait rien si biens.length === 0 (premier affichage géré
 *       par le useEffect initial).
 *
 * DÉPEND DE :
 *   - biensService.ts  (getAll, searchCommunes)
 *   - apiClient.ts     (apiFetch pour les types, getImageUrl)
 *   - useAuth          (exclure les biens du propriétaire)
 *   - useScreenFocus   (hook de rafraîchissement au focus)
 *
 * NAVIGATION :
 *   BienDetail  ← Tap sur une carte de bien
 */
// src/screens/SearchScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { biensService } from '../services/biensService';
import { apiFetch, getImageUrl } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import { useScreenFocus } from '../hooks/useScreenFocus';
import type { Bien } from '../types/models';

interface TypeBien {
  id_typebien: number;
  desc_type_bien: string;
}

interface SearchFilters {
  ville?: string;
  types: number[];
  prix_min?: number;
  prix_max?: number;
  min_note?: number;
  voyageurs?: number;
  sort: 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc';
}

const DEFAULT_FILTERS: SearchFilters = {
  types: [],
  sort: 'relevance',
};

const SORT_LABELS: Record<SearchFilters['sort'], string> = {
  relevance: 'Pertinence',
  price_asc: 'Prix croissant',
  price_desc: 'Prix décroissant',
  rating_desc: 'Meilleure note',
};

export default function SearchScreen({ navigation }: any) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [biens, setBiens] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [modalVisible, setModalVisible] = useState(false);
  const [typeOptions, setTypeOptions] = useState<TypeBien[]>([]);
  const [villeSuggestions, setVilleSuggestions] = useState<string[]>([]);
  const [villeLoading, setVilleLoading] = useState(false);
  const [villeQuery, setVilleQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const villeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wrapé dans useCallback([user?.id_locataire]) pour rester stable
  // et éviter que handleScreenFocus ci-dessous ne déclenche une boucle
  const runSearch = useCallback(async (text: string, activeFilters: SearchFilters, showSpinner = true) => {
    const trimmed = text.trim();
    if (showSpinner) setLoading(true);
    try {
      const data = await biensService.getAll({
        search: trimmed || undefined,
        ville: activeFilters.ville?.trim() || undefined,
        exclude_owner_id: user?.id_locataire,
        types: activeFilters.types.length ? activeFilters.types : undefined,
        prix_min: activeFilters.prix_min,
        prix_max: activeFilters.prix_max,
        min_note: activeFilters.min_note,
        voyageurs: activeFilters.voyageurs,
        sort: activeFilters.sort,
        limit: 25,
      });
      setBiens(data);
    } catch {
      setBiens([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id_locataire]);

  // Guard : ne relance la recherche au focus que si des résultats existent.
  // Si biens.length === 0, c'est le premier affichage ; le useEffect initial
  // s'en charge. Sans ce guard, le composant ferait 2 appels au montage.
  const handleScreenFocus = useCallback(() => {
    if (biens.length > 0) {
      runSearch(query, filters, false); // false = sans spinner (silencieux)
    }
  }, [biens.length, query, filters, runSearch]);

  useScreenFocus(handleScreenFocus);

  // Debounce 350 ms : attend que l'utilisateur ait fini de taper
  // avant de lancer la requête. Limite les appels API inutiles.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      runSearch(query, filters);
    }, 350);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, filters, user?.id_locataire]);

  useEffect(() => {
    runSearch('', DEFAULT_FILTERS, true);
  }, []);

  useEffect(() => {
    apiFetch<TypeBien[]>('/biens/types')
      .then(setTypeOptions)
      .catch(() => setTypeOptions([]));
  }, []);

  useEffect(() => {
    if (!modalVisible) return;
    const q = villeQuery.trim();

    if (villeTimerRef.current) clearTimeout(villeTimerRef.current);
    if (q.length < 2) {
      setVilleSuggestions([]);
      setVilleLoading(false);
      return;
    }

    setVilleLoading(true);
    villeTimerRef.current = setTimeout(async () => {
      try {
        const suggestions = await apiFetch<string[]>(`/biens/villes?q=${encodeURIComponent(q)}`);
        setVilleSuggestions(suggestions);
      } catch {
        setVilleSuggestions([]);
      } finally {
        setVilleLoading(false);
      }
    }, 280);

    return () => {
      if (villeTimerRef.current) clearTimeout(villeTimerRef.current);
    };
  }, [villeQuery, modalVisible]);

  const activeFiltersCount =
    (filters.ville ? 1 : 0)
    + (filters.types.length ? 1 : 0)
    + (filters.prix_min != null ? 1 : 0)
    + (filters.prix_max != null ? 1 : 0)
    + (filters.min_note != null ? 1 : 0)
    + (filters.voyageurs != null ? 1 : 0)
    + (filters.sort !== 'relevance' ? 1 : 0);

  function openFilters() {
    setDraftFilters({ ...filters, types: [...filters.types] });
    setVilleQuery(filters.ville ?? '');
    setVilleSuggestions([]);
    setModalVisible(true);
  }

  function applyFilters() {
    setFilters({ ...draftFilters, types: [...draftFilters.types] });
    setModalVisible(false);
  }

  function resetFilters() {
    setDraftFilters(DEFAULT_FILTERS);
  }

  function parseNumeric(value: string): number | undefined {
    const clean = value.replace(',', '.').trim();
    if (!clean) return undefined;
    const n = Number(clean);
    return Number.isNaN(n) ? undefined : n;
  }

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.ville) chips.push({ key: 'ville', label: `Ville: ${filters.ville}` });
    if (filters.types.length) chips.push({ key: 'types', label: `${filters.types.length} type(s)` });
    if (filters.prix_min != null || filters.prix_max != null) {
      chips.push({ key: 'prix', label: `Prix: ${filters.prix_min ?? 0} - ${filters.prix_max ?? 'max'}` });
    }
    if (filters.min_note != null) chips.push({ key: 'note', label: `Note >= ${filters.min_note}` });
    if (filters.voyageurs != null) chips.push({ key: 'voyageurs', label: `${filters.voyageurs}+ voyageurs` });
    if (filters.sort !== 'relevance') chips.push({ key: 'sort', label: `Tri: ${SORT_LABELS[filters.sort]}` });
    return chips;
  }, [filters]);

  function clearOneFilter(key: string) {
    setFilters((prev) => {
      if (key === 'ville') return { ...prev, ville: undefined };
      if (key === 'types') return { ...prev, types: [] };
      if (key === 'prix') return { ...prev, prix_min: undefined, prix_max: undefined };
      if (key === 'note') return { ...prev, min_note: undefined };
      if (key === 'voyageurs') return { ...prev, voyageurs: undefined };
      if (key === 'sort') return { ...prev, sort: 'relevance' };
      return prev;
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#64748b" />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Recherche rapide (ville, type, nom)"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterButton} onPress={openFilters}>
          <Ionicons name="options-outline" size={16} color="#1d4ed8" />
          <Text style={styles.filterButtonText}>Filtres avancés</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeFilterChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeChipsRow}
        >
          {activeFilterChips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={styles.activeChip}
              onPress={() => clearOneFilter(chip.key)}
            >
              <Text style={styles.activeChipText}>{chip.label}</Text>
              <Ionicons name="close-circle" size={14} color="#64748b" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.clearAllChip}
            onPress={() => setFilters(DEFAULT_FILTERS)}
          >
            <Text style={styles.clearAllChipText}>Tout effacer</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {loading && biens.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.hint}>Recherche en cours...</Text>
        </View>
      ) : (
        <FlatList
          data={biens}
          keyExtractor={(item) => String(item.id_biens)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                runSearch(query, filters, false);
              }}
              tintColor="#2563eb"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Aucun bien trouvé</Text>
              <Text style={styles.hint}>Essaie un autre mot-clé ou supprime un filtre.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const uri = getImageUrl(item.photo_principale);
            const price = item.prix_semaine_min ?? item.prix_nuit;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('BienDetail', { id: item.id_biens })}
                activeOpacity={0.88}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.placeholder]}>
                    <Ionicons name="home-outline" size={24} color="#94a3b8" />
                  </View>
                )}
                <View style={styles.body}>
                  <Text style={styles.title} numberOfLines={1}>{item.designation_bien}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.ville_nom ?? 'Ville inconnue'}
                    {item.desc_type_bien ? ` · ${item.desc_type_bien}` : ''}
                  </Text>
                  <View style={styles.footer}>
                    <Text style={styles.price}>
                      {price != null ? `${Math.round(Number(price))} €/sem` : 'Prix indisponible'}
                    </Text>
                    <View style={styles.rating}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={styles.ratingText}>{Number(item.note_moyenne ?? 0).toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filtres avancés</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.modalReset}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.sectionTitle}>Ville</Text>
            <TextInput
              style={styles.field}
              placeholder="Ex: Paris"
              placeholderTextColor="#94a3b8"
              value={draftFilters.ville ?? ''}
              onChangeText={(ville) => {
                setDraftFilters((p) => ({ ...p, ville }));
                setVilleQuery(ville);
              }}
            />
            {villeLoading && (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 8 }} />
            )}
            {villeSuggestions.length > 0 && (
              <View style={styles.villeSuggestions}>
                {villeSuggestions.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={styles.villeSuggestionRow}
                    onPress={() => {
                      setDraftFilters((p) => ({ ...p, ville: v }));
                      setVilleQuery(v);
                      setVilleSuggestions([]);
                    }}
                  >
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.villeSuggestionText}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Type de bien</Text>
            <View style={styles.chipsWrap}>
              {typeOptions.map((t) => {
                const selected = draftFilters.types.includes(t.id_typebien);
                return (
                  <TouchableOpacity
                    key={t.id_typebien}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setDraftFilters((p) => ({
                      ...p,
                      types: selected
                        ? p.types.filter((id) => id !== t.id_typebien)
                        : [...p.types, t.id_typebien],
                    }))}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t.desc_type_bien}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Prix (par semaine)</Text>
            <View style={styles.inlineRow}>
              <TextInput
                style={[styles.field, styles.fieldHalf]}
                placeholder="Min"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={draftFilters.prix_min != null ? String(draftFilters.prix_min) : ''}
                onChangeText={(v) => setDraftFilters((p) => ({ ...p, prix_min: parseNumeric(v) }))}
              />
              <TextInput
                style={[styles.field, styles.fieldHalf]}
                placeholder="Max"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={draftFilters.prix_max != null ? String(draftFilters.prix_max) : ''}
                onChangeText={(v) => setDraftFilters((p) => ({ ...p, prix_max: parseNumeric(v) }))}
              />
            </View>

            <Text style={styles.sectionTitle}>Note minimum</Text>
            <View style={styles.chipsWrap}>
              {[undefined, 4, 4.5, 5].map((v, idx) => {
                const selected = draftFilters.min_note === v;
                const label = v == null ? 'Toutes' : `★ ${v}+`;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setDraftFilters((p) => ({ ...p, min_note: v }))}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Voyageurs minimum</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setDraftFilters((p) => ({
                  ...p,
                  voyageurs: Math.max(1, (p.voyageurs ?? 1) - 1),
                }))}
              >
                <Text style={styles.counterBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterVal}>{draftFilters.voyageurs ?? 1}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setDraftFilters((p) => ({
                  ...p,
                  voyageurs: Math.min(20, (p.voyageurs ?? 1) + 1),
                }))}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDraftFilters((p) => ({ ...p, voyageurs: undefined }))}
                style={styles.clearTiny}
              >
                <Text style={styles.clearTinyText}>Effacer</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Tri</Text>
            <View style={styles.chipsWrap}>
              {[
                { label: 'Pertinence', value: 'relevance' as const },
                { label: 'Prix croissant', value: 'price_asc' as const },
                { label: 'Prix décroissant', value: 'price_desc' as const },
                { label: 'Note', value: 'rating_desc' as const },
              ].map((s) => {
                const selected = draftFilters.sort === s.value;
                return (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setDraftFilters((p) => ({ ...p, sort: s.value }))}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
            <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 10 },
  searchBar: {
    marginHorizontal: 12,
    marginBottom: 10,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterRow: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  activeChipsRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  clearAllChip: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearAllChipText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 13,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 90,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  hint: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: '#e2e8f0',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 13,
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 14,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalReset: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  field: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  villeSuggestions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  villeSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  villeSuggestionText: {
    color: '#0f172a',
    fontSize: 13,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  chipSelected: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  chipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#1d4ed8',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 20,
    color: '#0f172a',
    fontWeight: '700',
    marginTop: -2,
  },
  counterVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    minWidth: 20,
    textAlign: 'center',
  },
  clearTiny: {
    marginLeft: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  clearTinyText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  applyBtn: {
    margin: 16,
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    paddingVertical: 14,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
