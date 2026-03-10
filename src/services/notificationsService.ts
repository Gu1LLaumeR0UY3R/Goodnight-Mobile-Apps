// src/services/notificationsService.ts
// Issue #14 — Service des notifications utilisateur

import { apiFetch } from './apiClient';
import type { Notification } from '../types/models';

export const notificationsService = {
  async getAll(): Promise<Notification[]> {
    return apiFetch<Notification[]>('/notifications');
  },

  async markAsRead(id: number): Promise<void> {
    return apiFetch<void>(`/notifications/${id}`, 'PUT', { is_read: true });
  },

  async getUnreadCount(): Promise<number> {
    const notifs = await apiFetch<Notification[]>('/notifications');
    return notifs.filter((n) => !n.is_read).length;
  },
};
