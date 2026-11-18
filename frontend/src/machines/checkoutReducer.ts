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
  errorMessage: string | null;
  expiresAt: string | null;
  secondsRemaining: number;
  isCheckingStatus: boolean;
}

export type CheckoutEvent =
  | { type: 'PROCEED' }
  | { type: 'BACK' }
  | { type: 'START_REDIRECT'; payload: { booking: any; paymentUrl: string; voucher?: string } }
  | { type: 'VOUCHER_ISSUED'; payload: { booking: any; voucher: string; expiresAt?: string } }
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

    case 'START_REDIRECT':
      if (state.state === 'payment_method') {
        return {
          ...state,
          state: 'redirecting',
          booking: event.payload.booking,
          paymentUrl: event.payload.paymentUrl,
          voucherCode: event.payload.voucher ?? state.voucherCode,
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
