export type PayProTrackerStatus =
  | 'idle'
  | 'loading'
  | 'polling'
  | 'terminal_paid'
  | 'terminal_blocked'
  | 'error';

export interface PayProTrackerContext {
  status: PayProTrackerStatus;
  statusData: any | null;
  pollCount: number;
  isAutoPolling: boolean;
  errorMessage: string;
}

export type PayProTrackerEvent =
  | { type: 'FETCH_START'; isBackground?: boolean }
  | { type: 'FETCH_SUCCESS'; data: any }
  | { type: 'FETCH_ERROR'; message: string; isBackground?: boolean }
  | { type: 'POLL_TICK' }
  | { type: 'STOP_POLLING' };

export function isPayProTerminalStatus(data: any): 'paid' | 'blocked' | null {
  if (!data) return null;
  const statusStr = String(data.orderStatus || '').toLowerCase();
  if (data.isPaid || statusStr === 'paid') return 'paid';
  if (statusStr === 'blocked' || statusStr === 'expired') return 'blocked';
  return null;
}

export function createInitialPayProTrackerState(initialStatus: any = null): PayProTrackerContext {
  const terminal = isPayProTerminalStatus(initialStatus);
  return {
    status: terminal === 'paid'
      ? 'terminal_paid'
      : terminal === 'blocked'
      ? 'terminal_blocked'
      : initialStatus
      ? 'polling'
      : 'idle',
    statusData: initialStatus,
    pollCount: 0,
    isAutoPolling: terminal === null,
    errorMessage: '',
  };
}

export function payproTrackerReducer(
  state: PayProTrackerContext,
  event: PayProTrackerEvent
): PayProTrackerContext {
  switch (event.type) {
    case 'FETCH_START':
      return {
        ...state,
        status: event.isBackground ? state.status : 'loading',
        errorMessage: '',
      };

    case 'FETCH_SUCCESS': {
      const terminal = isPayProTerminalStatus(event.data);
      if (terminal === 'paid') {
        return {
          ...state,
          status: 'terminal_paid',
          statusData: event.data,
          isAutoPolling: false,
          errorMessage: '',
        };
      }
      if (terminal === 'blocked') {
        return {
          ...state,
          status: 'terminal_blocked',
          statusData: event.data,
          isAutoPolling: false,
          errorMessage: '',
        };
      }
      return {
        ...state,
        status: state.isAutoPolling ? 'polling' : 'idle',
        statusData: event.data,
        errorMessage: '',
      };
    }

    case 'FETCH_ERROR':
      if (event.isBackground) {
        return state;
      }
      return {
        ...state,
        status: 'error',
        errorMessage: event.message,
      };

    case 'POLL_TICK':
      return {
        ...state,
        pollCount: state.pollCount + 1,
      };

    case 'STOP_POLLING':
      return {
        ...state,
        isAutoPolling: false,
        status: state.status === 'polling' ? 'idle' : state.status,
      };

    default:
      return state;
  }
}
