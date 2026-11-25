export type AppOverlay =
  | null
  | { type: 'seat_picker'; event: any }
  | { type: 'checkout'; data: any }
  | { type: 'ticket'; booking: any }
  | { type: 'auth'; role: string; pendingBooking?: any };

export type OverlayEvent =
  | { type: 'OPEN_SEAT_PICKER'; event: any }
  | { type: 'OPEN_CHECKOUT'; data: any }
  | { type: 'OPEN_TICKET'; booking: any }
  | { type: 'OPEN_AUTH'; role?: string; pendingBooking?: any }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'AUTH_EXPIRED' };

export function overlayReducer(
  state: AppOverlay,
  event: OverlayEvent
): AppOverlay {
  switch (event.type) {
    case 'OPEN_SEAT_PICKER':
      return { type: 'seat_picker', event: event.event };

    case 'OPEN_CHECKOUT':
      return { type: 'checkout', data: event.data };

    case 'OPEN_TICKET':
      return { type: 'ticket', booking: event.booking };

    case 'OPEN_AUTH':
      return {
        type: 'auth',
        role: event.role || 'customer',
        pendingBooking: event.pendingBooking ?? null,
      };

    case 'CLOSE_OVERLAY':
    case 'AUTH_EXPIRED':
      return null;

    default:
      return state;
  }
}
