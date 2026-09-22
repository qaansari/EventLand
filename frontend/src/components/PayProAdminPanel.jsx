import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Users, FileText, RefreshCw, Plus, Upload, CheckCircle2,
  AlertTriangle, Search, ChevronLeft, ChevronRight, Ban, Check, DollarSign,
  Clock, ArrowUpRight, Filter
} from 'lucide-react';
import { payProApi } from '../services/paypro.api';
import { useToast } from '../context/ToastContext';
import EventLandPreloader from './EventLandPreloader';

export default function PayProAdminPanel() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState('reports'); // 'reports', 'consumers', 'ops'

  // --- TAB 1: PAID ORDERS REPORT (GPO) STATE ---
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [reportPage, setReportPage] = useState(1);
  const [reportLoading, setReportLoading] = useState(false);

  // --- TAB 2: CONSUMERS STATE ---
  const [consumers, setConsumers] = useState([]);
  const [consumerSearch, setConsumerSearch] = useState('');
  const [consumersLoading, setConsumersLoading] = useState(false);
  const [showCreateConsumerModal, setShowCreateConsumerModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [consumerForm, setConsumerForm] = useState({
    consumerId: '',
    name: '',
    mobileNumber: '',
    email: '',
    address: ''
  });
  const [batchCsvText, setBatchCsvText] = useState('');
  const [isSubmittingConsumer, setIsSubmittingConsumer] = useState(false);

  // --- TAB 3: RECONCILIATION & OPS STATE ---
  const [reconcileOlderThan, setReconcileOlderThan] = useState(15);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);

  const [inspectOrderNumber, setInspectOrderNumber] = useState('');
  const [inspectResult, setInspectResult] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const [manualOrderNumber, setManualOrderNumber] = useState('');
  const [manualActionLoading, setManualActionLoading] = useState(false);

  // Fetch Paid Orders Report
  const fetchReport = useCallback(async (page = 1) => {
    setReportLoading(true);
    try {
      const res = await payProApi.getPaidOrdersReport(reportStartDate, reportEndDate, page, 15);
      setReportData(res);
      setReportPage(page);
    } catch (err) {
      showError('Report Error', err.message || 'Failed to load paid orders report.');
    } finally {
      setReportLoading(false);
    }
  }, [reportStartDate, reportEndDate, showError]);

  // Fetch Consumers
  const fetchConsumers = useCallback(async () => {
    setConsumersLoading(true);
    try {
      const res = await payProApi.getConsumers(consumerSearch);
      setConsumers(Array.isArray(res) ? res : []);
    } catch (err) {
      showError('Consumers Error', err.message || 'Failed to load consumers.');
    } finally {
      setConsumersLoading(false);
    }
  }, [consumerSearch, showError]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReport(1);
    } else if (activeTab === 'consumers') {
      fetchConsumers();
    }
  }, [activeTab, fetchReport, fetchConsumers]);

  // Handle Single Consumer Submission
  const handleSaveConsumer = async (e) => {
    e.preventDefault();
    if (!consumerForm.consumerId.trim() || !consumerForm.name.trim()) {
      showError('Validation Error', 'Consumer ID and Name are required.');
      return;
    }

    setIsSubmittingConsumer(true);
    try {
      await payProApi.createConsumer(consumerForm);
      showSuccess('Consumer Registered', `Successfully created PayPro consumer ${consumerForm.consumerId}`);
      setShowCreateConsumerModal(false);
      setConsumerForm({ consumerId: '', name: '', mobileNumber: '', email: '', address: '' });
      fetchConsumers();
    } catch (err) {
      showError('Registration Failed', err.message || 'Error creating consumer in PayPro.');
    } finally {
      setIsSubmittingConsumer(false);
    }
  };

  // Handle Batch Consumers Submission (CSV)
  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!batchCsvText.trim()) {
      showError('Validation Error', 'Please provide CSV lines.');
      return;
    }

    const lines = batchCsvText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#') && !l.toLowerCase().startsWith('consumerid'));

    const parsed = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        consumerId: parts[0] || '',
        name: parts[1] || '',
        mobileNumber: parts[2] || '',
        email: parts[3] || '',
        address: parts[4] || ''
      };
    }).filter(c => c.consumerId && c.name);

    if (parsed.length === 0) {
      showError('Invalid CSV', 'Could not parse any valid consumer records (format: ConsumerID, Name, Mobile, Email, Address).');
      return;
    }

    setIsSubmittingConsumer(true);
    try {
      await payProApi.createBatchConsumers(parsed);
      showSuccess('Batch Created', `Successfully submitted batch of ${parsed.length} consumers to PayPro.`);
      setShowBatchModal(false);
      setBatchCsvText('');
      fetchConsumers();
    } catch (err) {
      showError('Batch Failed', err.message || 'Error executing batch consumer creation.');
    } finally {
      setIsSubmittingConsumer(false);
    }
  };

  // Handle Reconciliation Sweep
  const handleTriggerReconcile = async () => {
    setReconcileLoading(true);
    try {
      const res = await payProApi.reconcile(reconcileOlderThan);
      setReconcileResult(res);
      showSuccess('Reconciliation Complete', `Scanned ${res.scannedOrders} orders, confirmed ${res.updatedToPaid} newly paid.`);
    } catch (err) {
      showError('Reconciliation Failed', err.message || 'Failed to trigger reconciliation.');
    } finally {
      setReconcileLoading(false);
    }
  };

  // Handle Live Status Inspection
  const handleInspectOrder = async (e) => {
    e.preventDefault();
    if (!inspectOrderNumber.trim()) return;

    setInspectLoading(true);
    setInspectResult(null);
    try {
      const res = await payProApi.getOrderStatus(inspectOrderNumber.trim());
      setInspectResult(res);
    } catch (err) {
      showError('Inquiry Error', err.message || 'Failed to inspect order status.');
    } finally {
      setInspectLoading(false);
    }
  };

  // Handle Mark Paid / Blocked
  const handleMarkOrder = async (action) => {
    if (!manualOrderNumber.trim()) {
      showError('Validation Error', 'Enter an order number.');
      return;
    }
    const orderNum = manualOrderNumber.trim();
    const confirmed = window.confirm(`Are you sure you want to mark order '${orderNum}' as ${action.toUpperCase()} in PayPro?`);
    if (!confirmed) return;

    setManualActionLoading(true);
    try {
      if (action === 'paid') {
        const res = await payProApi.markOrdersPaid([orderNum]);
        showSuccess('Order Marked Paid', res.description || 'Order marked as paid.');
      } else {
        const res = await payProApi.markOrdersBlocked([orderNum]);
        showSuccess('Order Blocked', res.description || 'Order marked as blocked.');
      }
      setManualOrderNumber('');
    } catch (err) {
      showError('Action Failed', err.message || `Failed to mark order as ${action}.`);
    } finally {
      setManualActionLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem 0' }}>
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem 2rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(15, 23, 42, 0.8))',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <ShieldCheck size={26} color="#2dd4bf" />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              PayPro (v2) Financial Switch & 1Link Gateway
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            Monitor real-time 1Link transactions, manage merchant consumers, inspect paid order reports, and trigger reconciliation sweeps.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}
          >
            <FileText size={16} /> Paid Orders (GPO)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('consumers')}
            className={`btn ${activeTab === 'consumers' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}
          >
            <Users size={16} /> Consumers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ops')}
            className={`btn ${activeTab === 'ops' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}
          >
            <RefreshCw size={16} /> Reconciliation & Ops
          </button>
        </div>
      </div>

      {/* --- TAB 1: PAID ORDERS REPORT (GPO) --- */}
      {activeTab === 'reports' && (
        <div>
          {/* Controls Bar */}
          <div
            className="glass-card"
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  style={{
                    padding: '0.55rem 0.8rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  style={{
                    padding: '0.55rem 0.8rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => fetchReport(1)}
                disabled={reportLoading}
                className="btn btn-primary"
                style={{
                  alignSelf: 'flex-end',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.6rem 1.2rem'
                }}
              >
                <Filter size={15} /> Apply Filter
              </button>
            </div>

            {/* Summary Metrics */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Total Paid Orders</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                  {reportData?.totalItems ?? 0}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Total Collected</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2dd4bf' }}>
                  PKR {Number(reportData?.totalAmountPaid ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Report Table */}
          <div className="glass-card" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            {reportLoading ? (
              <EventLandPreloader compact={true} text="Querying PayPro GPO Report..." minHeight="240px" />
            ) : !reportData || reportData.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
                <FileText size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1.05rem', color: '#cbd5e1', fontWeight: 600 }}>No paid orders found in selected range.</p>
                <p style={{ fontSize: '0.85rem' }}>Try adjusting your date filter or trigger a reconciliation sweep.</p>
              </div>
            ) : (
              <div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>PayPro ID</th>
                        <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Order Number</th>
                        <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Consumer ID</th>
                        <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Amount Paid</th>
                        <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Payment Mode</th>
                        <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Date & Time Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.items.map((item, idx) => (
                        <tr
                          key={item.payProId || idx}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'background 0.2s',
                            background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                            {item.payProId || '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>
                            {item.orderNumber || '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1.25rem', color: '#cbd5e1' }}>
                            {item.consumerId || '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1.25rem', color: '#2dd4bf', fontWeight: 700 }}>
                            PKR {Number(item.amountPaid || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.85rem 1.25rem', color: '#94a3b8' }}>
                            <span
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              {item.paymentMode || '1Link / OTC'}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1.25rem', color: '#94a3b8' }}>
                            {item.datePaid ? new Date(item.datePaid).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(15, 23, 42, 0.4)'
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    Showing page {reportData.pageNumber} of {reportData.totalPages} ({reportData.totalItems} total records)
                  </span>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => fetchReport(reportPage - 1)}
                      disabled={reportPage <= 1 || reportLoading}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchReport(reportPage + 1)}
                      disabled={reportPage >= reportData.totalPages || reportLoading}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: CONSUMERS MANAGEMENT --- */}
      {activeTab === 'consumers' && (
        <div>
          {/* Header Controls */}
          <div
            className="glass-card"
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            {/* Search Box */}
            <div style={{ position: 'relative', flex: '1', maxWidth: '380px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={consumerSearch}
                onChange={(e) => setConsumerSearch(e.target.value)}
                placeholder="Search consumers by ID, Name, Phone..."
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem 0.65rem 2.4rem',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Upload size={15} /> Batch Import (CSV)
              </button>
              <button
                type="button"
                onClick={() => setShowCreateConsumerModal(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Plus size={15} /> Register Consumer
              </button>
            </div>
          </div>

          {/* Consumers Table */}
          <div className="glass-card" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            {consumersLoading ? (
              <EventLandPreloader compact={true} text="Loading PayPro Consumers..." minHeight="240px" />
            ) : consumers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
                <Users size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1.05rem', color: '#cbd5e1', fontWeight: 600 }}>No registered consumers found.</p>
                <p style={{ fontSize: '0.85rem' }}>Click &quot;Register Consumer&quot; or &quot;Batch Import&quot; to add consumers to PayPro.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Consumer ID</th>
                      <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Mobile Number</th>
                      <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Address</th>
                      <th style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontWeight: 600 }}>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumers.map((c, idx) => (
                      <tr
                        key={c.id || c.consumerId || idx}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                          {c.consumerId}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', color: '#fff', fontWeight: 600 }}>
                          {c.name}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', color: '#cbd5e1' }}>
                          {c.mobileNumber || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', color: '#cbd5e1' }}>
                          {c.email || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', color: '#94a3b8' }}>
                          {c.address || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.78rem' }}>
                          {c.createdAtUtc ? new Date(c.createdAtUtc).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: RECONCILIATION & OPS TOOL --- */}
      {activeTab === 'ops' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Card 1: Trigger Manual Reconciliation Sweep */}
          <div
            className="glass-card"
            style={{
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <RefreshCw size={20} color="#2dd4bf" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Automated Reconciliation Sweep
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Runs every 10 minutes in the background. Sweeps pending and unpaid orders older than a specified threshold, checks live status with PayPro, and automatically issues confirmed tickets for newly paid orders.
              </p>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Sweep Threshold (Minutes):
                </label>
                <select
                  value={reconcileOlderThan}
                  onChange={(e) => setReconcileOlderThan(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                >
                  <option value={5}>Older than 5 minutes</option>
                  <option value={15}>Older than 15 minutes (Standard)</option>
                  <option value={30}>Older than 30 minutes</option>
                  <option value={60}>Older than 1 hour</option>
                  <option value={0}>All pending orders (Immediate)</option>
                </select>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleTriggerReconcile}
                disabled={reconcileLoading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 700
                }}
              >
                <RefreshCw size={16} className={reconcileLoading ? 'spin-animation' : ''} />
                <span>{reconcileLoading ? 'Sweeping Orders...' : 'Trigger Sweep Now'}</span>
              </button>

              {reconcileResult && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.85rem',
                    background: 'rgba(13, 148, 136, 0.15)',
                    borderRadius: '8px',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#94a3b8' }}>Orders Scanned:</span>
                    <strong style={{ color: '#fff' }}>{reconcileResult.scannedOrders}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#94a3b8' }}>Marked as Paid:</span>
                    <strong style={{ color: '#2dd4bf' }}>{reconcileResult.updatedToPaid}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Errors Encountered:</span>
                    <strong style={{ color: reconcileResult.errors?.length > 0 ? '#f87171' : '#fff' }}>
                      {reconcileResult.errors?.length || 0}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Live Status Inquiry (ggosboi) */}
          <div
            className="glass-card"
            style={{
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Search size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Live Order Inquiry (ggosboi)
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Direct live query to PayPro’s core engine by Order Number / Invoice ID. Shows current financial switch status.
              </p>

              <form onSubmit={handleInspectOrder} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={inspectOrderNumber}
                    onChange={(e) => setInspectOrderNumber(e.target.value)}
                    placeholder="e.g. EVL-10293 or 10001"
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.9rem',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={inspectLoading}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.65rem 1rem',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: inspectLoading ? 'not-allowed' : 'pointer',
                      opacity: inspectLoading ? 0.75 : 1
                    }}
                  >
                    {inspectLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Querying...</span>
                      </>
                    ) : (
                      'Query'
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div>
              {inspectResult && (
                <div
                  style={{
                    padding: '0.85rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#94a3b8' }}>Order Number:</span>
                    <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{inspectResult.orderNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#94a3b8' }}>Status:</span>
                    <strong style={{ color: inspectResult.isPaid ? '#2dd4bf' : '#fbbf24' }}>
                      {inspectResult.orderStatus || 'Pending'}
                    </strong>
                  </div>
                  {inspectResult.payProId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ color: '#94a3b8' }}>PayPro ID:</span>
                      <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{inspectResult.payProId}</span>
                    </div>
                  )}
                  {inspectResult.amountPaid > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Amount Paid:</span>
                      <strong style={{ color: '#2dd4bf' }}>PKR {Number(inspectResult.amountPaid).toLocaleString()}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Administrative State Overrides (moap / moab) */}
          <div
            className="glass-card"
            style={{
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Ban size={20} color="#f87171" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Manual Order Override (moap / moab)
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Explicitly mark orders as Paid or Blocked directly on PayPro servers. Useful for manual reconciliations or customer dispute resolution.
              </p>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Target Order Number:
                </label>
                <input
                  type="text"
                  value={manualOrderNumber}
                  onChange={(e) => setManualOrderNumber(e.target.value)}
                  placeholder="Order Number / Invoice ID"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleMarkOrder('paid')}
                disabled={manualActionLoading}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.65rem'
                }}
              >
                <CheckCircle2 size={15} /> Mark Paid (moap)
              </button>
              <button
                type="button"
                onClick={() => handleMarkOrder('blocked')}
                disabled={manualActionLoading}
                className="btn"
                style={{
                  flex: 1,
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <Ban size={15} /> Block Order (moab)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE SINGLE CONSUMER --- */}
      {showCreateConsumerModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            className="glass-card"
            style={{
              padding: '2rem',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem' }}>
              Register PayPro Consumer
            </h3>

            <form onSubmit={handleSaveConsumer}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Consumer ID *
                </label>
                <input
                  type="text"
                  required
                  value={consumerForm.consumerId}
                  onChange={(e) => setConsumerForm({ ...consumerForm, consumerId: e.target.value })}
                  placeholder="e.g. CUST-1001 or CNIC"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Consumer Name *
                </label>
                <input
                  type="text"
                  required
                  value={consumerForm.name}
                  onChange={(e) => setConsumerForm({ ...consumerForm, name: e.target.value })}
                  placeholder="Full Legal Name"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={consumerForm.mobileNumber}
                  onChange={(e) => setConsumerForm({ ...consumerForm, mobileNumber: e.target.value })}
                  placeholder="e.g. 03001234567"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={consumerForm.email}
                  onChange={(e) => setConsumerForm({ ...consumerForm, email: e.target.value })}
                  placeholder="name@example.com"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Address
                </label>
                <input
                  type="text"
                  value={consumerForm.address}
                  onChange={(e) => setConsumerForm({ ...consumerForm, address: e.target.value })}
                  placeholder="Street / City"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateConsumerModal(false)}
                  className="btn btn-secondary"
                  disabled={isSubmittingConsumer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConsumer}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: isSubmittingConsumer ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingConsumer ? 0.75 : 1
                  }}
                >
                  {isSubmittingConsumer ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    'Register'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: BATCH IMPORT CONSUMERS (CSV) --- */}
      {showBatchModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            className="glass-card"
            style={{
              padding: '2rem',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Batch Import PayPro Consumers
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Enter or paste comma-separated lines. Format:
              <br />
              <code style={{ color: '#2dd4bf', background: 'rgba(15, 23, 42, 0.6)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                ConsumerID, Name, MobileNumber, Email, Address
              </code>
            </p>

            <form onSubmit={handleBatchSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <textarea
                  rows={8}
                  required
                  value={batchCsvText}
                  onChange={(e) => setBatchCsvText(e.target.value)}
                  placeholder={`CUST001, Ali Khan, 03001234567, ali@gmail.com, Karachi\nCUST002, Sara Ahmed, 03129876543, sara@gmail.com, Lahore`}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="btn btn-secondary"
                  disabled={isSubmittingConsumer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConsumer}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: isSubmittingConsumer ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingConsumer ? 0.75 : 1
                  }}
                >
                  {isSubmittingConsumer ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    'Import Batch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
