// src/services/notificationsService.ts
// Issue #14 — Service des notifications utilisateur
// Role: couche d'acces aux notifications et au marquage comme lu.

import { fetchApi } from './apiClient';
import type { Notification } from '../types/models';

export const notificationsService = {
  async getAll(): Promise<Notification[]> {
    return fetchApi<Notification[]>('/notifications');
  },

  async markAsRead(id: number): Promise<void> {
    return fetchApi<void>(`/notifications/${id}`, 'PUT', { is_read: true });
  },

  async getUnreadCount(): Promise<number> {
    const notifs = await fetchApi<Notification[]>('/notifications');
    return notifs.filter((n) => !n.is_read).length;
  },
};
