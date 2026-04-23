/**
 * src/components/StatusBadge.tsx
 *
 * RÔLE :
 *   Composant réutilisable qui affiche le statut de validation d'un bien
 *   sous forme de badge coloré. Cliquer sur le badge ouvre une modale
 *   donnant plus de détails, notamment le motif de refus si applicable.
 *
 * STATUTS POSSIBLES :
 *   'valide'     → fond vert    — l'annonce est visible publiquement
 *   'en_attente' → fond jaune   — en cours d'examen par l'administrateur
 *   'refuse'     → fond rouge   — refusé (motif_refus disponible si renseigné)
 *
 * CONTENU DE LA MODALE :
 *   - Zone colorée reprenant le statut
 *   - Motif de refus (conditionnel : uniquement si statut === 'refuse' ET motif renseigné)
 *   - Message contextuel expliquant la prochaine action à faire
 *
 * UTILISÉ PAR :
 *   - MyBiensScreen : une badge par bien listé
 *
 * DÉPEND DE :
 *   - models.ts  (interface Bien, statut_validation, motif_refus)
 *   - @expo/vector-icons (icône info)
 */
import React, { useState } from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Bien } from '../types/models';

interface StatusBadgeProps {
  bien: Bien;
}

export function StatusBadge({ bien }: StatusBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  const getStatusColor = (status: Bien['statut_validation']) => {
    switch (status) {
      case 'valide':
        return { bg: '#dcfce7', color: '#166534', label: 'Validé ✓' };
      case 'en_attente':
        return { bg: '#fef3c7', color: '#92400e', label: 'En attente' };
      case 'refuse':
        return { bg: '#fee2e2', color: '#991b1b', label: 'Refusé' };
      default:
        return { bg: '#f3f4f6', color: '#374151', label: 'Inconnu' };
    }
  };

  const status = getStatusColor(bien.statut_validation);

  return (
    <>
      <TouchableOpacity
        style={[styles.badge, { backgroundColor: status.bg }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={[styles.badgeText, { color: status.color }]}>
          {status.label}
        </Text>
        {bien.motif_refus && (
          <Ionicons
            name="information-circle"
            size={14}
            color={status.color}
            style={{ marginLeft: 4 }}
          />
        )}
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.headerRow}>
              <Text style={styles.modalTitle}>Statut de l'annonce</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <View
                style={[
                  styles.statusBox,
                  { backgroundColor: status.bg + '40' },
                ]}
              >
                <Text style={[styles.statusLabel, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>

              {bien.motif_refus && bien.statut_validation === 'refuse' && (
                <View style={styles.motifBox}>
                  <Text style={styles.motifTitle}>Motif du refus :</Text>
                  <Text style={styles.motifText}>{bien.motif_refus}</Text>
                </View>
              )}

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  {bien.statut_validation === 'valide'
                    ? 'Votre annonce est en ligne et visible par les locataires.'
                    : bien.statut_validation === 'en_attente'
                    ? 'Votre annonce est en cours de validation. Cela peut prendre quelques jours.'
                    : 'Votre annonce a été refusée. Vous pouvez la modifier et la soumettre à nouveau.'}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    padding: 16,
  },
  statusBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  motifBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    marginBottom: 16,
  },
  motifTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 8,
  },
  motifText: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
  },
  infoText: {
    fontSize: 13,
    color: '#0c4a6e',
    lineHeight: 18,
  },
  closeButton: {
    backgroundColor: '#000',
    padding: 14,
    alignItems: 'center',
    marginTop: 'auto',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
