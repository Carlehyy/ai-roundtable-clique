// LLM Provider Types
export type LLMProviderStatus = 'online' | 'offline' | 'error' | 'testing';

export interface LLMProvider {
  id: number;
  name: string;
  display_name: string;
  provider_type: string;
  model_name: string;
  api_key?: string;
  api_key_masked?: string;
  api_base?: string;
  status: LLMProviderStatus;
  is_enabled: boolean;
  total_quota?: number;
  used_quota: number;
  remaining_quota?: number;
  avg_response_time?: number;
  success_rate: number;
  last_check_at?: string;
  brand_color: string;
  icon_url?: string;
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LLMProviderCreate {
  name: string;
  display_name: string;
  provider_type: string;
  model_name: string;
  api_key?: string;
  api_base?: string;
  brand_color?: string;
  icon_url?: string;
  config?: Record<string, any>;
}

export interface LLMProviderUpdate {
  display_name?: string;
  api_key?: string;
  api_base?: string;
  model_name?: string;
  is_enabled?: boolean;
  brand_color?: string;
  config?: Record<string, any>;
}

// Session Types
export interface Session {
  id: number;
  title: string;
  description?: string;
  topic: string;
  max_rounds: number;
  current_round: number;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  is_completed: boolean;
  consensus_reached: boolean;
  consensus_percentage: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  llms: LLMProvider[];
  message_count?: number;
}

export interface SessionCreate {
  title: string;
  description?: string;
  topic: string;
  llm_ids: number[];
  max_rounds?: number;
  temperature?: number;
  max_tokens?: number;
}

export interface SessionUpdate {
  title?: string;
  description?: string;
  is_active?: boolean;
  is_completed?: boolean;
  consensus_reached?: boolean;
  consensus_percentage?: number;
}

// Message Types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: number;
  session_id: number;
  llm_id?: number;
  llm_name?: string;
  llm_brand_color?: string;
  role: MessageRole;
  content: string;
  thinking_content?: string;
  tokens_used?: number;
  response_time_ms?: number;
  sentiment?: string;
  key_points?: string[];
  created_at: string;
}

// Consensus Types
export interface ConsensusPoint {
  id: number;
  session_id: number;
  point_text: string;
  agreement_percentage: number;
  supporting_llms: string[];
  opposing_llms: string[];
  is_resolved: boolean;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
}

// WebSocket Types
export type WSMessageType = 
  | 'join_session'
  | 'leave_session'
  | 'send_message'
  | 'start_brainstorm'
  | 'next_round'
  | 'user_joined'
  | 'user_left'
  | 'new_message'
  | 'llm_typing'
  | 'llm_stopped_typing'
  | 'consensus_update'
  | 'round_update'
  | 'session_completed'
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  data: Record<string, any>;
  timestamp: string;
}

// System Stats
export interface SystemStats {
  total_sessions: number;
  active_sessions: number;
  total_messages: number;
  total_llms: number;
  online_llms: number;
}

// Test Connection Response
export interface TestConnectionResponse {
  success: boolean;
  message: string;
  response_time_ms?: number;
  quota_info?: {
    total?: number;
    used?: number;
    remaining?: number;
  };
}

// UI Types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}
