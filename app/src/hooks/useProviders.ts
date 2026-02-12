import { useState, useEffect, useCallback } from 'react';
import { providerApi } from '@/services/api';
import type { LLMProvider, LLMProviderCreate, LLMProviderUpdate } from '@/types';

export function useProviders() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await providerApi.getAll();
      setProviders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const createProvider = async (data: LLMProviderCreate) => {
    try {
      const newProvider = await providerApi.create(data);
      setProviders((prev) => [...prev, newProvider]);
      return newProvider;
    } catch (err) {
      throw err;
    }
  };

  const updateProvider = async (id: number, data: LLMProviderUpdate) => {
    try {
      const updated = await providerApi.update(id, data);
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      );
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteProvider = async (id: number) => {
    try {
      await providerApi.delete(id);
      setProviders((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const testConnection = async (id: number) => {
    return providerApi.testConnection(id);
  };

  return {
    providers,
    loading,
    error,
    refresh: fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    testConnection,
  };
}
