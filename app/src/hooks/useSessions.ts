import { useState, useEffect, useCallback } from 'react';
import { sessionApi } from '@/services/api';
import type { Session, SessionCreate, SessionUpdate } from '@/types';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sessionApi.getAll();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async (data: SessionCreate) => {
    try {
      const newSession = await sessionApi.create(data);
      setSessions((prev) => [newSession, ...prev]);
      return newSession;
    } catch (err) {
      throw err;
    }
  };

  const updateSession = async (id: number, data: SessionUpdate) => {
    try {
      const updated = await sessionApi.update(id, data);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? updated : s))
      );
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteSession = async (id: number) => {
    try {
      await sessionApi.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const startBrainstorm = async (id: number) => {
    return sessionApi.startBrainstorm(id);
  };

  const stopBrainstorm = async (id: number) => {
    return sessionApi.stopBrainstorm(id);
  };

  return {
    sessions,
    loading,
    error,
    refresh: fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    startBrainstorm,
    stopBrainstorm,
  };
}
