import { useCallback, useEffect, useState } from 'react';
import { reservationsService } from '../services/reservationsService';
import type { Reservation } from '../types/models';

export function useReservations() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reservationsService.getAll();
      setItems(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement des réservations');
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelReservation = useCallback(async (id: number) => {
    await reservationsService.cancel(id);
    setItems(prev => prev.filter(item => item.id_reservation !== id));
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    items,
    loading,
    error,
    refetch,
    cancelReservation,
  };
}
