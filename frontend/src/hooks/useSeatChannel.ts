import { useEffect, useState, useRef, useCallback } from 'react';
import { seatHoldApi, BACKEND_URL } from '../services/api';

export type SeatChannelConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface UseSeatChannelOptions {
  eventId?: number | string | null;
  showId?: number | string | null;
  enabled?: boolean;
}

export function useSeatChannel({ eventId, showId, enabled = true }: UseSeatChannelOptions) {
  const [heldSeatIds, setHeldSeatIds] = useState<Set<number | string>>(new Set());
  const [connectionState, setConnectionState] = useState<SeatChannelConnectionState>('disconnected');
  const connectionRef = useRef<any>(null);

  // Authoritative snapshot sync
  const syncSnapshot = useCallback(async () => {
    if (!eventId || typeof eventId !== 'number') return;
    try {
      const seatIds = await seatHoldApi.getHeldSeats(eventId, showId ? Number(showId) : undefined);
      if (Array.isArray(seatIds)) {
        setHeldSeatIds(new Set(seatIds));
      }
    } catch (err) {
      console.warn('[useSeatChannel] Failed to sync snapshot:', err);
    }
  }, [eventId, showId]);

  useEffect(() => {
    if (!enabled || !eventId || typeof eventId !== 'number') return;

    let isMounted = true;
    syncSnapshot();

    async function initSignalR() {
      if (isMounted) setConnectionState('connecting');
      try {
        const signalR = await import('@microsoft/signalr');
        const hubUrl = `${BACKEND_URL}/hubs/seating`;

        const conn = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, {
            skipNegotiation: false,
            transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
          })
          .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
          .configureLogging(signalR.LogLevel.Warning)
          .build();

        connectionRef.current = conn;

        conn.on('SeatsHeld', (_evtId: any, seatIds: any[]) => {
          if (!isMounted || !Array.isArray(seatIds)) return;
          setHeldSeatIds(prev => {
            const next = new Set(prev);
            for (const id of seatIds) next.add(id);
            return next;
          });
        });

        conn.on('SeatsReleased', (_evtId: any, seatIds: any[]) => {
          if (!isMounted || !Array.isArray(seatIds)) return;
          setHeldSeatIds(prev => {
            const next = new Set(prev);
            for (const id of seatIds) next.delete(id);
            return next;
          });
        });

        conn.onreconnected(() => {
          if (!isMounted) return;
          setConnectionState('connected');
          // Resync authoritative snapshot after reconnect
          syncSnapshot();
          conn.invoke('JoinEventGroup', eventId).catch(() => {});
        });

        conn.onreconnecting(() => {
          if (isMounted) setConnectionState('reconnecting');
        });

        conn.onclose(() => {
          if (isMounted) setConnectionState('disconnected');
        });

        await conn.start();
        if (isMounted) {
          setConnectionState('connected');
          await conn.invoke('JoinEventGroup', eventId).catch(() => {});
        }
      } catch (err) {
        if (isMounted) setConnectionState('disconnected');
        console.warn('[useSeatChannel] SignalR connection failed, falling back to polling:', err);
      }
    }

    initSignalR();

    return () => {
      isMounted = false;
      setConnectionState('disconnected');
      if (connectionRef.current) {
        connectionRef.current.invoke('LeaveEventGroup', eventId).catch(() => {});
        connectionRef.current.stop().catch(() => {});
        connectionRef.current = null;
      }
    };
  }, [eventId, showId, enabled, syncSnapshot]);

  return {
    heldSeatIds,
    connectionState,
    isConnected: connectionState === 'connected',
    resync: syncSnapshot
  };
}
