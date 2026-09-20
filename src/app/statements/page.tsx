'use client';

import React, { useState, useEffect } from 'react';
import { fetchInvoices, getSalesExcelUrl, InvoiceRecordDto } from '../../services/admin-api.client';

export default function AdminStatementsPage() {
  const [invoices, setInvoices] = useState<InvoiceRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredInvoices = invoices.filter((inv) => {
    const rawQuery = searchQuery.toLowerCase().trim();
    const keywords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];
    if (keywords.length === 0) return true;

    const searchable = [
      inv.invoice_number,
      inv.invoice_type || '',
      inv.status || '',
      inv.issued_at || '',
      inv.grand_total?.toString() || '',
      inv.paid_amount?.toString() || '',
      inv.outstanding_amount?.toString() || ''
    ].join(' ').toLowerCase();

    return keywords.every((kw) => searchable.includes(kw));
  });

  const totalSales = invoices.reduce((a, c) => a + Number(c.grand_total || 0), 0);
  const totalPaid = invoices.reduce((a, c) => a + Number(c.paid_amount || 0), 0);
  const totalOutstanding = invoices.reduce((a, c) => a + Number(c.outstanding_amount || 0), 0);
  const totalInvoicesCount = invoices.length;

  const exportStatementsCSV = () => {
    const header = ['Invoice Number', 'Type', 'Subtotal', 'Grand Total', 'Paid Amount', 'Outstanding', 'Status', 'Date Issued'].join(',');
    const rows = filteredInvoices.map(i =>
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
              backgroundColor: '#166534',
              color: '#FFFFFF',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📊 Excel (.xlsx)
          </a>
          <button
            onClick={exportStatementsCSV}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--cw-color-border)',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
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

      {/* Search Toolbar */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '14px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <input
          type="text"
          placeholder="Search statements by invoice #, type, status, date, or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--cw-color-border)',
            borderRadius: 'var(--cw-radius-md)',
            fontSize: '13px',
            flex: '1 1 300px',
            maxWidth: '500px'
          }}
        />
        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
          Showing {filteredInvoices.length} of {invoices.length} statements
        </div>
      </div>

      {/* Statements Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--cw-color-border)', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 16px' }}>Invoice Number</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Issued Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Grand Total</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Paid</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Outstanding</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    Loading statements register...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    {searchQuery ? 'No statements match your search query.' : 'No statements found.'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                      {inv.invoice_number}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600 }}>
                        {inv.invoice_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>
                      {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                      ₹{Number(inv.grand_total || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                      ₹{Number(inv.paid_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: Number(inv.outstanding_amount || 0) > 0 ? '#DC2626' : '#64748B' }}>
                      ₹{Number(inv.outstanding_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        fontWeight: 700,
                        backgroundColor: inv.status === 'PAID' ? '#DCFCE7' : Number(inv.outstanding_amount || 0) > 0 ? '#FEE2E2' : '#FEF3C7',
                        color: inv.status === 'PAID' ? '#166534' : Number(inv.outstanding_amount || 0) > 0 ? '#991B1B' : '#92400E'
                      }}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Zero-Tax & Operations Accounting Guide</h3>
        <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
          Chaiwale operations run on pure itemized pricing with zero tax calculation (Subtotal equals Grand Total). All orders punched at the counter POS or placed online are recorded in real-time in Supabase PostgreSQL with verified audit trails, instant payment recording, and double-entry corporate customer ledgers.
        </p>
      </div>
    </div>
  );
}
