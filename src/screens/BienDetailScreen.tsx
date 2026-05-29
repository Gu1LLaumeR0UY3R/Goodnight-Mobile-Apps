// src/screens/BienDetailScreen.tsx
// Role: vue detaillee d'un bien avec reservation, favoris, commentaires et galerie.
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, FlatList, Image, TouchableOpacity,
  ActivityIndicator, StyleSheet, Dimensions, TextInput,
} from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch, getImageUrl } from '../services/apiClient';
import { commentairesService } from '../services/commentairesService';
import { favorisService } from '../services/favorisService';
import { reservationsService } from '../services/reservationsService';
import { useAuth } from '../hooks/useAuth';
import type { Bien, Commentaire } from '../types/models';
import type { DisponibilitePlage } from '../types/reservation';

// Écran cœur du parcours utilisateur: détail du bien, réservation,
// commentaires, favoris et affichage des disponibilités.

const { width: SCREEN_W } = Dimensions.get('window');

// Le détail renvoie aussi photos[] et prix_semaine_min
interface BienDetail extends Bien {
  photos?: string[];
  prix_semaine_min?: number;
}

type MarkedDates = Record<string, any>;

// ─── Sous-composants ─────────────────────────────────────────────────────────
function StatItem({ icon, label }: { icon: any; label: string }) {
  // Petit bloc de lecture rapide pour résumer un attribut du logement.
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={20} color="#6b7280" />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StarRow({ note }: { note: number }) {
  // Rend la note moyenne sous forme d'étoiles lisibles.
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.round(note) ? 'star' : 'star-outline'}
          size={13}
          color="#fbbf24"
        />
      ))}
    </View>
  );
}

// ─── Écran principal ─────────────────────────────────────────────────────────
export default function BienDetailScreen({ route, navigation }: any) {
  const { id } = route?.params ?? {};
  const { isAuthenticated, user } = useAuth();

  const [bien, setBien]                 = useState<BienDetail | null>(null);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [isFavori, setIsFavori]         = useState(false);
  const [favLoading, setFavLoading]     = useState(false);
  const [photoIndex, setPhotoIndex]     = useState(0);
  const [blockedRanges, setBlockedRanges] = useState<DisponibilitePlage[]>([]);
  const [calendarMarks, setCalendarMarks] = useState<MarkedDates>({});
  const [dateDebut, setDateDebut] = useState<string | null>(null);
  const [dateFin, setDateFin] = useState<string | null>(null);

  // Formulaire d'avis
  const [commentNote,        setCommentNote]        = useState<number>(5);
  const [commentTitre,       setCommentTitre]       = useState('');
  const [commentContenu,     setCommentContenu]     = useState('');
  const [commentSubmitting,  setCommentSubmitting]  = useState(false);
  const [commentError,       setCommentError]       = useState<string | null>(null);
  const [alreadyCommented,   setAlreadyCommented]   = useState(false);
  const [userComment,        setUserComment]        = useState<Commentaire | null>(null);

  function resetReservationSelection(nextBlockedRanges: DisponibilitePlage[] = blockedRanges) {
    // Réinitialise la sélection de dates quand l'utilisateur recommence.
    setDateDebut(null);
    setDateFin(null);
    setCalendarMarks(buildBlockedMarks(nextBlockedRanges));
  }

  function buildBlockedMarks(ranges: DisponibilitePlage[]): MarkedDates {
    // Convertit les indisponibilités API en marquages de calendrier.
    const marks: MarkedDates = {};
    ranges.forEach((r) => {
      const d = new Date(r.date_debut);
      const end = new Date(r.date_fin);
      while (d < end) {
        const key = d.toISOString().split('T')[0];
        marks[key] = { disabled: true, disableTouchEvent: true, color: '#fca5a5', textColor: '#9ca3af' };
        d.setDate(d.getDate() + 1);
      }
    });
    return marks;
  }

  function buildSelectionMarks(debut: string | null, fin: string | null, blocked: MarkedDates): MarkedDates {
    const marks: MarkedDates = { ...blocked };
    if (!debut) return marks;

    if (!fin) {
      marks[debut] = { selected: true, startingDay: true, endingDay: true, color: '#16a34a', textColor: '#fff' };
      return marks;
    }

    const d = new Date(debut);
    const end = new Date(fin);
    let first = true;

    while (d <= end) {
      const key = d.toISOString().split('T')[0];
      const isLast = d.toDateString() === end.toDateString();
      marks[key] = {
        color: first ? '#16a34a' : isLast ? '#16a34a' : '#86efac',
        textColor: '#fff',
        startingDay: first,
        endingDay: isLast,
      };
      first = false;
      d.setDate(d.getDate() + 1);
    }

    return marks;
  }

  function isStayBlocked(debut: string, fin: string): boolean {
    const blocked = buildBlockedMarks(blockedRanges);
    const d = new Date(debut);
    const end = new Date(fin);
    while (d < end) {
      if (blocked[d.toISOString().split('T')[0]]?.disabled) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  }

  function onCalendarPress(day: DateData) {
    const dateStr = day.dateString;
    const blocked = buildBlockedMarks(blockedRanges);
    if (blocked[dateStr]?.disabled) return;

    if (!dateDebut || (dateDebut && dateFin)) {
      setDateDebut(dateStr);
      setDateFin(null);
      setCalendarMarks(buildSelectionMarks(dateStr, null, blocked));
      return;
    }

    if (dateStr <= dateDebut) {
      setDateDebut(dateStr);
      setDateFin(null);
      setCalendarMarks(buildSelectionMarks(dateStr, null, blocked));
      return;
    }

    if (isStayBlocked(dateDebut, dateStr)) {
      setError('La période sélectionnée contient des dates indisponibles');
      return;
    }

    setDateFin(dateStr);
    setCalendarMarks(buildSelectionMarks(dateDebut, dateStr, blocked));
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [bienData, comData, dispos] = await Promise.all([
          apiFetch<BienDetail>(`/biens/${id}`),
          commentairesService.getByBien(id).catch(() => [] as Commentaire[]),
          reservationsService.getDisponibilites(id).catch(() => [] as DisponibilitePlage[]),
        ]);
        if (cancelled) return;
        setBien(bienData);
        setCommentaires(comData);
        if (isAuthenticated && user) {
          const mine = comData.find(c => c.id_locataire === user.id_locataire);
          if (mine) { setAlreadyCommented(true); setUserComment(mine); }
        }
        setBlockedRanges(dispos);
        setCalendarMarks(buildBlockedMarks(dispos));
        if (isAuthenticated) {
          favorisService.isFavori(id).then(v => { if (!cancelled) setIsFavori(v); }).catch(() => {});
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isAuthenticated]);

  useFocusEffect(
    React.useCallback(() => {
      if (!id) return;

      let cancelled = false;

      (async () => {
        try {
          const dispos = await reservationsService.getDisponibilites(id).catch(() => [] as DisponibilitePlage[]);
          if (cancelled) return;
          setBlockedRanges(dispos);
          resetReservationSelection(dispos);
        } catch {
          if (!cancelled) resetReservationSelection();
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [id])
  );

  async function toggleFavori() {
    if (!isAuthenticated) { navigation.navigate('Login'); return; }
    if (!bien || favLoading) return;
    setFavLoading(true);
    try {
      if (isFavori) { await favorisService.remove(bien.id_biens); setIsFavori(false); }
      else          { await favorisService.add(bien.id_biens);    setIsFavori(true);  }
    } catch {}
    setFavLoading(false);
  }

  async function submitComment() {
    if (!commentContenu.trim()) {
      setCommentError('Le texte de l\'avis est requis');
      return;
    }
    setCommentError(null);
    setCommentSubmitting(true);
    try {
      await commentairesService.create({
        id_biens: bien!.id_biens,
        note:     commentNote,
        titre:    commentTitre.trim() || undefined,
        contenu:  commentContenu.trim(),
      });
      const newComments = await commentairesService.getByBien(bien!.id_biens);
      setCommentaires(newComments);
      const mine = newComments.find(c => c.id_locataire === user?.id_locataire);
      if (mine) setUserComment(mine);
      setCommentContenu('');
      setCommentTitre('');
      setAlreadyCommented(true);
    } catch (e: any) {
      if ((e.message ?? '').includes('d\u00e9j\u00e0 comment\u00e9')) {
        setAlreadyCommented(true);
      } else {
        setCommentError(e.message ?? 'Erreur lors de la soumission');
      }
    } finally {
      setCommentSubmitting(false);
    }
  }

  // ── Chargement ──
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // ── Erreur ──
  if (error || !bien) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={52} color="#ef4444" />
        <Text style={styles.errorText}>{error ?? 'Bien introuvable'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Résolution des URLs photos
  const photos: string[] = [];
  (bien.photos ?? []).forEach(p => { const u = getImageUrl(p); if (u) photos.push(u); });
  if (photos.length === 0 && bien.photo_principale) {
    const u = getImageUrl(bien.photo_principale);
    if (u) photos.push(u);
  }

  const prixSemaine = bien.prix_semaine_min ?? (bien.prix_nuit != null ? Number(bien.prix_nuit) * 7 : null);
  const prixNuit = bien.prix_nuit ?? (prixSemaine != null ? Number(prixSemaine) / 7 : null);
  const animaux  = Boolean(bien.animaux_biens);
  const isOwner  = isAuthenticated && user?.id_locataire === bien.id_locataire;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Galerie photos ── */}
      <View>
        {photos.length > 0 ? (
          <>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                setPhotoIndex(idx);
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.photo} resizeMode="cover" />
              )}
            />
            {photos.length > 1 && (
              <View style={styles.dotsWrap}>
                {photos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                ))}
              </View>
            )}
            <Text style={styles.photoCounter}>{photoIndex + 1} / {photos.length}</Text>
          </>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="home-outline" size={64} color="#d1d5db" />
          </View>
        )}

        {/* Bouton favori en overlay */}
        <TouchableOpacity style={styles.favBtn} onPress={toggleFavori} disabled={favLoading}>
          {favLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name={isFavori ? 'heart' : 'heart-outline'} size={24} color={isFavori ? '#ef4444' : '#fff'} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Contenu ── */}
      <View style={styles.content}>

        {/* Titre + type + ville */}
        <Text style={styles.title}>{bien.designation_bien}</Text>
        <View style={styles.metaRow}>
          {bien.desc_type_bien && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{bien.desc_type_bien}</Text>
            </View>
          )}
          {bien.ville_nom && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#6b7280" />
              <Text style={styles.locationText}>
                {bien.ville_nom}{bien.ville_code_postal ? ` (${bien.ville_code_postal})` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Note moyenne */}
        {Number(bien.note_moyenne) > 0 && (
          <View style={styles.ratingRow}>
            <StarRow note={Number(bien.note_moyenne)} />
            <Text style={styles.ratingVal}>{Number(bien.note_moyenne).toFixed(1)}</Text>
            {Number(bien.nb_avis) > 0 && (
              <Text style={styles.ratingCount}>· {bien.nb_avis} avis</Text>
            )}
          </View>
        )}

        {/* Stats rapides */}
        <View style={styles.statsRow}>
          <StatItem icon="resize-outline"  label={`${bien.superficie_biens} m²`} />
          <View style={styles.statSep} />
          <StatItem icon="people-outline"  label={`${bien.nb_couchage} pers.`} />
          <View style={styles.statSep} />
          <StatItem icon="paw-outline"     label={animaux ? 'Animaux bienvenus' : 'Sans animaux'} />
        </View>

        {/* Description */}
        {bien.description_biens ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{bien.description_biens}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Réserver avec calendrier</Text>
          <Text style={styles.calendarHint}>
            Choisissez votre arrivée et votre départ. Les dates rouges sont déjà prises.
          </Text>
          <Calendar
            markingType="period"
            markedDates={calendarMarks}
            onDayPress={onCalendarPress}
            minDate={new Date().toISOString().split('T')[0]}
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              textSectionTitleColor: '#6b7280',
              todayTextColor: '#2563eb',
              dayTextColor: '#111827',
              textDisabledColor: '#d1d5db',
              arrowColor: '#2563eb',
              monthTextColor: '#111827',
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
            }}
            style={styles.calendarBox}
          />

          <View style={styles.legendRow}>
            <View style={styles.legendItemMini}>
              <View style={[styles.legendDotMini, { backgroundColor: '#86efac' }]} />
              <Text style={styles.legendTextMini}>Sélectionné</Text>
            </View>
            <View style={styles.legendItemMini}>
              <View style={[styles.legendDotMini, { backgroundColor: '#fca5a5' }]} />
              <Text style={styles.legendTextMini}>Indisponible</Text>
            </View>
          </View>

          {!!dateDebut && (
            <Text style={styles.selectionText}>
              {dateFin ? `${dateDebut} → ${dateFin}` : `Arrivée: ${dateDebut} (choisissez le départ)`}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.reserveInlineBtn, (!dateDebut || !dateFin) && styles.reserveInlineBtnDisabled]}
            disabled={!dateDebut || !dateFin}
            onPress={() => {
              if (!isAuthenticated) {
                navigation.navigate('Login');
                return;
              }
              const selectedStart = dateDebut;
              const selectedEnd = dateFin;
              resetReservationSelection();
              navigation.navigate('Reservation', {
                bienId: bien.id_biens,
                prefillDateDebut: selectedStart,
                prefillDateFin: selectedEnd,
              });
            }}
          >
            <Text style={styles.reserveInlineBtnText}>Continuer la réservation</Text>
          </TouchableOpacity>
        </View>

        {/* Avis */}
        {commentaires.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avis ({commentaires.length})</Text>
            {commentaires.slice(0, 5).map(c => (
              <View key={c.id_commentaire} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarLetter}>
                      {(c.auteur_prenom ?? 'A')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentAuthor}>{c.auteur_prenom ?? 'Anonyme'}</Text>
                    <Text style={styles.commentDate}>
                      {c.date_creation ? c.date_creation.toString().split('T')[0] : ''}
                    </Text>
                  </View>
                  {c.note != null && (
                    <View style={styles.commentNoteBox}>
                      <Ionicons name="star" size={12} color="#fbbf24" />
                      <Text style={styles.commentNoteText}>{c.note}</Text>
                    </View>
                  )}
                </View>
                {c.titre ? <Text style={styles.commentTitle}>{c.titre}</Text> : null}
                <Text style={styles.commentBody} numberOfLines={4}>{c.contenu}</Text>
              </View>
            ))}
          </View>
        )}

        {commentaires.length === 0 && !loading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avis</Text>
            <Text style={styles.noReviews}>Aucun avis pour le moment.</Text>
          </View>
        )}

        {/* ── Formulaire d'avis ── */}
        {isAuthenticated && !isOwner && !alreadyCommented && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Laisser un avis</Text>

            {/* Sélecteur d'étoiles */}
            <View style={styles.commentStarRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} onPress={() => setCommentNote(i)}>
                  <Ionicons
                    name={i <= commentNote ? 'star' : 'star-outline'}
                    size={30}
                    color="#fbbf24"
                  />
                </TouchableOpacity>
              ))}
              <Text style={styles.commentNoteLabel}>{commentNote} / 5</Text>
            </View>

            <TextInput
              style={styles.commentInput}
              value={commentTitre}
              onChangeText={setCommentTitre}
              placeholder="Titre (optionnel)"
              maxLength={80}
            />
            <TextInput
              style={[styles.commentInput, styles.commentTextarea]}
              value={commentContenu}
              onChangeText={setCommentContenu}
              placeholder="Votre avis…"
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
            />

            {!!commentError && (
              <Text style={styles.commentErrorText}>{commentError}</Text>
            )}

            <TouchableOpacity
              style={[styles.commentSubmitBtn, commentSubmitting && { opacity: 0.65 }]}
              onPress={submitComment}
              disabled={commentSubmitting}
            >
              {commentSubmitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.commentSubmitBtnText}>Publier l'avis</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {isAuthenticated && !isOwner && alreadyCommented && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Votre avis</Text>
            {userComment && (
              <View style={styles.reviewMyCard}>
                <View style={styles.reviewMyHeader}>
                  <StarRow note={userComment.note ?? 0} />
                  <Text style={styles.reviewMyDate}>
                    {new Date(userComment.date_creation).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                {userComment.titre ? <Text style={styles.reviewMyTitle}>{userComment.titre}</Text> : null}
                <Text style={styles.reviewMyContent}>{userComment.contenu}</Text>
              </View>
            )}
            <View style={styles.commentPostedBox}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={styles.commentPostedText}>Vous avez déjà laissé un avis pour ce bien.</Text>
            </View>
          </View>
        )}

      </View>

      {/* ── Barre basse : prix + réserver ── */}
      <View style={styles.bottomBar}>
        <View>
          {prixSemaine != null ? (
            <>
              <Text style={styles.priceAmount}>{Math.round(Number(prixSemaine))} €</Text>
              <Text style={styles.pricePeriod}>/ semaine</Text>
              {prixNuit != null && (
                <Text style={styles.priceHint}>≈ {Math.round(Number(prixNuit))} € / nuit</Text>
              )}
            </>
          ) : (
            <Text style={styles.priceAmount}>Prix sur demande</Text>
          )}
        </View>
        {!isOwner && (
          <TouchableOpacity
            style={styles.reserveBtn}
            onPress={() => {
              if (!isAuthenticated) navigation.navigate('Login');
              else navigation.navigate('Reservation', {
                bienId: bien.id_biens,
                prefillDateDebut: dateDebut,
                prefillDateFin: dateFin,
              });
            }}
          >
            <Text style={styles.reserveBtnText}>
              {isAuthenticated ? 'Réserver' : 'Connexion pour réserver'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#fff' },
  centered:           { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  errorText:          { fontSize: 15, color: '#374151', textAlign: 'center' },
  backBtn:            { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#3b82f6', borderRadius: 8 },
  backBtnText:        { color: '#fff', fontWeight: '600' },

  // Galerie
  photo:              { width: SCREEN_W, height: 280 },
  photoPlaceholder:   { width: SCREEN_W, height: 280, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  dotsWrap:           { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot:                { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:          { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  photoCounter:       { position: 'absolute', bottom: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  favBtn:             { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 22, padding: 8 },

  // Contenu
  content:            { padding: 20, paddingBottom: 4 },
  title:              { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 10 },
  metaRow:            { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 },
  tag:                { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText:            { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  locationRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText:       { fontSize: 14, color: '#6b7280' },

  ratingRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  starRow:            { flexDirection: 'row', gap: 2 },
  ratingVal:          { fontSize: 15, fontWeight: '700', color: '#111827' },
  ratingCount:        { fontSize: 14, color: '#6b7280' },

  statsRow:           { flexDirection: 'row', backgroundColor: '#f9fafb', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 8, marginBottom: 20, alignItems: 'center' },
  statItem:           { flex: 1, alignItems: 'center', gap: 6 },
  statLabel:          { fontSize: 12, color: '#374151', textAlign: 'center' },
  statSep:            { width: 1, height: 32, backgroundColor: '#e5e7eb' },

  section:            { marginBottom: 24 },
  sectionTitle:       { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  description:        { fontSize: 15, color: '#4b5563', lineHeight: 24 },
  calendarHint:       { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  calendarBox:        { borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  legendRow:          { flexDirection: 'row', gap: 16, marginTop: 10, marginBottom: 8 },
  legendItemMini:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDotMini:      { width: 10, height: 10, borderRadius: 5 },
  legendTextMini:     { fontSize: 12, color: '#6b7280' },
  selectionText:      { fontSize: 13, color: '#1f2937', marginBottom: 10 },
  reserveInlineBtn:   { backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  reserveInlineBtnDisabled: { backgroundColor: '#93c5fd' },
  reserveInlineBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  noReviews:          { fontSize: 14, color: '#9ca3af', fontStyle: 'italic' },

  // Formulaire avis
  commentStarRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  commentNoteLabel:     { marginLeft: 8, fontSize: 13, color: '#6b7280' },
  commentInput:         { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff', marginBottom: 10 },
  commentTextarea:      { height: 90, textAlignVertical: 'top' },
  commentErrorText:     { fontSize: 13, color: '#dc2626', marginBottom: 8 },
  commentSubmitBtn:     { backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  commentSubmitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  commentPostedBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  commentPostedText:    { fontSize: 14, color: '#15803d', fontWeight: '600' },
  reviewMyCard:         { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  reviewMyHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewMyDate:         { fontSize: 12, color: '#6b7280' },
  reviewMyTitle:        { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  reviewMyContent:      { fontSize: 14, color: '#374151', lineHeight: 20 },

  commentCard:        { backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 10 },
  commentHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  commentAvatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  commentAvatarLetter:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  commentAuthor:      { fontSize: 14, fontWeight: '600', color: '#111827' },
  commentDate:        { fontSize: 12, color: '#9ca3af' },
  commentNoteBox:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  commentNoteText:    { fontSize: 13, fontWeight: '700', color: '#374151' },
  commentTitle:       { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  commentBody:        { fontSize: 14, color: '#4b5563', lineHeight: 20 },

  // Barre basse
  bottomBar:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 4 },
  priceAmount:        { fontSize: 22, fontWeight: '800', color: '#111827' },
  pricePeriod:        { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  priceHint:          { fontSize: 12, color: '#6b7280', marginTop: 2 },
  reserveBtn:         { backgroundColor: '#2563eb', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 12 },
  reserveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
});
