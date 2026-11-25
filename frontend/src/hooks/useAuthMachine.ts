import { useReducer, useCallback } from 'react';
import {
  authReducer,
  AuthState,
  AuthContext,
  AuthEvent
} from '../machines/authReducer';

export type { AuthState, AuthContext, AuthEvent };
export { authReducer };

export function useAuthMachine(initialState: 'login' | 'signup' = 'login') {
  const [context, dispatch] = useReducer(authReducer, {
    state: initialState,
    email: '',
    error: null,
    authData: null,
    isSubmitting: false,
    socialProvider: null,
  });

  const switchToLogin = useCallback(() => dispatch({ type: 'SWITCH_TO_LOGIN' }), []);
  const switchToSignup = useCallback(() => dispatch({ type: 'SWITCH_TO_SIGNUP' }), []);
  const switchToForgot = useCallback(() => dispatch({ type: 'SWITCH_TO_FORGOT' }), []);
  const onForgotSent = useCallback((email: string) => dispatch({ type: 'FORGOT_SENT', email }), []);
  const switchToReset = useCallback((email?: string) => dispatch({ type: 'SWITCH_TO_RESET', email }), []);
  const startSubmit = useCallback(() => dispatch({ type: 'START_SUBMIT' }), []);
  const startSocialSubmit = useCallback((provider: 'google' | 'facebook') => dispatch({ type: 'START_SOCIAL_SUBMIT', provider }), []);
  const stopSubmit = useCallback(() => dispatch({ type: 'STOP_SUBMIT' }), []);
  const onAuthSuccess = useCallback((authData: any) => dispatch({ type: 'AUTH_SUCCESS', authData }), []);
  const setError = useCallback((message: string) => dispatch({ type: 'SET_ERROR', message }), []);
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return {
    state: context.state,
    context,
    dispatch,
    switchToLogin,
    switchToSignup,
    switchToForgot,
    onForgotSent,
    switchToReset,
    startSubmit,
    startSocialSubmit,
    stopSubmit,
    onAuthSuccess,
    setError,
    clearError,
  };
}
