'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchInvoices,
  fetchInvoiceById,
  recordInvoicePayment,
  getInvoicePdfUrl,
  fetchPrintPayload,
  InvoiceRecordDto,
  InvoiceDetailDto
} from '../../services/admin-api.client';
import { buildWhatsAppUrl, WhatsAppTemplates } from '../../utils/whatsapp';
import ChaiLoader from '../../components/ChaiLoader';

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // View Bill Modal State
  const [viewInvoice, setViewInvoice] = useState<InvoiceDetailDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ESC/POS Thermal Print Preview State
  const [escPosReceipt, setEscPosReceipt] = useState<{
    invoiceNumber: string;
    plainTextPreview: string;
    base64String: string;
  } | null>(null);
  const [loadingPrint, setLoadingPrint] = useState(false);

  // Payment Recording Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecordDto | InvoiceDetailDto | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoices({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: 100
      });
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices from central backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const filteredInvoices = invoices.filter((inv) => {
    const rawQuery = searchQuery.toLowerCase().trim();
    const keywords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];
    if (keywords.length === 0) return true;

    const searchable = [
      inv.invoice_number,
      inv.corporate_clients?.company_name || '',
      inv.department || '',
      inv.orders?.customer_name || '',
      inv.invoice_type || '',
      inv.status || '',
      inv.grand_total?.toString() || ''
    ].join(' ').toLowerCase();

    return keywords.every((kw) => searchable.includes(kw));
  });

  const handleOpenViewBill = async (invoiceId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchInvoiceById(invoiceId);
      setViewInvoice(detail);
    } catch (err: any) {
      alert(`Could not load complete bill details: ${err.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrintEscPos = async (invoiceId: string, invoiceNumber: string) => {
    setLoadingPrint(true);
    try {
      const payload = await fetchPrintPayload({
        receiptType: 'CUSTOMER_BILL',
        invoiceId
      });
      setEscPosReceipt({
        invoiceNumber,
        plainTextPreview: payload.plainTextPreview,
        base64String: payload.base64String
      });
    } catch (err: any) {
      alert(`Thermal Print Generation Failed: ${err.message}`);
    } finally {
      setLoadingPrint(false);
    }
  };

  const openPaymentModal = (invoice: InvoiceRecordDto | InvoiceDetailDto) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(String(invoice.outstanding_amount || 0));
    setPaymentMode('CASH');
    setTransactionRef('');
    setPaymentNotes('');
    setPaymentSuccessMsg(null);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    const amountNum = parseFloat(paymentAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (amountNum > Number(selectedInvoice.outstanding_amount)) {
      alert(`Payment cannot exceed outstanding amount of ₹${selectedInvoice.outstanding_amount}`);
      return;
    }

    setSavingPayment(true);
    try {
      const res = await recordInvoicePayment({
        invoiceId: selectedInvoice.id,
        amount: amountNum,
        paymentMode,
        transactionRef: transactionRef || undefined,
        notes: paymentNotes || undefined
      });

      setPaymentSuccessMsg(`Payment of ₹${amountNum} recorded! Status is now ${res.status}.`);
      await loadInvoices();
      if (viewInvoice && viewInvoice.id === selectedInvoice.id) {
        const refreshed = await fetchInvoiceById(selectedInvoice.id);
        setViewInvoice(refreshed);
      }
      setTimeout(() => {
        setSelectedInvoice(null);
      }, 1500);
    } catch (err: any) {
      alert(`Payment Error: ${err.message}`);
    } finally {
      setSavingPayment(false);
    }
  };

  const shareOnWhatsApp = (inv: InvoiceRecordDto | InvoiceDetailDto) => {
    const custPhone = (inv as InvoiceDetailDto).orders?.customers?.phone || '';
    const custName =
      (inv as InvoiceDetailDto).corporate_clients?.company_name ||
      (inv as InvoiceDetailDto).orders?.customers?.name ||
      (inv as InvoiceDetailDto).orders?.customer_name ||
      'Customer';

    const hasOutstanding = Number(inv.outstanding_amount || 0) > 0;

    let msgText: string;
    if (hasOutstanding) {
      msgText = WhatsAppTemplates.PAYMENT_REMINDER({
        customerName: custName,
        invoiceNumber: inv.invoice_number,
        outstandingAmount: inv.outstanding_amount || 0
      });
    } else {
      msgText = WhatsAppTemplates.PAYMENT_RECEIVED({
        customerName: custName,
        amount: inv.paid_amount || 0,
        invoiceNumber: inv.invoice_number,
        outstandingAmount: 0
      });
    }

    const waResult = buildWhatsAppUrl(custPhone, msgText);
    if (waResult.success && waResult.url) {
      window.open(waResult.url, '_blank');
    } else {
      alert('WhatsApp number not available for this customer.');
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Invoices & Billing History</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Invoice Registry, Outstanding Balance Tracking, and Payment Reconciliation
          </p>
        </div>
        <button
          onClick={loadInvoices}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--cw-color-border)',
            borderRadius: 'var(--cw-radius-md)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Invoices'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--cw-radius-md)', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ {error} • <button onClick={loadInvoices} style={{ background: 'transparent', border: 'none', textDecoration: 'underline', color: '#991B1B', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Invoices' },
            { id: 'UNPAID', label: 'Unpaid / Credit' },
            { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
            { id: 'PAID', label: 'Fully Paid' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: statusFilter === tab.id ? 'var(--cw-color-primary)' : '#F1F5F9',
                color: statusFilter === tab.id ? '#FFFFFF' : '#64748B'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search invoices by number, client, company, department, status, or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--cw-color-border)',
            borderRadius: 'var(--cw-radius-md)',
            fontSize: '13px',
            minWidth: '260px'
          }}
        />
      </div>

      {/* Invoices Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--cw-radius-md)',
          border: '1px solid var(--cw-color-border)',
          boxShadow: 'var(--cw-shadow-sm)',
          overflow: 'hidden'
        }}
      >
        {loading && invoices.length === 0 ? (
          <div style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
            <ChaiLoader label="Loading Invoices..." sublabel="Fetching official GST & counter invoices..." />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>No invoices match this filter</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--cw-color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Invoice #</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Party / Department</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Total (₹)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Paid (₹)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Outstanding (₹)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const hasOutstanding = Number(inv.outstanding_amount || 0) > 0;
                  const isPaid = inv.status === 'PAID';
                  const isPartial = inv.status === 'PARTIALLY_PAID';

                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#0F172A' }}>
                        {inv.invoice_number}
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>{inv.invoice_type}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>
                          {inv.corporate_clients?.company_name || inv.orders?.customer_name || 'Walk-in Customer'}
                        </div>
                        {inv.department && (
                          <div style={{ fontSize: '11px', color: '#6F432A', fontWeight: 600 }}>Dept: {inv.department}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A' }}>
                        ₹{Number(inv.grand_total).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#10B981', fontWeight: 600 }}>
                        ₹{Number(inv.paid_amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', color: hasOutstanding ? '#EF4444' : '#64748B', fontWeight: hasOutstanding ? 700 : 500 }}>
                        ₹{Number(inv.outstanding_amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isPaid ? '#DCFCE7' : isPartial ? '#FEF3C7' : '#FEE2E2',
                            color: isPaid ? '#166534' : isPartial ? '#92400E' : '#991B1B'
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                        {new Date(inv.issued_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleOpenViewBill(inv.id)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#E0E7FF',
                              color: '#3730A3',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            👁️ View
                          </button>
                          {hasOutstanding && (
                            <button
                              onClick={() => openPaymentModal(inv)}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#10B981',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              + Pay
                            </button>
                          )}
                          <a
                            href={getInvoicePdfUrl(inv.invoice_number)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              textDecoration: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                          >
                            PDF
                          </a>
                          <button
                            onClick={() => handlePrintEscPos(inv.id, inv.invoice_number)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            🖨️ Print
                          </button>
                          <button
                            onClick={() => shareOnWhatsApp(inv)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#25D366',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            WA
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. DETAILED VIEW BILL MODAL */}
      {viewInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--cw-radius-lg)',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Bill Header */}
            <div
              style={{
                backgroundColor: '#1E2328',
                color: '#FFFFFF',
                padding: '20px 24px',
                borderTopLeftRadius: 'var(--cw-radius-lg)',
                borderTopRightRadius: 'var(--cw-radius-lg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <img
                    src="/assets/chaiwale-logo.jpeg"
                    alt="Chaiwale"
                    style={{ height: '36px', width: 'auto', borderRadius: '4px' }}
                  />
                  <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '0.04em' }}>CHAIWALE</span>
                </div>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                  Shop No. 1, Ground Floor, Best Sky Tower, Netaji Subhash Place (NSP), Pitampura, New Delhi 110034<br />
                  Phone: +91 93101 12564
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: viewInvoice.status === 'PAID' ? '#DCFCE7' : viewInvoice.status === 'PARTIALLY_PAID' ? '#FEF3C7' : '#FEE2E2',
                    color: viewInvoice.status === 'PAID' ? '#166534' : viewInvoice.status === 'PARTIALLY_PAID' ? '#92400E' : '#991B1B'
                  }}
                >
                  {viewInvoice.status}
                </span>
                <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '6px', fontFamily: 'monospace' }}>
                  {viewInvoice.invoice_number}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                  {new Date(viewInvoice.issued_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              </div>
            </div>

            {/* Bill Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Customer / Party Details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  backgroundColor: '#F8FAFC',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  border: '1px solid #E2E8F0'
                }}
              >
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Billed To:</span>
                  <strong style={{ color: '#0F172A', fontSize: '13px' }}>
                    {viewInvoice.corporate_clients?.company_name || viewInvoice.orders?.customers?.name || viewInvoice.orders?.customer_name || 'Walk-in Customer'}
                  </strong>
                  {viewInvoice.orders?.customers?.phone && (
                    <div style={{ color: '#475569' }}>Phone: {viewInvoice.orders.customers.phone}</div>
                  )}
                  {viewInvoice.corporate_clients?.gstin && (
                    <div style={{ color: '#475569' }}>Client GSTIN: {viewInvoice.corporate_clients.gstin}</div>
                  )}
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Invoice Category:</span>
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>{viewInvoice.invoice_type}</span>
                  {viewInvoice.department && (
                    <div style={{ color: '#6F432A', fontWeight: 700, marginTop: '2px' }}>
                      Department: {viewInvoice.department}
                    </div>
                  )}
                  {viewInvoice.orders?.delivery_address && (
                    <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>
                      Delivery: {viewInvoice.orders.delivery_address}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Itemized Order Summary
                </h4>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                        <th style={{ padding: '8px 12px', color: '#475569' }}>Item</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>Rate (₹)</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>Qty</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewInvoice.orders?.order_items && viewInvoice.orders.order_items.length > 0 ? (
                        viewInvoice.orders.order_items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0F172A' }}>{it.item_name}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>{Number(it.unit_price).toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{it.quantity}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                              ₹{Number(it.line_total).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '14px', textAlign: 'center', color: '#64748B' }}>
                            POS Direct Counter Bill
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Breakdown (Zero Tax Mode) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '280px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Subtotal:</span>
                    <span>₹{Number(viewInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(viewInvoice.tax_amount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 600 }}>
                      <span>Tax:</span>
                      <span>₹{Number(viewInvoice.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(viewInvoice.discount_amount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                      <span>Discount:</span>
                      <span>- ₹{Number(viewInvoice.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '2px solid #0F172A',
                      paddingTop: '6px',
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#0F172A'
                    }}
                  >
                    <span>Grand Total:</span>
                    <span>₹{Number(viewInvoice.grand_total).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981', fontWeight: 600 }}>
                    <span>Total Paid:</span>
                    <span>₹{Number(viewInvoice.paid_amount || 0).toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: Number(viewInvoice.outstanding_amount || 0) > 0 ? '#EF4444' : '#64748B',
                      fontWeight: 700
                    }}
                  >
                    <span>Outstanding Balance:</span>
                    <span>₹{Number(viewInvoice.outstanding_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment History Entries */}
              {viewInvoice.payments && viewInvoice.payments.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Payment History
                  </h4>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC' }}>
                          <th style={{ padding: '6px 10px', color: '#475569' }}>Date</th>
                          <th style={{ padding: '6px 10px', color: '#475569' }}>Mode</th>
                          <th style={{ padding: '6px 10px', color: '#475569' }}>Reference</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right', color: '#475569' }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewInvoice.payments.map((p) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '6px 10px', color: '#64748B' }}>{new Date(p.paid_at).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>{p.payment_mode}</td>
                            <td style={{ padding: '6px 10px', color: '#64748B' }}>{p.transaction_ref || 'Counter'}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                              ₹{Number(p.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bill Actions Footer */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                padding: '16px 24px',
                borderBottomLeftRadius: 'var(--cw-radius-lg)',
                borderBottomRightRadius: 'var(--cw-radius-lg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={getInvoicePdfUrl(viewInvoice.invoice_number)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📥 Download PDF
                </a>
                <button
                  onClick={() => handlePrintEscPos(viewInvoice.id, viewInvoice.invoice_number)}
                  disabled={loadingPrint}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #F59E0B',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🖨️ Thermal Print (ESC/POS)
                </button>
                <button
                  onClick={() => shareOnWhatsApp(viewInvoice)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  💬 WhatsApp Share
                </button>
                {Number(viewInvoice.outstanding_amount || 0) > 0 && (
                  <button
                    onClick={() => openPaymentModal(viewInvoice)}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Record Payment
                  </button>
                )}
              </div>
              <button
                onClick={() => setViewInvoice(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ESC/POS THERMAL RECEIPT PREVIEW MODAL */}
      {escPosReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--cw-radius-lg)',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  🖨️ ESC/POS Thermal Receipt
                </h3>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Architecture-compatible raw thermal receipt stream (#{escPosReceipt.invoiceNumber})
                </span>
              </div>
              <button
                onClick={() => setEscPosReceipt(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                maxHeight: '340px',
                overflowY: 'auto',
                marginBottom: '16px',
                color: '#1E293B'
              }}
            >
              {escPosReceipt.plainTextPreview}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(escPosReceipt.base64String);
                  alert('Copied ESC/POS Base64 binary byte stream to clipboard!');
                }}
                style={{
                  padding: '8px 14px',
                  backgroundColor: 'var(--cw-color-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📋 Copy ESC/POS Binary Stream
              </button>
              <button
                onClick={() => setEscPosReceipt(null)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#F1F5F9',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PAYMENT ENTRY MODAL */}
      {selectedInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--cw-radius-lg)',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Record Payment</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              <div><strong>Invoice:</strong> {selectedInvoice.invoice_number}</div>
              <div><strong>Party:</strong> {selectedInvoice.corporate_clients?.company_name || selectedInvoice.orders?.customer_name || 'Direct'}</div>
              <div><strong>Grand Total:</strong> ₹{Number(selectedInvoice.grand_total).toFixed(2)}</div>
              <div style={{ color: '#EF4444', fontWeight: 700, marginTop: '4px' }}>
                Outstanding: ₹{Number(selectedInvoice.outstanding_amount).toFixed(2)}
              </div>
            </div>

            {paymentSuccessMsg ? (
              <div style={{ padding: '14px', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textAlign: 'center' }}>
                ✓ {paymentSuccessMsg}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Payment Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    max={selectedInvoice.outstanding_amount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: 700
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    Remaining after pay: ₹{Math.max(0, Number(selectedInvoice.outstanding_amount) - (parseFloat(paymentAmount) || 0)).toFixed(2)}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px'
                    }}
                  >
                    <option value="CASH">CASH (Physical Currency)</option>
                    <option value="UPI">UPI (Paytm / GPay / PhonePe)</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    UTR / Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 324156789012"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Part payment received via counter UPI"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#F1F5F9',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordPayment}
                    disabled={savingPayment}
                    style={{
                      flex: 2,
                      padding: '10px',
                      backgroundColor: 'var(--cw-color-primary)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      cursor: savingPayment ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {savingPayment ? 'Recording...' : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
