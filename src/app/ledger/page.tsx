'use client';

import React, { useState, useEffect } from 'react';
import { fetchLedger, getSalesExcelUrl, LedgerRecordDto } from '../../services/admin-api.client';

export default function AdminLedgerPage() {
  const [entries, setEntries] = useState<LedgerRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLedger(undefined, 50);
      setEntries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const filteredEntries = entries.filter(e => {
    if (typeFilter !== 'ALL' && e.entry_type !== typeFilter) return false;
    const rawQuery = searchQuery.toLowerCase().trim();
    const keywords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];
    if (keywords.length === 0) return true;

    const searchable = [
      e.reference_note || '',
      e.corporate_clients?.company_name || '',
      e.invoices?.invoice_number || '',
      e.entry_type || '',
      e.amount?.toString() || ''
    ].join(' ').toLowerCase();

    return keywords.every(kw => searchable.includes(kw));
  });

  const totalDebits = entries.filter(e => e.entry_type === 'DEBIT').reduce((a, c) => a + Number(c.amount), 0);
  const totalCredits = entries.filter(e => e.entry_type === 'CREDIT').reduce((a, c) => a + Number(c.amount), 0);
  const netOutstanding = totalDebits - totalCredits;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Customer & Corporate Credit Ledgers</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Authoritative double-entry audit trail backed by Supabase PostgreSQL (Admin Management Hub)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a
            href={getSalesExcelUrl()}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '8px 16px',
              backgroundColor: '#166534',
              color: '#FFFFFF',
              textDecoration: 'none',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📊 Export Excel (.xlsx)
          </a>
          <button
            onClick={loadLedger}
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
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--cw-radius-md)', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ {error} • <button onClick={loadLedger} style={{ background: 'transparent', border: 'none', textDecoration: 'underline', color: '#991B1B', cursor: 'pointer', fontWeight: 700 }}>Click to retry</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Debits (Billed)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>₹{totalDebits.toFixed(2)}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Credits (Settled)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>₹{totalCredits.toFixed(2)}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Net Outstanding</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: netOutstanding > 0 ? '#C2410C' : '#0F172A', marginTop: '4px' }}>
            ₹{netOutstanding.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'DEBIT', 'CREDIT'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: typeFilter === t ? 'var(--cw-color-primary)' : '#FFFFFF',
                color: typeFilter === t ? '#FFFFFF' : '#64748B'
              }}
            >
              {t === 'ALL' ? 'All Ledger Entries' : t === 'DEBIT' ? 'Debits (+ Due)' : 'Credits (Settled)'}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search ledger by description, account, reference, or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--cw-color-border)',
            borderRadius: 'var(--cw-radius-md)',
            fontSize: '13px',
            minWidth: '280px'
          }}
        />
      </div>

      {/* Ledger Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--cw-radius-md)',
          border: '1px solid var(--cw-color-border)',
          boxShadow: 'var(--cw-shadow-sm)',
          overflow: 'hidden'
        }}
      >
        {loading && entries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>Loading ledger entries from Supabase...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>No ledger transactions recorded</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Corporate credit billing and customer ledger postings will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--cw-color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Date & Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Party / Account</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Balance After</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Reference / Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                      {new Date(e.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>
                      {e.corporate_clients?.company_name || 'General Customer'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: e.entry_type === 'DEBIT' ? '#FEE2E2' : '#DCFCE7',
                          color: e.entry_type === 'DEBIT' ? '#991B1B' : '#166534'
                        }}
                      >
                        {e.entry_type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: e.entry_type === 'DEBIT' ? '#DC2626' : '#16A34A' }}>
                      {e.entry_type === 'DEBIT' ? '+' : '-'}₹{Number(e.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A' }}>
                      ₹{Number(e.balance_after).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: '12px' }}>
                      {e.reference_note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
