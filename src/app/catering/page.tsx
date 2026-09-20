'use client';

import React, { useState, useEffect } from 'react';
import { fetchCateringLeads, updateCateringLeadStatus, recordCateringAdvance, CateringLeadDto } from '../../services/admin-api.client';
import { buildWhatsAppUrl, WhatsAppTemplates } from '../../utils/whatsapp';

export default function AdminCateringPage() {
  const [leads, setLeads] = useState<CateringLeadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Advance Payment Modal State
  const [advanceModalLead, setAdvanceModalLead] = useState<CateringLeadDto | null>(null);
  const [advanceForm, setAdvanceForm] = useState({
    amount: '',
    paymentMode: 'UPI' as 'CASH' | 'UPI' | 'CREDIT',
    transactionRef: ''
  });
  const [recordingAdvance, setRecordingAdvance] = useState(false);

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCateringLeads(50);
      setLeads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load catering leads from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdatingId(leadId);
    setActionSuccess(null);
    try {
      await updateCateringLeadStatus(leadId, newStatus);
      setLeads(prev =>
        prev.map(l => (l.id === leadId ? { ...l, status: newStatus as any } : l))
      );
      setActionSuccess(`Lead status updated to ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRecordAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceModalLead) return;

    const amt = parseFloat(advanceForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid advance amount');
      return;
    }

    setRecordingAdvance(true);
    try {
      await recordCateringAdvance(
        advanceModalLead.id,
        amt,
        advanceForm.paymentMode,
        advanceForm.transactionRef || undefined
      );

      // Update lead in local state
      setLeads(prev =>
        prev.map(l =>
          l.id === advanceModalLead.id
            ? { ...l, status: 'ADVANCE_RECEIVED', advanceAmountPaid: (l.advanceAmountPaid || 0) + amt }
            : l
        )
      );

      setActionSuccess(`₹${amt.toFixed(2)} advance recorded & credited to ledger!`);
      setAdvanceModalLead(null);
      setAdvanceForm({ amount: '', paymentMode: 'UPI', transactionRef: '' });
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Failed to record advance: ${err.message}`);
    } finally {
      setRecordingAdvance(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return { color: '#0284C7', bg: '#E0F2FE', label: '1. New' };
      case 'CONTACTED':
        return { color: '#D97706', bg: '#FEF3C7', label: '2. Contacted' };
      case 'REQUIREMENT_CONFIRMED':
        return { color: '#4F46E5', bg: '#EEF2FF', label: '3. Reqs Confirmed' };
      case 'QUOTE_SENT':
        return { color: '#7C3AED', bg: '#EDE9FE', label: '4. Quote Sent' };
      case 'NEGOTIATION':
        return { color: '#C026D3', bg: '#FAE8FF', label: '5. Negotiation' };
      case 'ADVANCE_RECEIVED':
        return { color: '#0D9488', bg: '#CCFBF1', label: '6. Advance Paid' };
      case 'CONFIRMED':
        return { color: '#16A34A', bg: '#DCFCE7', label: '7. Confirmed' };
      case 'COMPLETED':
        return { color: '#059669', bg: '#D1FAE5', label: '8. Completed' };
      case 'LOST':
        return { color: '#DC2626', bg: '#FEE2E2', label: 'Lost' };
      default:
        return { color: '#64748B', bg: '#F1F5F9', label: status };
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      lead.leadNumber.toLowerCase().includes(query) ||
      lead.customerName.toLowerCase().includes(query) ||
      lead.phone.includes(query) ||
      (lead.companyName && lead.companyName.toLowerCase().includes(query)) ||
      lead.serviceType.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2328' }}>Catering & Bulk Order Leads</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Inbound corporate events, institutional catering, and party enquiries
          </p>
        </div>
        <button
          onClick={loadLeads}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--cw-color-border)',
            borderRadius: 'var(--cw-radius-md)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Leads'}
        </button>
      </div>

      {actionSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DCFCE7', color: '#16A34A', borderRadius: 'var(--cw-radius-md)', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
          ✓ {actionSuccess}
        </div>
      )}

      {error && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--cw-radius-md)', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ {error} • <button onClick={loadLeads} style={{ background: 'transparent', border: 'none', textDecoration: 'underline', color: '#991B1B', cursor: 'pointer', fontWeight: 700 }}>Click here to retry</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 'var(--cw-radius-md)',
          border: '1px solid var(--cw-color-border)',
          marginBottom: '20px'
        }}
      >
        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'FULFILLED', 'CANCELLED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: statusFilter === status ? '#6F432A' : '#F4F6F8',
                color: statusFilter === status ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s ease'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search input */}
        <input
          type="text"
          placeholder="Search by Lead #, Name, Company..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--cw-color-border)',
            borderRadius: 'var(--cw-radius-md)',
            fontSize: '13px',
            minWidth: '260px'
          }}
        />
      </div>

      {/* Leads Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--cw-radius-md)',
          border: '1px solid var(--cw-color-border)',
          boxShadow: 'var(--cw-shadow-sm)',
          overflow: 'hidden'
        }}
      >
        {loading && leads.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>Loading leads from Supabase...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>No catering leads found</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or filter.'
                : 'Enquiries submitted via the frontend /catering or /quote will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--cw-color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Lead # & Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Contact & Client</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Event & Guests</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Special Notes</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Pipeline Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const badge = getStatusBadge(lead.status);
                  const isUpdating = updatingId === lead.id;

                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {/* Lead Number & Time */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 700, color: '#1E2328', fontFamily: 'monospace', fontSize: '13px' }}>
                          {lead.leadNumber}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                          {new Date(lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Contact & Company */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, color: '#1E2328' }}>{lead.customerName}</div>
                        <div style={{ fontSize: '12px', color: '#6F432A', fontWeight: 500, marginTop: '2px' }}>
                          📞 {lead.phone}
                        </div>
                        {lead.email && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>✉️ {lead.email}</div>
                        )}
                        {lead.companyName && (
                          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                            🏢 {lead.companyName}
                          </div>
                        )}
                      </td>

                      {/* Event Type & Headcount */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, color: '#1E2328' }}>{lead.serviceType}</div>
                        <div style={{ fontSize: '12px', color: '#0284C7', fontWeight: 700, marginTop: '2px' }}>
                          👥 {lead.headcount} Guests
                        </div>
                        {lead.eventDate && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            📅 {new Date(lead.eventDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </td>

                      {/* Requirements */}
                      <td style={{ padding: '16px', maxWidth: '250px' }}>
                        <p style={{ fontSize: '12px', color: '#475569', lineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lead.requirements || 'No special requirements noted'}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color
                          }}
                        >
                          {badge.label}
                        </span>
                        {lead.advanceAmountPaid ? (
                          <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, marginTop: '4px' }}>
                            Adv: ₹{Number(lead.advanceAmountPaid).toFixed(2)}
                          </div>
                        ) : null}
                      </td>

                      {/* Action Selector */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <select
                            value={lead.status}
                            disabled={isUpdating}
                            onChange={e => handleStatusChange(lead.id, e.target.value)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--cw-radius-md)',
                              border: '1px solid var(--cw-color-border)',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: '#FFFFFF',
                              color: '#1E2328',
                              cursor: isUpdating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <option value="NEW">1. New Enquiry</option>
                            <option value="CONTACTED">2. Contacted Customer</option>
                            <option value="REQUIREMENT_CONFIRMED">3. Requirements Confirmed</option>
                            <option value="QUOTE_SENT">4. Official Quote Sent</option>
                            <option value="NEGOTIATION">5. Under Negotiation</option>
                            <option value="ADVANCE_RECEIVED">6. Advance Received</option>
                            <option value="CONFIRMED">7. Event Confirmed</option>
                            <option value="COMPLETED">8. Event Completed</option>
                            <option value="LOST">Lost Lead</option>
                          </select>

                          <button
                            onClick={() => {
                              setAdvanceModalLead(lead);
                              setAdvanceForm({ amount: '', paymentMode: 'UPI', transactionRef: '' });
                            }}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FCD34D',
                              borderRadius: 'var(--cw-radius-md)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            💰 Record Advance
                          </button>

                          {/* WhatsApp Chat — only when a valid phone is present */}
                          {(() => {
                            let msgText: string;
                            if (lead.status === 'QUOTE_SENT') {
                              msgText = WhatsAppTemplates.QUOTE_SENT({
                                customerName: lead.customerName,
                                referenceNumber: lead.leadNumber,
                                quoteAmount: 0
                              });
                            } else if (
                              lead.companyName &&
                              (lead.status === 'CONFIRMED' || lead.status === 'ADVANCE_RECEIVED')
                            ) {
                              msgText = WhatsAppTemplates.CORPORATE_FOLLOWUP({
                                contactName: lead.customerName,
                                staffName: 'Chaiwale Team',
                                eventDate: lead.eventDate
                                  ? new Date(lead.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                                  : 'your event date',
                                referenceNumber: lead.leadNumber
                              });
                            } else {
                              msgText = WhatsAppTemplates.CATERING_FOLLOWUP({
                                customerName: lead.customerName,
                                referenceNumber: lead.leadNumber
                              });
                            }
                            const waResult = buildWhatsAppUrl(lead.phone, msgText);
                            return waResult.success && waResult.url ? (
                              <a
                                href={waResult.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chat on WhatsApp"
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: '#25D366',
                                  color: '#FFFFFF',
                                  textDecoration: 'none',
                                  borderRadius: 'var(--cw-radius-md)',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                WA Chat
                              </a>
                            ) : null;
                          })()}
                        </div>

                        {isUpdating && (
                          <div style={{ fontSize: '10px', color: '#D97706', marginTop: '2px' }}>Updating...</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Advance Modal */}
      {advanceModalLead && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--cw-radius-lg)',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                Record Catering Advance
              </h3>
              <button
                onClick={() => setAdvanceModalLead(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Lead <strong>#{advanceModalLead.leadNumber}</strong> ({advanceModalLead.customerName} • {advanceModalLead.serviceType})
            </p>

            <form onSubmit={handleRecordAdvanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Advance Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={advanceForm.amount}
                  onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--cw-radius-md)', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Payment Mode *
                </label>
                <select
                  value={advanceForm.paymentMode}
                  onChange={e => setAdvanceForm({ ...advanceForm, paymentMode: e.target.value as any })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--cw-radius-md)', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="UPI">📱 UPI / Paytm</option>
                  <option value="CASH">💵 CASH</option>
                  <option value="CREDIT">📑 CREDIT</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Transaction / UTR Reference
                </label>
                <input
                  type="text"
                  value={advanceForm.transactionRef}
                  onChange={e => setAdvanceForm({ ...advanceForm, transactionRef: e.target.value })}
                  placeholder="e.g. 423401928312 (From Paytm/Bank)"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--cw-radius-md)', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ padding: '10px', backgroundColor: '#EFF6FF', borderRadius: 'var(--cw-radius-md)', fontSize: '11px', color: '#1E40AF' }}>
                ℹ️ Recording an advance automatically advances status to <strong>ADVANCE_RECEIVED</strong> and credits the central financial ledger.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAdvanceModalLead(null)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: 'var(--cw-radius-md)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingAdvance}
                  style={{
                    padding: '9px 20px',
                    backgroundColor: 'var(--cw-color-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--cw-radius-md)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: recordingAdvance ? 'not-allowed' : 'pointer'
                  }}
                >
                  {recordingAdvance ? 'Recording...' : 'Confirm Advance →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
