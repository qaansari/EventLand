export type CheckoutState = 
  | 'buyer_info'
  | 'payment_method'
  | 'redirecting'
  | 'voucher_pending'
  | 'confirmed'
  | 'failed';

export interface CheckoutContext {
  state: CheckoutState;
  booking: any | null;
  voucherCode: string | null;
  paymentUrl: string | null;
  payproResponse?: any | null;
  isInitiating?: boolean;
  errorMessage: string | null;
  expiresAt: string | null;
  secondsRemaining: number;
  isCheckingStatus: boolean;
}

export type CheckoutEvent =
  | { type: 'PROCEED' }
  | { type: 'BACK' }
  | { type: 'BOOKING_CREATED'; booking: any }
  | { type: 'INITIATE_START' }
  | { type: 'INITIATE_DONE'; response?: any }
  | { type: 'SYNC_EXPIRY'; secondsRemaining: number }
  | { type: 'START_REDIRECT'; payload: { booking: any; paymentUrl: string; voucher?: string; payproResponse?: any } }
  | { type: 'VOUCHER_ISSUED'; payload: { booking: any; voucher: string; expiresAt?: string; payproResponse?: any } }
  | { type: 'STATUS_CHECK_START' }
  | { type: 'STATUS_CHECKED'; status: 'paid' | 'pending' | 'failed'; message?: string }
  | { type: 'TICK' }
  | { type: 'FAIL'; message: string }
  | { type: 'RESET' };

export function getInitialContext(): CheckoutContext {
  return {
    state: 'buyer_info',
    booking: null,
    voucherCode: null,
    paymentUrl: null,
    payproResponse: null,
    isInitiating: false,
    errorMessage: null,
    expiresAt: null,
    secondsRemaining: 1800, // 30 minutes
    isCheckingStatus: false,
  };
}

export function checkoutReducer(state: CheckoutContext, event: CheckoutEvent): CheckoutContext {
  switch (event.type) {
    case 'PROCEED':
      if (state.state === 'buyer_info') {
        return { ...state, state: 'payment_method', errorMessage: null };
      }
      return state;

    case 'BACK':
      if (state.state === 'payment_method') {
        return { ...state, state: 'buyer_info', errorMessage: null };
      }
      return state;

    case 'BOOKING_CREATED':
      return { ...state, booking: event.booking };

    case 'INITIATE_START':
      return { ...state, isInitiating: true, errorMessage: null };

    case 'INITIATE_DONE':
      return {
        ...state,
        isInitiating: false,
        payproResponse: event.response !== undefined ? event.response : state.payproResponse,
      };

    case 'SYNC_EXPIRY':
      return { ...state, secondsRemaining: Math.max(0, event.secondsRemaining) };

    case 'START_REDIRECT':
      if (state.state === 'payment_method') {
        return {
          ...state,
          state: 'redirecting',
          booking: event.payload.booking,
          paymentUrl: event.payload.paymentUrl,
          voucherCode: event.payload.voucher ?? state.voucherCode,
          payproResponse: event.payload.payproResponse ?? state.payproResponse,
          isInitiating: false,
          errorMessage: null,
        };
      }
      return state;

    case 'VOUCHER_ISSUED':
      if (state.state === 'payment_method' || state.state === 'redirecting') {
        const exp = event.payload.expiresAt ?? state.expiresAt;
        return {
          ...state,
          state: 'voucher_pending',
          booking: event.payload.booking,
          voucherCode: event.payload.voucher,
          payproResponse: event.payload.payproResponse ?? state.payproResponse,
          isInitiating: false,
          expiresAt: exp,
          errorMessage: null,
        };
      }
      return state;

    case 'STATUS_CHECK_START':
      return { ...state, isCheckingStatus: true };

    case 'STATUS_CHECKED':
      if (event.status === 'paid') {
        return { ...state, state: 'confirmed', isCheckingStatus: false, errorMessage: null };
      }
      if (event.status === 'failed') {
        return { ...state, state: 'failed', isCheckingStatus: false, errorMessage: event.message || 'Payment was declined or failed.' };
      }
      return { ...state, isCheckingStatus: false };

    case 'TICK':
      if (state.secondsRemaining <= 1) {
        if (state.state === 'voucher_pending' || state.state === 'payment_method' || state.state === 'buyer_info') {
          return { ...state, secondsRemaining: 0, state: 'failed', errorMessage: 'Payment reservation window has expired.' };
        }
        return { ...state, secondsRemaining: 0 };
      }
      return { ...state, secondsRemaining: state.secondsRemaining - 1 };

    case 'FAIL':
      return { ...state, state: 'failed', isCheckingStatus: false, errorMessage: event.message };

    case 'RESET':
      return getInitialContext();

    default:
      return state;
  }
}
