import type {
  LLMProvider,
  LLMProviderCreate,
  LLMProviderUpdate,
  Session,
  SessionCreate,
  SessionUpdate,
  Message,
  SystemStats,
  TestConnectionResponse,
} from '@/types';

const API_BASE_URL = '/api';

// Helper function for API calls
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// LLM Provider API
export const providerApi = {
  getAll: () => fetchApi<LLMProvider[]>('/providers'),
  
  getById: (id: number) => fetchApi<LLMProvider>(`/providers/${id}`),
  
  create: (data: LLMProviderCreate) =>
    fetchApi<LLMProvider>('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: number, data: LLMProviderUpdate) =>
    fetchApi<LLMProvider>(`/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: number) =>
    fetchApi<{ message: string }>(`/providers/${id}`, {
      method: 'DELETE',
    }),
  
  testConnection: (id: number) =>
    fetchApi<TestConnectionResponse>(`/providers/${id}/test`, {
      method: 'POST',
    }),
};

// Session API
export const sessionApi = {
  getAll: (skip = 0, limit = 100) =>
    fetchApi<Session[]>(`/sessions?skip=${skip}&limit=${limit}`),
  
  getById: (id: number) => fetchApi<Session>(`/sessions/${id}`),
  
  create: (data: SessionCreate) =>
    fetchApi<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: number, data: SessionUpdate) =>
    fetchApi<Session>(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: number) =>
    fetchApi<{ message: string }>(`/sessions/${id}`, {
      method: 'DELETE',
    }),
  
  startBrainstorm: (id: number) =>
    fetchApi<{ message: string; session_id: number }>(`/sessions/${id}/start`, {
      method: 'POST',
    }),
  
  stopBrainstorm: (id: number) =>
    fetchApi<{ message: string; session_id: number }>(`/sessions/${id}/stop`, {
      method: 'POST',
    }),
};

// Message API
export const messageApi = {
  getBySession: (sessionId: number, skip = 0, limit = 100) =>
    fetchApi<Message[]>(`/sessions/${sessionId}/messages?skip=${skip}&limit=${limit}`),
};

// Stats API
export const statsApi = {
  getSystemStats: () => fetchApi<SystemStats>('/stats'),
};

// Health Check
export const healthApi = {
  check: () => fetchApi<{ status: string; timestamp: string }>('/health'),
};
