// src/screens/NotificationsScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { notificationsService } from '../services/notificationsService';
import { useNotifications } from '../hooks/useNotifications';
import { getErrorMessage } from '../utils/errorHandler';
import type { Notification } from '../types/models';

export default function NotificationsScreen() {
  const { refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsService.getAll();
      setNotifications(data);
      refreshUnreadCount();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  async function handleMarkAsRead(id: number) {
    if (busyId === id) return;

    setBusyId(id);
    setNotifications((prev) => prev.map((item) => (
      item.id_notification === id ? { ...item, is_read: true } : item
    )));

    try {
      await notificationsService.markAsRead(id);
      refreshUnreadCount();
    } catch (e: unknown) {
      setNotifications((prev) => prev.map((item) => (
        item.id_notification === id ? { ...item, is_read: false } : item
      )));
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  function formatDate(date: string): string {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadNotifications}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="notifications-off-outline" size={56} color="#d1d5db" />
        <Text style={styles.emptyTitle}>Aucune notification</Text>
        <Text style={styles.emptySub}>Les événements importants apparaîtront ici.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={notifications}
      keyExtractor={(item) => String(item.id_notification)}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        error ? <Text style={styles.inlineError}>{error}</Text> : null
      }
      renderItem={({ item }) => {
        const isBusy = busyId === item.id_notification;
        return (
          <TouchableOpacity
            activeOpacity={item.is_read ? 1 : 0.92}
            style={[styles.card, !item.is_read && styles.cardUnread]}
            onPress={() => {
              if (!item.is_read) {
                void handleMarkAsRead(item.id_notification);
              }
            }}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={item.is_read ? 'mail-open-outline' : 'mail-unread-outline'}
                size={20}
                color={item.is_read ? '#6b7280' : '#2563eb'}
              />
            </View>

            <View style={styles.content}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.is_read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            </View>

            {!item.is_read && (
              <TouchableOpacity
                style={styles.readBtn}
                onPress={() => { void handleMarkAsRead(item.id_notification); }}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Ionicons name="checkmark-done-outline" size={18} color="#2563eb" />
                )}
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f9fafb' },
  listContent: { padding: 16, gap: 12 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f9fafb',
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
  inlineError: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fff1f2',
    color: '#991b1b',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 12,
  },
  cardUnread: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f8fbff',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  message: { fontSize: 13, lineHeight: 19, color: '#4b5563' },
  date: { marginTop: 8, fontSize: 12, color: '#9ca3af' },
  readBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
