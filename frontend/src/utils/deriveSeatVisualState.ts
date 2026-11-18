/**
 * Pure function determining the visual state of a venue seat with explicit precedence:
 * blocked > booked > selected > heldByOthers > reserved > available
 * 
 * Uses O(1) Set lookups for optimal performance in large auditoriums.
 */

export type SeatVisualState = 
  | 'blocked' 
  | 'booked' 
  | 'selected' 
  | 'heldByOthers' 
  | 'reserved' 
  | 'available';

export interface SeatItem {
  id: number | string;
  label: string;
  status?: string;
  state?: string;
  row?: number | string;
  col?: number;
  price?: number;
}

export interface SeatVisualContext {
  selectedIds: Set<string | number>;
  heldByOthersIds: Set<string | number>;
  bookedIds?: Set<string | number>;
  blockedIds?: Set<string | number>;
  reservedIds?: Set<string | number>;
  disabledLabels?: Set<string>;
  unavailableLabels?: Set<string>;
}

export function deriveSeatVisualState(
  seat: SeatItem,
  ctx: SeatVisualContext
): SeatVisualState {
  const seatId = seat.id;
  const label = seat.label;

  // 1. Blocked: explicitly blocked by organizer, blueprint disabled, or status 'Blocked'
  if (
    ctx.blockedIds?.has(seatId) ||
    seat.status === 'Blocked' ||
    seat.state === 'Blocked' ||
    ctx.disabledLabels?.has(label) ||
    ctx.unavailableLabels?.has(label)
  ) {
    return 'blocked';
  }

  // 2. Booked: permanently booked by confirmed payment
  if (
    ctx.bookedIds?.has(seatId) ||
    seat.status === 'Booked' ||
    seat.state === 'Booked'
  ) {
    return 'booked';
  }

  // 3. Selected: currently selected by the local user in this session
  if (ctx.selectedIds.has(seatId)) {
    return 'selected';
  }

  // 4. HeldByOthers: locked in Redis / real-time SignalR by another attendee
  if (
    ctx.heldByOthersIds.has(seatId) ||
    seat.state === 'TemporarilyHeld'
  ) {
    return 'heldByOthers';
  }

  // 5. Reserved: reserved in DB
  if (
    ctx.reservedIds?.has(seatId) ||
    seat.status === 'Reserved'
  ) {
    return 'reserved';
  }

  // 6. Available: ready for purchase
  return 'available';
}

/**
 * Returns accessible ARIA attributes and styling metadata for a seat state.
 */
export function getSeatAriaAttributes(state: SeatVisualState, label: string) {
  const isInteractable = state === 'available' || state === 'selected';
  return {
    role: 'button',
    'aria-label': `Seat ${label}, ${state}`,
    'aria-pressed': state === 'selected',
    'aria-disabled': !isInteractable,
    tabIndex: isInteractable ? 0 : -1,
  };
}
