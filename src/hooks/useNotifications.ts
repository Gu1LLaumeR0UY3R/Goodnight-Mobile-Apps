import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

// expo-notifications ne fonctionne pas complètement dans Expo Go — on désactive les alertes locales
const IS_EXPO_GO = Constants.appOwnership === 'expo';
import { useAuth } from './useAuth';
import { notificationsService } from '../services/notificationsService';
import type { Notification as AppNotification } from '../types/models';

// Hook de notifications: récupère le badge, gère le polling et déclenche une alerte locale si besoin.

interface NotificationsContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function useNotifications(): NotificationsContextType {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications doit être utilisé dans NotificationsProvider');
  return context;
}

async function maybeNotifyOnDevice(item: AppNotification): Promise<void> {
  // Notification locale uniquement sur appareil natif, pas dans Expo Go ni sur le web.
  if (Platform.OS === 'web' || IS_EXPO_GO) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title || 'Nouvelle notification',
        body: item.message || 'Vous avez reçu une nouvelle notification',
        sound: true,
      },
      trigger: null,
    });
  } catch {
    // Ignorer les erreurs locales de notification pour ne pas bloquer le flux principal.
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  // Le provider conserve le compteur non lu et le synchronise avec l'API.
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const initialLoadDoneRef = useRef(false);
  const previousUnreadIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (IS_EXPO_GO || Platform.OS === 'web') return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      previousUnreadIdsRef.current = new Set();
      initialLoadDoneRef.current = false;
      return;
    }

    try {
      const rows = await notificationsService.getAll();
      const unreadRows = rows.filter((item) => !item.is_read);
      const currentUnreadIds = new Set(unreadRows.map((item) => item.id_notification));
      setUnreadCount(unreadRows.length);

      if (initialLoadDoneRef.current) {
        const newlyUnread = unreadRows
          .filter((item) => !previousUnreadIdsRef.current.has(item.id_notification))
          .sort((a, b) => b.id_notification - a.id_notification);

        if (newlyUnread.length > 0) {
          await maybeNotifyOnDevice(newlyUnread[0]);
        }
      } else {
        initialLoadDoneRef.current = true;
      }

      previousUnreadIdsRef.current = currentUnreadIds;
    } catch {
      // En cas d'erreur réseau, on garde la dernière valeur de badge.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      previousUnreadIdsRef.current = new Set();
      initialLoadDoneRef.current = false;
      return;
    }

    if (Platform.OS !== 'web' && !IS_EXPO_GO) {
      Notifications.requestPermissionsAsync().catch(() => undefined);
    }

    // Décaler le premier chargement de 3 s pour ne pas bloquer
    // les requêtes critiques (biens, types, favoris) au démarrage
    // sur le serveur PHP mono-thread.
    const initialDelay = setTimeout(() => {
      refreshUnreadCount();
    }, 3000);
    const timer = setInterval(() => {
      refreshUnreadCount();
    }, 25000);

    return () => { clearTimeout(initialDelay); clearInterval(timer); };
  }, [isAuthenticated, refreshUnreadCount]);

  const value = useMemo(() => ({
    unreadCount,
    refreshUnreadCount,
  }), [refreshUnreadCount, unreadCount]);

  return React.createElement(NotificationsContext.Provider, { value }, children);
}
