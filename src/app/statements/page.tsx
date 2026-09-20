'use client';

import React, { useState, useEffect } from 'react';
import { fetchInvoices, getSalesExcelUrl, InvoiceRecordDto } from '../../services/admin-api.client';

export default function AdminStatementsPage() {
  const [invoices, setInvoices] = useState<InvoiceRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoices({ limit: 100 });
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load statement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const totalSales = invoices.reduce((a, c) => a + Number(c.grand_total || 0), 0);
  const totalPaid = invoices.reduce((a, c) => a + Number(c.paid_amount || 0), 0);
  const totalOutstanding = invoices.reduce((a, c) => a + Number(c.outstanding_amount || 0), 0);
  const totalInvoicesCount = invoices.length;

  const exportStatementsCSV = () => {
    const header = ['Invoice Number', 'Type', 'Subtotal', 'Grand Total', 'Paid Amount', 'Outstanding', 'Status', 'Date Issued'].join(',');
    const rows = invoices.map(i =>
      [
        `"${i.invoice_number}"`,
        `"${i.invoice_type}"`,
        i.subtotal,
        i.grand_total,
        i.paid_amount || 0,
        i.outstanding_amount || 0,
        `"${i.status}"`,
        `"${i.issued_at}"`
      ].join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Chaiwale_Statements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Statements & Financial Register</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Daily revenue, payment settlements, and accounting register (Zero-Tax Architecture)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={getSalesExcelUrl()}
            download
            style={{
              padding: '8px 16px',
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📊 Download Excel Register
          </a>
          <button
            onClick={exportStatementsCSV}
            disabled={invoices.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--cw-color-border)',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: invoices.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            📥 Export CSV
          </button>
          <button
            onClick={loadInvoices}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--cw-color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--cw-radius-md)', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Aggregate Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Invoices</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{totalInvoicesCount}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Gross Billed Sales</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>₹{totalSales.toFixed(2)}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Collections (Paid)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0369A1', marginTop: '4px' }}>₹{totalPaid.toFixed(2)}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Outstanding Credit</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: totalOutstanding > 0 ? '#DC2626' : '#64748B', marginTop: '4px' }}>
            ₹{totalOutstanding.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Zero-Tax & Operations Accounting Guide</h3>
        <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6 }}>
          Chaiwale operations run on pure itemized pricing with zero tax calculation (Subtotal equals Grand Total). All orders punched at the counter POS or placed online are recorded in real-time in Supabase PostgreSQL with verified audit trails, instant payment recording, and double-entry corporate customer ledgers.
        </p>
      </div>
    </div>
  );
}
