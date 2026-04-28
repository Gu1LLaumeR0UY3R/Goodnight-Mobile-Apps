import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, type DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { ErrorToast } from '../components/ErrorToast';
import { biensService } from '../services/biensService';
import { reservationsService } from '../services/reservationsService';
import type { Blocage } from '../types/models';
import type { DisponibilitePlage } from '../types/reservation';

const QUICK_MOTIFS = ['Ménage', 'Entretien', 'Réparation', 'Usage personnel'];

type MarkedDates = Record<string, any>;

function isValidRange(dateDebut: string, dateFin: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateDebut) && /^\d{4}-\d{2}-\d{2}$/.test(dateFin) && dateFin > dateDebut;
}

function buildBlockedMarks(ranges: DisponibilitePlage[]): MarkedDates {
  const marks: MarkedDates = {};

  ranges.forEach((range) => {
    const cursor = new Date(range.date_debut);
    const end = new Date(range.date_fin);

    while (cursor < end) {
      const key = cursor.toISOString().split('T')[0];
      const isReservation = range.type === 'reservation';
      marks[key] = {
        disabled: true,
        disableTouchEvent: true,
        color: isReservation ? '#fca5a5' : '#fdba74',
        textColor: '#9ca3af',
      };
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return marks;
}

function buildSelectionMarks(dateDebut: string | null, dateFin: string | null, blockedMarks: MarkedDates): MarkedDates {
  const marks: MarkedDates = { ...blockedMarks };
  if (!dateDebut) return marks;

  if (!dateFin) {
    marks[dateDebut] = {
      selected: true,
      startingDay: true,
      endingDay: true,
      color: '#2563eb',
      textColor: '#fff',
    };
    return marks;
  }

  const cursor = new Date(dateDebut);
  const end = new Date(dateFin);
  let first = true;

  while (cursor <= end) {
    const key = cursor.toISOString().split('T')[0];
    const isLast = cursor.toDateString() === end.toDateString();
    marks[key] = {
      color: first || isLast ? '#2563eb' : '#93c5fd',
      textColor: '#fff',
      startingDay: first,
      endingDay: isLast,
    };
    first = false;
    cursor.setDate(cursor.getDate() + 1);
  }

  return marks;
}

function rangeContainsBlockedDay(dateDebut: string, dateFin: string, blockedMarks: MarkedDates): boolean {
  const cursor = new Date(dateDebut);
  const end = new Date(dateFin);

  while (cursor < end) {
    const key = cursor.toISOString().split('T')[0];
    if (blockedMarks[key]?.disabled) return true;
    cursor.setDate(cursor.getDate() + 1);
  }

  return false;
}

export default function BienBlocagesScreen({ route }: any) {
  const bienId = Number(route.params?.bienId ?? 0);
  const bienTitle = route.params?.bienTitle ?? 'Bien';
  const [blocages, setBlocages] = useState<Blocage[]>([]);
  const [unavailableRanges, setUnavailableRanges] = useState<DisponibilitePlage[]>([]);
  const [calendarMarks, setCalendarMarks] = useState<MarkedDates>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [motif, setMotif] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!bienId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [rows, disponibilites] = await Promise.all([
        biensService.getBlocages(bienId),
        reservationsService.getDisponibilites(bienId).catch(() => [] as DisponibilitePlage[]),
      ]);
      setBlocages(rows);
      setUnavailableRanges(disponibilites);
      setCalendarMarks(buildSelectionMarks(dateDebut || null, dateFin || null, buildBlockedMarks(disponibilites)));
    } catch (e: any) {
      setError(e?.message ?? 'Impossible de charger les blocages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bienId, dateDebut, dateFin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleCreate() {
    if (!motif.trim() || !isValidRange(dateDebut.trim(), dateFin.trim())) {
      setError('Motif et plage de dates valides requis');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await biensService.createBlocage(bienId, {
        date_debut: dateDebut.trim(),
        date_fin: dateFin.trim(),
        motif: motif.trim(),
      });
      setDateDebut('');
      setDateFin('');
      setMotif('');
      const nextBlockedMarks = buildBlockedMarks(unavailableRanges);
      setCalendarMarks(nextBlockedMarks);
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Impossible d\'ajouter le blocage');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDayPress(day: DateData) {
    const dateStr = day.dateString;
    const blockedMarks = buildBlockedMarks(unavailableRanges);

    if (blockedMarks[dateStr]?.disabled) return;

    if (!dateDebut || (dateDebut && dateFin)) {
      setDateDebut(dateStr);
      setDateFin('');
      setCalendarMarks(buildSelectionMarks(dateStr, null, blockedMarks));
      return;
    }

    if (dateStr <= dateDebut) {
      setDateDebut(dateStr);
      setDateFin('');
      setCalendarMarks(buildSelectionMarks(dateStr, null, blockedMarks));
      return;
    }

    if (rangeContainsBlockedDay(dateDebut, dateStr, blockedMarks)) {
      setError('La plage sélectionnée contient des dates déjà indisponibles');
      return;
    }

    setDateFin(dateStr);
    setCalendarMarks(buildSelectionMarks(dateDebut, dateStr, blockedMarks));
  }

  function resetSelection() {
    setDateDebut('');
    setDateFin('');
    setCalendarMarks(buildBlockedMarks(unavailableRanges));
  }

  async function handleDelete(blocageId: number) {
    try {
      await biensService.deleteBlocage(bienId, blocageId);
      setBlocages((prev) => prev.filter((item) => item.id_blocage !== blocageId));
    } catch (e: any) {
      setError(e?.message ?? 'Impossible de supprimer le blocage');
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={blocages}
        keyExtractor={(item) => String(item.id_blocage)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2563eb" />}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Blocages</Text>
            <Text style={styles.subtitle}>Gérez les périodes indisponibles de {bienTitle} pour ménage, entretien, réparation ou usage personnel.</Text>

            <View style={styles.formCard}>
              <Text style={styles.label}>Motif</Text>
              <TextInput style={styles.input} value={motif} onChangeText={setMotif} placeholder="Ex: Ménage de fin de séjour" />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                {QUICK_MOTIFS.map((item) => (
                  <TouchableOpacity key={item} style={styles.quickChip} onPress={() => setMotif(item)}>
                    <Text style={styles.quickChipText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Sélection des dates</Text>
              <View style={styles.selectionCard}>
                <View style={styles.selectionHeader}>
                  <View>
                    <Text style={styles.selectionTitle}>Touchez une date de début puis une date de fin</Text>
                    <Text style={styles.selectionSubtitle}>
                      {dateDebut ? `Début: ${dateDebut}` : 'Début non sélectionné'}
                      {'  ·  '}
                      {dateFin ? `Fin: ${dateFin}` : 'Fin non sélectionnée'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.resetBtn} onPress={resetSelection}>
                    <Ionicons name="refresh-outline" size={16} color="#475569" />
                  </TouchableOpacity>
                </View>

                <Calendar
                  markingType="period"
                  markedDates={calendarMarks}
                  onDayPress={handleDayPress}
                  theme={{
                    todayTextColor: '#1d4ed8',
                    arrowColor: '#1d4ed8',
                    monthTextColor: '#0f172a',
                    textDayFontWeight: '600',
                    textMonthFontWeight: '700',
                  }}
                />

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#fca5a5' }]} />
                    <Text style={styles.legendText}>Réservé</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#fdba74' }]} />
                    <Text style={styles.legendText}>Déjà bloqué</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                    <Text style={styles.legendText}>Votre sélection</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleCreate} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Ajouter le blocage</Text>}
              </TouchableOpacity>
            </View>

            <Text style={styles.listTitle}>Blocages existants</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={30} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Aucun blocage enregistré</Text>
            <Text style={styles.emptyText}>Ajoutez ici les périodes de ménage, entretien ou réparation.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemMotif}>{item.motif}</Text>
              <Text style={styles.itemDates}>{item.date_debut} au {item.date_fin}</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id_blocage)}>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        )}
      />

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { marginTop: 6, marginBottom: 16, color: '#64748b', lineHeight: 21 },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dbe2ea', marginBottom: 18 },
  label: { marginBottom: 6, fontSize: 13, fontWeight: '700', color: '#334155' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 12,
  },
  quickRow: { gap: 8, paddingBottom: 10 },
  quickChip: { backgroundColor: '#e0f2fe', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  quickChipText: { color: '#0369a1', fontWeight: '700', fontSize: 13 },
  selectionCard: {
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  selectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  selectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  resetBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  legendRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  submitBtn: { marginTop: 4, backgroundColor: '#2563eb', borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  emptyCard: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 18, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#dbe2ea' },
  emptyTitle: { marginTop: 8, fontSize: 16, fontWeight: '700', color: '#334155' },
  emptyText: { marginTop: 6, textAlign: 'center', color: '#64748b' },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#dbe2ea' },
  itemMotif: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  itemDates: { marginTop: 4, fontSize: 13, color: '#64748b' },
  deleteBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2' },
});