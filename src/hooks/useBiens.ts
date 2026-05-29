import { useCallback, useEffect, useState } from 'react';
import { biensService, type BienFilters } from '../services/biensService';
import type { Bien } from '../types/models';

export function useBiens(initialFilters: BienFilters = {}) {
  const [items, setItems] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BienFilters>(initialFilters);

  const refetch = useCallback(async (nextFilters?: BienFilters) => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = nextFilters ?? filters;
      const data = await biensService.getAll(activeFilters);
      setItems(data);
      if (nextFilters) {
        setFilters(nextFilters);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement des biens');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    items,
    loading,
    error,
    filters,
    setFilters,
    refetch,
  };
}
