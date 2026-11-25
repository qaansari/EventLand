export type UnpaidInvoiceAction =
  | null
  | { type: 'paypro'; invoiceKey: string }
  | { type: 'upload'; invoiceKey: string }
  | { type: 'submit_proof'; invoiceKey: string };

export interface UnpaidInvoicesState {
  listStatus: 'idle' | 'loading' | 'error';
  activeAction: UnpaidInvoiceAction;
  errorMessage: string | null;
}

export type UnpaidInvoicesEvent =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS' }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'ACTION_START'; action: Exclude<UnpaidInvoiceAction, null> }
  | { type: 'ACTION_DONE' };

export const initialUnpaidInvoicesState: UnpaidInvoicesState = {
  listStatus: 'loading',
  activeAction: null,
  errorMessage: null,
};

export function unpaidInvoicesReducer(
  state: UnpaidInvoicesState,
  event: UnpaidInvoicesEvent
): UnpaidInvoicesState {
  switch (event.type) {
    case 'LOAD_START':
      return { ...state, listStatus: 'loading', errorMessage: null };

    case 'LOAD_SUCCESS':
      return { ...state, listStatus: 'idle', errorMessage: null };

    case 'LOAD_ERROR':
      return { ...state, listStatus: 'error', errorMessage: event.message };

    case 'ACTION_START':
      // Prevent concurrent mutations while another invoice action is in flight
      if (state.activeAction !== null) return state;
      return { ...state, activeAction: event.action };

    case 'ACTION_DONE':
      return { ...state, activeAction: null };

    default:
      return state;
  }
}
