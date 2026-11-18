export type AuthState =
  | 'login'
  | 'signup'
  | 'forgot_request'
  | 'forgot_verify'
  | 'reset'
  | 'authenticated';

export interface AuthContext {
  state: AuthState;
  email: string;
  error: string | null;
  authData: any | null;
}

export type AuthEvent =
  | { type: 'SWITCH_TO_LOGIN' }
  | { type: 'SWITCH_TO_SIGNUP' }
  | { type: 'SWITCH_TO_FORGOT' }
  | { type: 'FORGOT_SENT'; email: string }
  | { type: 'SWITCH_TO_RESET'; email?: string }
  | { type: 'AUTH_SUCCESS'; authData: any }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'CLEAR_ERROR' };

export function authReducer(context: AuthContext, event: AuthEvent): AuthContext {
  switch (event.type) {
    case 'SWITCH_TO_LOGIN':
      return { ...context, state: 'login', error: null };

    case 'SWITCH_TO_SIGNUP':
      return { ...context, state: 'signup', error: null };

    case 'SWITCH_TO_FORGOT':
      return { ...context, state: 'forgot_request', error: null };

    case 'FORGOT_SENT':
      return { ...context, state: 'forgot_verify', email: event.email, error: null };

    case 'SWITCH_TO_RESET':
      return {
        ...context,
        state: 'reset',
        email: event.email ?? context.email,
        error: null,
      };

    case 'AUTH_SUCCESS':
      return { ...context, state: 'authenticated', authData: event.authData, error: null };

    case 'SET_ERROR':
      return { ...context, error: event.message };

    case 'CLEAR_ERROR':
      return { ...context, error: null };

    default:
      return context;
  }
}
