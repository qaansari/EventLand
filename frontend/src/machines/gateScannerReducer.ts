export type GateScannerState =
  | { status: 'idle'; result: null; error: null }
  | { status: 'validating'; result: any | null; error: null }
  | { status: 'verified'; result: any; error: null }
  | { status: 'resetting'; result: any; error: null }
  | { status: 'error'; result: null; error: string };

export type GateScannerEvent =
  | { type: 'VALIDATE_START' }
  | { type: 'VALIDATE_SUCCESS'; result: any }
  | { type: 'VALIDATE_ERROR'; error: string }
  | { type: 'RESET_START' }
  | { type: 'RESET_SUCCESS'; result: any }
  | { type: 'RESET_ERROR'; error: string };

export const initialGateScannerState: GateScannerState = {
  status: 'idle',
  result: null,
  error: null,
};

export function gateScannerReducer(
  state: GateScannerState,
  event: GateScannerEvent
): GateScannerState {
  switch (event.type) {
    case 'VALIDATE_START':
      return { status: 'validating', result: null, error: null };

    case 'VALIDATE_SUCCESS':
      return { status: 'verified', result: event.result, error: null };

    case 'VALIDATE_ERROR':
      return { status: 'error', result: null, error: event.error };

    case 'RESET_START':
      if (state.status !== 'verified' && state.status !== 'validating') {
        return state;
      }
      return { status: 'resetting', result: state.result, error: null };

    case 'RESET_SUCCESS':
      return { status: 'verified', result: event.result, error: null };

    case 'RESET_ERROR':
      return { status: 'error', result: null, error: event.error };

    default:
      return state;
  }
}
