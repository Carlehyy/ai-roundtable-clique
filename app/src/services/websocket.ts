import type { WSMessage, WSMessageType } from '@/types';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: number | null = null;
  private messageHandlers: Map<WSMessageType, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(sessionId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sessionId = sessionId;
      const wsUrl = `ws://localhost:8000/ws/sessions/${sessionId}`;
      
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.messageHandlers.clear();
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId).catch(() => {
          // Reconnection failed, will try again if attempts remain
        });
      }
    }, delay);
  }

  send(type: WSMessageType, data: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  on(type: WSMessageType, handler: (data: any) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  private handleMessage(message: WSMessage) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message.data));
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const wsService = new WebSocketService();
