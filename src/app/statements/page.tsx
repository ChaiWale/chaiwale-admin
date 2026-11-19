'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchInvoices, getSalesExcelUrl, InvoiceRecordDto } from '../../services/admin-api.client';

export default function AdminStatementsPage() {
  const [invoices, setInvoices] = useState<InvoiceRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoices({ limit: 200 });
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

  // Date Filter Evaluator
  const isWithinDateFilter = (dateStr: string, filter: 'all' | 'today' | 'yesterday' | 'week' | 'month') => {
    if (filter === 'all') return true;
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yesterdayKey = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;

      if (filter === 'today') return dateKey === todayKey;
      if (filter === 'yesterday') return dateKey === yesterdayKey;
      if (filter === 'week') {
        const diffMs = now.getTime() - d.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (filter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
    } catch {}
    return true;
  };

  // Date Counts
  const dateCounts = useMemo(() => {
    return {
      all: invoices.length,
      today: invoices.filter(i => isWithinDateFilter(i.issued_at || (i as any).created_at, 'today')).length,
      yesterday: invoices.filter(i => isWithinDateFilter(i.issued_at || (i as any).created_at, 'yesterday')).length,
      week: invoices.filter(i => isWithinDateFilter(i.issued_at || (i as any).created_at, 'week')).length,
      month: invoices.filter(i => isWithinDateFilter(i.issued_at || (i as any).created_at, 'month')).length
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Date filter
      const dateVal = inv.issued_at || (inv as any).created_at || '';
      if (!isWithinDateFilter(dateVal, dateFilter)) return false;

      // 2. Search query filter
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
  }, [invoices, dateFilter, searchQuery]);

  const totalSales = filteredInvoices.reduce((a, c) => a + Number(c.grand_total || 0), 0);
  const totalPaid = filteredInvoices.reduce((a, c) => a + Number(c.paid_amount || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((a, c) => a + Number(c.outstanding_amount || 0), 0);
  const totalInvoicesCount = filteredInvoices.length;

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
    link.setAttribute('download', `Chaiwale_Statements_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Statements & Financial Register
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '3px' }}>
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
              fontWeight: 700,
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

      {/* Date Filter Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '12px 18px',
          borderRadius: 'var(--cw-radius-md)',
          border: '1px solid var(--cw-color-border)',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px' }}>
          Statement Period:
        </span>
        {[
          { id: 'all', label: 'All Time', count: dateCounts.all },
          { id: 'today', label: 'Today', count: dateCounts.today },
          { id: 'yesterday', label: 'Yesterday', count: dateCounts.yesterday },
          { id: 'week', label: 'Last 7 Days', count: dateCounts.week },
          { id: 'month', label: 'This Month', count: dateCounts.month }
        ].map(tab => {
          const isSelected = dateFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                border: isSelected ? '1px solid #1E2328' : '1px solid #E2E8F0',
                backgroundColor: isSelected ? '#1E2328' : '#F8FAFC',
                color: isSelected ? '#FFFFFF' : '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  padding: '0 6px',
                  borderRadius: '10px',
                  fontSize: '10.5px',
                  fontWeight: 800
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Aggregate Financial Cards (Dynamically reflects dateFilter) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Filtered Invoices</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{totalInvoicesCount}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Period Gross Sales</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>₹{totalSales.toFixed(2)}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Collections (Paid)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0369A1', marginTop: '4px' }}>₹{totalPaid.toFixed(2)}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Outstanding Credit</div>
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
            padding: '9px 14px',
            border: '1px solid var(--cw-color-border)',
            borderRadius: 'var(--cw-radius-md)',
            fontSize: '13px',
            flex: '1 1 300px',
            maxWidth: '500px'
          }}
        />
        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
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
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                    No statement records match your active date filter or search query.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, fontFamily: 'monospace', color: '#1D4ED8' }}>
                      {inv.invoice_number}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                        {inv.invoice_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>
                      {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800 }}>
                      ₹{Number(inv.grand_total).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#16A34A', fontWeight: 700 }}>
                      ₹{Number(inv.paid_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: Number(inv.outstanding_amount || 0) > 0 ? '#DC2626' : '#64748B', fontWeight: 700 }}>
                      ₹{Number(inv.outstanding_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: inv.status === 'PAID' ? '#DCFCE7' : inv.status === 'PARTIALLY_PAID' ? '#FEF3C7' : '#FEE2E2',
                          color: inv.status === 'PAID' ? '#16A34A' : inv.status === 'PARTIALLY_PAID' ? '#D97706' : '#DC2626'
                        }}
                      >
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
    </div>
  );
}
