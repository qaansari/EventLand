import React from 'react';
import { SeatVisualState, getSeatAriaAttributes } from '../../utils/deriveSeatVisualState';

export interface SeatButtonProps {
  id: number | string;
  label: string;
  state: SeatVisualState;
  price?: number;
  tierName?: string;
  onClick: (id: number | string, label: string) => void;
  style?: React.CSSProperties;
}

const stateStyles: Record<SeatVisualState, React.CSSProperties> = {
  available: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  selected: {
    backgroundColor: '#0d9488',
    border: '1px solid #2dd4bf',
    color: '#ffffff',
    boxShadow: '0 0 10px rgba(45, 212, 191, 0.6)',
    cursor: 'pointer',
  },
  heldByOthers: {
    backgroundColor: '#475569',
    border: '1px solid #64748b',
    color: '#94a3b8',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  booked: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#475569',
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  reserved: {
    backgroundColor: '#334155',
    border: '1px solid #475569',
    color: '#64748b',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  blocked: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#f87171',
    cursor: 'not-allowed',
    opacity: 0.4,
  },
};

export const SeatButton = React.memo(function SeatButton({
  id,
  label,
  state,
  price,
  tierName,
  onClick,
  style,
}: SeatButtonProps) {
  const aria = getSeatAriaAttributes(state, label);
  const isInteractable = state === 'available' || state === 'selected';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isInteractable) {
      onClick(id, label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isInteractable) {
        onClick(id, label);
      }
    }
  };

  return (
    <button
      {...aria}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={`${label} ${tierName ? `(${tierName})` : ''} - PKR ${price ?? 0} [${state}]`}
      style={{
        minWidth: '22px',
        height: '23px',
        padding: '0 2px',
        borderRadius: '4px',
        fontSize: '0.62rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        userSelect: 'none',
        ...stateStyles[state],
        ...style,
      }}
    >
      {label}
    </button>
  );
});
