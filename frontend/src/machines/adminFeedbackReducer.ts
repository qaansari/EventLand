export type AdminAsyncStatus = 'idle' | 'loading' | 'saving';

export type AdminFeedback =
  | null
  | { type: 'error'; message: string }
  | { type: 'success'; message: string };

export interface AdminFeedbackState {
  asyncStatus: AdminAsyncStatus;
  feedback: AdminFeedback;
}

export type AdminFeedbackEvent =
  | { type: 'SET_LOADING'; active: boolean }
  | { type: 'SET_SAVING'; active: boolean }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_SUCCESS'; message: string }
  | { type: 'CLEAR_FEEDBACK' };

export const initialAdminFeedbackState: AdminFeedbackState = {
  asyncStatus: 'loading',
  feedback: null,
};

export function adminFeedbackReducer(
  state: AdminFeedbackState,
  event: AdminFeedbackEvent
): AdminFeedbackState {
  switch (event.type) {
    case 'SET_LOADING':
      return {
        ...state,
        asyncStatus: event.active ? 'loading' : (state.asyncStatus === 'loading' ? 'idle' : state.asyncStatus),
      };

    case 'SET_SAVING':
      return {
        ...state,
        asyncStatus: event.active ? 'saving' : (state.asyncStatus === 'saving' ? 'idle' : state.asyncStatus),
      };

    case 'SET_ERROR':
      return {
        ...state,
        feedback: event.message ? { type: 'error', message: event.message } : null,
      };

    case 'SET_SUCCESS':
      return {
        ...state,
        feedback: event.message ? { type: 'success', message: event.message } : null,
      };

    case 'CLEAR_FEEDBACK':
      return { ...state, feedback: null };

    default:
      return state;
  }
}
