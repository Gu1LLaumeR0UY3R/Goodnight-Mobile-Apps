// src/screens/ReservationScreen.tsx
// Issue #16 — Écran de réservation : sélection des dates + récapitulatif tarifaire
// Role: parcours de reservation avec choix des dates, calculs tarifaires et validation finale.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { apiFetch, getImageUrl } from '../services/apiClient';
import { reservationsService } from '../services/reservationsService';
import { getErrorMessage } from '../utils/errorHandler';
import { ErrorToast } from '../components/ErrorToast';
import type { Bien } from '../types/models';
import type { TarifCalcule, DisponibilitePlage } from '../types/reservation';

// Écran de réservation: calendrier, prix, indisponibilités et confirmation de séjour.

interface BienDetail extends Bien {
  photos?: string[];
  prix_semaine_min?: number;
}

type MarkedDates = Record<string, any>;
type SelectionMode = 'single' | 'range';

export default function ReservationScreen({ route, navigation }: any) {
  const { bienId, prefillDateDebut, prefillDateFin } = route.params ?? {};
  const { isAuthenticated, user } = useAuth();

  const [bien, setBien]                   = useState<BienDetail | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [blockedRanges, setBlockedRanges] = useState<DisponibilitePlage[]>([]);
  const [markedDates, setMarkedDates]     = useState<MarkedDates>({});

  const [dateDebut, setDateDebut] = useState<string | null>(null);
  const [dateFin, setDateFin]     = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('range');

  const [tarif, setTarif]             = useState<TarifCalcule | null>(null);
  const [tarifLoading, setTarifLoading] = useState(false);
  const [confirming, setConfirming]   = useState(false);

  // Redirige vers Login si non connecté
  useEffect(() => {
    if (!isAuthenticated) { navigation.replace('Login'); }
  }, [isAuthenticated]);

  // Chargement du bien + disponibilités
  useEffect(() => {
    if (!bienId) { navigation.goBack(); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [bienData, dispos] = await Promise.all([
          apiFetch<BienDetail>(`/biens/${bienId}`),
          reservationsService.getDisponibilites(bienId).catch(() => [] as DisponibilitePlage[]),
        ]);
        if (cancelled) return;
        setBien(bienData);
        setBlockedRanges(dispos);
        const blocked = buildBlockedMarks(dispos);
        setMarkedDates(blocked);

        if (
          typeof prefillDateDebut === 'string' &&
          typeof prefillDateFin === 'string' &&
          prefillDateDebut < prefillDateFin
        ) {
          const d = new Date(prefillDateDebut);
          const end = new Date(prefillDateFin);
          let overlap = false;

          while (d < end) {
            const key = d.toISOString().split('T')[0];
            if (blocked[key]?.disabled) {
              overlap = true;
              break;
            }
            d.setDate(d.getDate() + 1);
          }

          if (!overlap) {
            setDateDebut(prefillDateDebut);
            setDateFin(prefillDateFin);
            setMarkedDates(buildSelectionMarks(prefillDateDebut, prefillDateFin, blocked));
            fetchTarif(prefillDateDebut, prefillDateFin);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bienId, prefillDateDebut, prefillDateFin]);

  // ── Utilitaires calendrier ─────────────────────────────────────────────────

  function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  function resetSelection() {
    setDateDebut(null);
    setDateFin(null);
    setTarif(null);
    setMarkedDates(buildBlockedMarks(blockedRanges));
  }

  function buildBlockedMarks(ranges: DisponibilitePlage[]): MarkedDates {
    const marks: MarkedDates = {};
    ranges.forEach(r => {
      const d   = new Date(r.date_debut);
      const end = new Date(r.date_fin);
      while (d < end) {
        const key = d.toISOString().split('T')[0];
        marks[key] = { disabled: true, disableTouchEvent: true, color: '#fca5a5', textColor: '#9ca3af' };
        d.setDate(d.getDate() + 1);
      }
    });
    return marks;
  }

  const buildSelectionMarks = useCallback((debut: string | null, fin: string | null, blocked: MarkedDates): MarkedDates => {
    const marks: MarkedDates = { ...blocked };
    if (!debut) return marks;

    if (!fin) {
      marks[debut] = { selected: true, startingDay: true, endingDay: true, color: '#16a34a', textColor: '#fff' };
      return marks;
    }

    const d   = new Date(debut);
    const end = new Date(fin);
    let first = true;
    while (d <= end) {
      const key    = d.toISOString().split('T')[0];
      const isLast = d.toDateString() === end.toDateString();
      marks[key] = {
        color:       first ? '#16a34a' : isLast ? '#16a34a' : '#86efac',
        textColor:   '#fff',
        startingDay: first,
        endingDay:   isLast,
      };
      first = false;
      d.setDate(d.getDate() + 1);
    }
    return marks;
  }, []);

  // Vérifie les nuits réellement séjournées: [date_debut, date_fin[
  function isStayBlocked(debut: string, fin: string): boolean {
    const blocked = buildBlockedMarks(blockedRanges);
    const d   = new Date(debut);
    const end = new Date(fin);
    while (d < end) {
      if (blocked[d.toISOString().split('T')[0]]?.disabled) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  }

  function handleDayPress(day: DateData) {
    const dateStr = day.dateString;
    const blocked = buildBlockedMarks(blockedRanges);
    if (blocked[dateStr]?.disabled) return;

    // Mode 1 nuit: un seul clic crée une période [J, J+1]
    if (selectionMode === 'single') {
      const nextDay = addDays(dateStr, 1);
      if (isStayBlocked(dateStr, nextDay)) {
        setError('La date sélectionnée est indisponible');
        return;
      }
      setDateDebut(dateStr);
      setDateFin(nextDay);
      setMarkedDates(buildSelectionMarks(dateStr, nextDay, blocked));
      fetchTarif(dateStr, nextDay);
      return;
    }

    // Pas de début, ou les deux dates déjà définies → reset + nouvelle date de début
    if (!dateDebut || (dateDebut && dateFin)) {
      setDateDebut(dateStr);
      setDateFin(null);
      setTarif(null);
      setMarkedDates(buildSelectionMarks(dateStr, null, blocked));
      return;
    }

    // Nouvelle date ≤ début → on repart
    if (dateStr <= dateDebut) {
      setDateDebut(dateStr);
      setDateFin(null);
      setTarif(null);
      setMarkedDates(buildSelectionMarks(dateStr, null, blocked));
      return;
    }

    // Vérifier qu'aucune date bloquée n'est dans la plage
    if (isStayBlocked(dateDebut, dateStr)) {
      setError('La période sélectionnée contient des dates indisponibles');
      return;
    }

    setDateFin(dateStr);
    setMarkedDates(buildSelectionMarks(dateDebut, dateStr, blocked));
    fetchTarif(dateDebut, dateStr);
  }

  async function fetchTarif(debut: string, fin: string) {
    setTarifLoading(true);
    setTarif(null);
    try {
      const t = await reservationsService.getTarif(bienId, debut, fin);
      setTarif(t);
    } catch (e: any) {
      setError(e.message ?? 'Impossible de calculer le tarif');
    } finally {
      setTarifLoading(false);
    }
  }

  async function handleConfirm() {
    if (!dateDebut || !dateFin || !tarif || !bienId) return;
    setConfirming(true);
    try {
      const reservation = await reservationsService.create({
        id_biens:   bienId,
        date_debut: dateDebut,
        date_fin:   dateFin,
        id_tarif:   tarif.id_tarif,
      });
      navigation.replace('Confirmation', {
        reservation: {
          ...reservation,
          designation_bien: bien?.designation_bien,
          ville_nom:        bien?.ville_nom,
          date_debut:       dateDebut,
          date_fin:         dateFin,
          total:            tarif.total,
        },
      });
    } catch (e: any) {
      setError(getErrorMessage(e));
    } finally {
      setConfirming(false);
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (!bien) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={52} color="#ef4444" />
        <Text style={styles.errText}>{error ?? 'Bien introuvable'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photoUrl = bien.photos?.[0]
    ? getImageUrl(bien.photos[0])
    : bien.photo_principale ? getImageUrl(bien.photo_principale) : null;

  const today      = new Date().toISOString().split('T')[0];
  const canConfirm = !!dateDebut && !!dateFin && !!tarif && !tarifLoading;
  const isOwner    = user?.id_locataire === bien.id_locataire;

  if (isOwner) {
    return (
      <View style={styles.centered}>
        <Ionicons name="information-circle-outline" size={52} color="#6b7280" />
        <Text style={styles.errText}>Vous ne pouvez pas réserver votre propre bien.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Carte du bien ── */}
        <View style={styles.bienCard}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.bienPhoto} resizeMode="cover" />
          ) : (
            <View style={[styles.bienPhoto, styles.photoPlaceholder]}>
              <Ionicons name="home-outline" size={32} color="#d1d5db" />
            </View>
          )}
          <View style={styles.bienInfo}>
            <Text style={styles.bienName} numberOfLines={2}>{bien.designation_bien}</Text>
            {bien.ville_nom && (
              <View style={styles.rowIcon}>
                <Ionicons name="location-outline" size={13} color="#6b7280" />
                <Text style={styles.bienMeta}>{bien.ville_nom}</Text>
              </View>
            )}
            {Number(bien.note_moyenne) > 0 && (
              <View style={styles.rowIcon}>
                <Ionicons name="star" size={13} color="#fbbf24" />
                <Text style={styles.bienMeta}>{Number(bien.note_moyenne).toFixed(1)}</Text>
              </View>
            )}
            {bien.prix_semaine_min != null && (
              <Text style={styles.bienPrix}>{Math.round(Number(bien.prix_semaine_min))} € / sem.</Text>
            )}
          </View>
        </View>

        {/* ── Calendrier ── */}
        <Text style={styles.sectionTitle}>Choisissez vos dates</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeChip, selectionMode === 'single' && styles.modeChipActive]}
            onPress={() => {
              if (selectionMode !== 'single') {
                setSelectionMode('single');
                resetSelection();
              }
            }}
          >
            <Text style={[styles.modeChipText, selectionMode === 'single' && styles.modeChipTextActive]}>1 nuit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeChip, selectionMode === 'range' && styles.modeChipActive]}
            onPress={() => {
              if (selectionMode !== 'range') {
                setSelectionMode('range');
                resetSelection();
              }
            }}
          >
            <Text style={[styles.modeChipText, selectionMode === 'range' && styles.modeChipTextActive]}>Plusieurs nuits</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={resetSelection}>
            <Ionicons name="refresh" size={14} color="#1d4ed8" />
            <Text style={styles.resetBtnText}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHint}>
          {selectionMode === 'single'
            ? (!dateDebut
              ? 'Choisissez une date: la réservation sera d\'une nuit'
              : `${dateDebut} → ${dateFin}`)
            : (!dateDebut
              ? "Appuyez pour choisir la date d'arrivée"
              : !dateFin
                ? 'Appuyez pour choisir la date de départ'
                : `${dateDebut} → ${dateFin}`)}
        </Text>

        <Calendar
          markingType="period"
          markedDates={markedDates}
          onDayPress={handleDayPress}
          minDate={today}
          theme={{
            backgroundColor:            '#fff',
            calendarBackground:         '#fff',
            textSectionTitleColor:      '#6b7280',
            todayTextColor:             '#2563eb',
            dayTextColor:               '#111827',
            textDisabledColor:          '#d1d5db',
            arrowColor:                 '#2563eb',
            monthTextColor:             '#111827',
            textDayFontWeight:          '500',
            textMonthFontWeight:        '700',
          }}
          style={styles.calendar}
        />

        {/* ── Légende ── */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#86efac' }]} />
            <Text style={styles.legendText}>Sélectionné</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#fca5a5' }]} />
            <Text style={styles.legendText}>Indisponible</Text>
          </View>
        </View>

        {/* ── Récapitulatif tarifaire ── */}
        {(tarifLoading || tarif) && (
          <View style={styles.tarifCard}>
            <Text style={styles.tarifTitle}>Récapitulatif tarifaire</Text>
            {tarifLoading ? (
              <ActivityIndicator color="#2563eb" style={{ marginVertical: 8 }} />
            ) : tarif ? (
              <>
                {tarif.semaines > 0 && (
                  <TarifRow
                    label={`${tarif.semaines} semaine${tarif.semaines > 1 ? 's' : ''} × ${Math.round(tarif.prix_semaine)} €`}
                    value={`${Math.round(tarif.semaines * tarif.prix_semaine)} €`}
                  />
                )}
                {tarif.nuits_extra > 0 && (
                  <TarifRow
                    label={`${tarif.nuits_extra} nuit${tarif.nuits_extra > 1 ? 's' : ''} suppl. × ${Math.round(tarif.prix_nuit)} €`}
                    value={`${Math.round(tarif.nuits_extra * tarif.prix_nuit)} €`}
                  />
                )}
                <TarifRow
                  label="Durée totale"
                  value={`${tarif.nb_nuits} nuit${tarif.nb_nuits > 1 ? 's' : ''}`}
                />
                <View style={styles.tarifSep} />
                <TarifRow label="Total" value={`${Math.round(tarif.total)} €`} bold />
              </>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* ── CTA fixe en bas ── */}
      <View style={styles.ctaBar}>
        <View>
          {tarif && <Text style={styles.ctaTotal}>{Math.round(tarif.total)} €</Text>}
          {dateDebut && dateFin && (
            <Text style={styles.ctaDates}>{dateDebut} → {dateFin}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.ctaBtn, !canConfirm && styles.ctaBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm || confirming}
          activeOpacity={0.85}
        >
          {confirming
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaBtnText}>Confirmer</Text>
          }
        </TouchableOpacity>
      </View>

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </View>
  );
}

function TarifRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, bold && rowStyles.boldLabel]}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.boldValue]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label:     { fontSize: 14, color: '#6b7280' },
  value:     { fontSize: 14, color: '#374151', fontWeight: '500' },
  boldLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  boldValue: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
});

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f9fafb' },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  errText:      { fontSize: 15, color: '#374151', textAlign: 'center' },
  backBtn:      { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2563eb', borderRadius: 8, marginTop: 4 },
  backBtnText:  { color: '#fff', fontWeight: '600' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 110 },

  // Carte bien
  bienCard:         { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  bienPhoto:        { width: 100, height: 90 },
  photoPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  bienInfo:         { flex: 1, padding: 12 },
  bienName:         { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  rowIcon:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  bienMeta:         { fontSize: 13, color: '#6b7280' },
  bienPrix:         { fontSize: 14, fontWeight: '700', color: '#2563eb', marginTop: 4 },

  // Calendrier
  modeRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  modeChip:     { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  modeChipActive:{ borderColor: '#60a5fa', backgroundColor: '#eff6ff' },
  modeChipText: { fontSize: 12, color: '#4b5563', fontWeight: '600' },
  modeChipTextActive:{ color: '#1d4ed8' },
  resetBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  resetBtnText: { fontSize: 12, color: '#1d4ed8', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionHint:  { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  calendar:     { borderRadius: 14, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },

  // Légende
  legend:     { flexDirection: 'row', gap: 20, marginBottom: 20, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:  { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 13, color: '#6b7280' },

  // Tarif
  tarifCard:  { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  tarifTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  tarifSep:   { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },

  // CTA
  ctaBar:         {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  ctaTotal:       { fontSize: 20, fontWeight: '800', color: '#111827' },
  ctaDates:       { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  ctaBtn:         { backgroundColor: '#2563eb', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  ctaBtnDisabled: { backgroundColor: '#93c5fd' },
  ctaBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
});
