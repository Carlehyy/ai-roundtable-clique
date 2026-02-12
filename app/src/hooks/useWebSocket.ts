import { useEffect, useRef, useCallback, useState } from 'react';
import { wsService } from '@/services/websocket';
import type { WSMessageType } from '@/types';

export function useWebSocket(sessionId: number | null) {
  const [isConnected, setIsConnected] = useState(false);
  const unsubscribeRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setIsConnected(false);
      return;
    }

    const connect = async () => {
      try {
        await wsService.connect(sessionId);
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      // Unsubscribe all handlers
      unsubscribeRef.current.forEach((unsub) => unsub());
      unsubscribeRef.current = [];
      wsService.disconnect();
      setIsConnected(false);
    };
  }, [sessionId]);

  const subscribe = useCallback(<T,>(type: WSMessageType, handler: (data: T) => void) => {
    const unsub = wsService.on(type, handler as (data: any) => void);
    unsubscribeRef.current.push(unsub);
    return unsub;
  }, []);

  const send = useCallback((type: WSMessageType, data: Record<string, any>) => {
    wsService.send(type, data);
  }, []);

  return {
    isConnected,
    subscribe,
    send,
  };
}
