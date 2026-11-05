import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Coins,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Calculator,
  RefreshCw,
  X,
  HelpCircle,
  ArrowUpDown,
  Sliders,
  DollarSign
} from 'lucide-react';
import { platformFeeApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const defaultForm = {
  id: null,
  name: '',
  minSubtotal: 0,
  maxSubtotal: '',
  feeAmount: 49,
  sortOrder: 0,
  isActive: true,
  description: ''
};

export default function AdminPlatformFeesTab() {
  const { showSuccess, showError, showWarning } = useToast();
  const confirm = useConfirm();

  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  // Live Simulator state
  const [simSubtotal, setSimSubtotal] = useState(7500);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Fetch all tiers
  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await platformFeeApi.getAll();
      setTiers(Array.isArray(data) ? data : []);
    } catch (err) {
      showError('Error Loading Tiers', err.message || 'Failed to load platform fee tiers.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  // Live Simulation evaluation
  const runSimulation = useCallback(async (amount) => {
    if (isNaN(amount) || amount < 0) {
      setSimResult(null);
      return;
    }
    setSimLoading(true);
    try {
      const res = await platformFeeApi.preview(Number(amount));
      setSimResult(res);
    } catch (err) {
      // Quiet fail for simulator
    } finally {
      setSimLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation(simSubtotal);
    }, 300);
    return () => clearTimeout(timer);
  }, [simSubtotal, runSimulation, tiers]);

  // KPI calculations
  const kpis = useMemo(() => {
    const activeTiers = tiers.filter(t => t.isActive);
    const fees = activeTiers.map(t => Number(t.feeAmount));
    const lowestFee = fees.length > 0 ? Math.min(...fees) : 0;
    const highestFee = fees.length > 0 ? Math.max(...fees) : 0;
    return {
      total: tiers.length,
      active: activeTiers.length,
      lowest: lowestFee,
      highest: highestFee
    };
  }, [tiers]);

  const handleOpenAdd = () => {
    setForm({
      ...defaultForm,
      sortOrder: (tiers.length + 1)
    });
    setShowModal(true);
  };

  const handleOpenEdit = (tier) => {
    setForm({
      id: tier.id,
      name: tier.name,
      minSubtotal: tier.minSubtotal,
      maxSubtotal: tier.maxSubtotal != null ? tier.maxSubtotal : '',
      feeAmount: tier.feeAmount,
      sortOrder: tier.sortOrder,
      isActive: tier.isActive,
      description: tier.description || ''
    });
    setShowModal(true);
  };

  const handleSaveTier = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showError('Validation Error', 'Tier Name is required.');
      return;
    }

    const min = Number(form.minSubtotal);
    const max = form.maxSubtotal !== '' && form.maxSubtotal !== null ? Number(form.maxSubtotal) : null;
    const fee = Number(form.feeAmount);
    const sort = Number(form.sortOrder) || 0;

    if (min < 0) {
      showError('Validation Error', 'Minimum subtotal cannot be negative.');
      return;
    }
    if (fee < 0) {
      showError('Validation Error', 'Fee amount cannot be negative.');
      return;
    }
    if (max !== null && max < min) {
      showError('Validation Error', 'Maximum subtotal cannot be lower than minimum subtotal.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        minSubtotal: min,
        maxSubtotal: max,
        feeAmount: fee,
        sortOrder: sort,
        isActive: form.isActive,
        description: form.description?.trim() || null
      };

      if (form.id) {
        await platformFeeApi.update(form.id, payload);
        showSuccess('Tier Updated! ⚙️', `Platform fee tier "${form.name}" has been updated.`);
      } else {
        await platformFeeApi.create(payload);
        showSuccess('Tier Created! 🎟️', `New platform fee tier "${form.name}" created.`);
      }

      setShowModal(false);
      fetchTiers();
    } catch (err) {
      showError('Save Error', err.message || 'Failed to save platform fee tier.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (tier) => {
    try {
      await platformFeeApi.toggle(tier.id);
      showSuccess(
        tier.isActive ? 'Tier Deactivated' : 'Tier Activated',
        `Tier "${tier.name}" is now ${tier.isActive ? 'Inactive' : 'Active'}.`
      );
      fetchTiers();
    } catch (err) {
      showError('Action Failed', err.message || 'Failed to toggle tier status.');
    }
  };

  const handleDelete = async (tier) => {
    const isConfirmed = await confirm({
      title: 'Delete Platform Fee Tier?',
      message: `Are you sure you want to delete "${tier.name}"? This tier will no longer apply to checkouts.`,
      confirmText: 'Delete Tier',
      confirmColor: '#ef4444'
    });

    if (!isConfirmed) return;

    try {
      await platformFeeApi.delete(tier.id);
      showSuccess('Tier Deleted', `Platform fee tier "${tier.name}" was removed.`);
      fetchTiers();
    } catch (err) {
      showError('Delete Failed', err.message || 'Failed to delete fee tier.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* --- HEADER BANNER --- */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0d9488, #0f766e)',
              padding: '0.6rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Coins size={24} color="#fff" />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Platform Fee Configuration & Dynamic Tiers
            </h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: '0.5rem', marginBottom: 0 }}>
            Configure and customize ticket platform fee tiers dynamically. Changes immediately apply to checkout fee calculations in real time without backend restarts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchTiers}
            disabled={loading}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              color: '#cbd5e1',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleOpenAdd}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #0d9488, #0f766e)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.88rem',
              boxShadow: '0 4px 15px rgba(13, 148, 136, 0.3)'
            }}
          >
            <Plus size={18} /> Add New Tier
          </button>
        </div>
      </div>

      {/* --- KPI TILES --- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Configured Tiers
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginTop: '0.25rem' }}>
            {kpis.total}
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(13, 148, 136, 0.3)',
          borderRadius: '14px',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#2dd4bf', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Tiers
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2dd4bf', marginTop: '0.25rem' }}>
            {kpis.active}
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Lowest Active Fee
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.25rem' }}>
            PKR {kpis.lowest.toLocaleString()}
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Highest Active Fee
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#a78bfa', marginTop: '0.25rem' }}>
            PKR {kpis.highest.toLocaleString()}
          </div>
        </div>
      </div>

      {/* --- LIVE FEE SIMULATOR CARD --- */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.12), rgba(15, 23, 42, 0.7))',
        border: '1px solid rgba(13, 148, 136, 0.3)',
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Calculator size={18} color="#2dd4bf" />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Live Platform Fee Simulator
            </h4>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
            Enter a test ticket cart subtotal to verify exactly how the pricing engine evaluates your configured tiers in real time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.25rem' }}>
              Test Subtotal (PKR)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={simSubtotal}
              onChange={e => setSimSubtotal(e.target.value)}
              style={{
                padding: '0.65rem 0.9rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                width: '180px'
              }}
            />
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(13, 148, 136, 0.4)',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            textAlign: 'center',
            minWidth: '200px'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              Calculated Platform Fee
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2dd4bf' }}>
              {simLoading ? (
                <span style={{ fontSize: '1rem', color: '#94a3b8' }}>Evaluating...</span>
              ) : simResult ? (
                `PKR ${Number(simResult.evaluatedFee).toLocaleString()}`
              ) : (
                'PKR 0'
              )}
            </div>
            {simResult?.matchedTierName && (
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                Matched: <strong style={{ color: '#fff' }}>{simResult.matchedTierName}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- TIERS TABLE --- */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="#2dd4bf" /> Configured Platform Fee Tiers
          </h4>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Evaluated by Sort Order (lower numbers checked first)
          </span>
        </div>

        {loading && tiers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block', color: '#2dd4bf' }} />
            Loading platform fee tiers...
          </div>
        ) : tiers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            No platform fee tiers found. Click "Add New Tier" to create one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.25)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 1.25rem' }}>Priority</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Tier Name</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Subtotal Range</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Platform Fee</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Description</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      background: t.isActive ? 'transparent' : 'rgba(239, 68, 68, 0.03)',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ padding: '1rem 1.25rem', color: '#cbd5e1', fontWeight: 700 }}>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.07)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem'
                      }}>
                        #{t.sortOrder}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#fff', fontWeight: 600 }}>
                      {t.name}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#38bdf8', fontWeight: 700 }}>
                      PKR {Number(t.minSubtotal).toLocaleString()}
                      {' — '}
                      {t.maxSubtotal != null ? `PKR ${Number(t.maxSubtotal).toLocaleString()}` : '∞ (Above)'}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#2dd4bf', fontWeight: 800, fontSize: '0.98rem' }}>
                      PKR {Number(t.feeAmount).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <button
                        type="button"
                        onClick={() => handleToggle(t)}
                        title="Click to toggle status"
                        style={{
                          background: t.isActive ? 'rgba(13, 148, 136, 0.2)' : 'rgba(239, 68, 68, 0.18)',
                          color: t.isActive ? '#2dd4bf' : '#f87171',
                          border: `1px solid ${t.isActive ? 'rgba(13, 148, 136, 0.4)' : 'rgba(239, 68, 68, 0.35)'}`,
                          borderRadius: '9999px',
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        {t.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {t.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontSize: '0.82rem', maxWidth: '240px' }}>
                      {t.description || '—'}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '8px',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem'
                          }}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '600px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Coins color="#2dd4bf" size={22} />
              {form.id ? 'Edit Platform Fee Tier' : 'Add New Platform Fee Tier'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Define the ticket subtotal price boundaries and the fixed fee amount charged on checkout.
            </p>

            <form onSubmit={handleSaveTier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Tier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Tier (Up to PKR 5,000)"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Minimum Subtotal (PKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.minSubtotal}
                    onChange={e => setForm({ ...form, minSubtotal: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Maximum Subtotal (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Leave empty for unlimited"
                    value={form.maxSubtotal}
                    onChange={e => setForm({ ...form, maxSubtotal: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Leave blank for open-ended top tier
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Platform Fee Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.feeAmount}
                    onChange={e => setForm({ ...form, feeAmount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#2dd4bf',
                      fontWeight: 800,
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Priority / Sort Order *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.sortOrder}
                    onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Evaluated in ascending order (1, 2, 3...)
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Description / Internal Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Optional context about when this tier applies..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="isActiveTier"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#0d9488', cursor: 'pointer' }}
                />
                <label htmlFor="isActiveTier" style={{ color: '#f8fafc', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                  Active (Tier participates in checkout fee evaluations)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '0.75rem 1.75rem',
                    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(13, 148, 136, 0.3)'
                  }}
                >
                  {isSaving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

