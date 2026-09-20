'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchDashboardStats, fetchRecentOrders, getSalesExcelUrl, DashboardStatsDto, AdminOrderDto } from '../services/admin-api.client';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');

  const getDateRange = (filter: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const todayStr = formatDate(today);

    if (filter === 'today') {
      return { from: todayStr, to: todayStr };
    } else if (filter === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      return { from: yStr, to: yStr };
    } else if (filter === 'week') {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      return { from: formatDate(w), to: todayStr };
    } else {
      const m = new Date(today);
      m.setDate(1);
      return { from: formatDate(m), to: todayStr };
    }
  };

  const loadDashboardData = async (filter = activeFilter) => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getDateRange(filter);
      const [statsData, ordersData] = await Promise.all([
        fetchDashboardStats(from, to),
        fetchRecentOrders(8)
      ]);
      setStats(statsData);
      setRecentOrders(ordersData);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData('today');
  }, []);

  const handleFilterChange = (filter: 'today' | 'yesterday' | 'week' | 'month') => {
    setActiveFilter(filter);
    loadDashboardData(filter);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { color: '#0284C7', bg: '#E0F2FE' };
      case 'PREPARING':
        return { color: '#D97706', bg: '#FEF3C7' };
      case 'OUT_FOR_DELIVERY':
      case 'READY':
        return { color: '#7C3AED', bg: '#EDE9FE' };
      case 'COMPLETED':
      case 'DELIVERED':
        return { color: '#16A34A', bg: '#DCFCE7' };
      case 'CANCELLED':
        return { color: '#DC2626', bg: '#FEE2E2' };
      default:
        return { color: '#D97706', bg: '#FEF3C7' };
    }
  };

  const statCards = [
    {
      title: "Total Period Sales",
      value: stats ? `₹${stats.todaySales.toLocaleString()}` : '₹0',
      change: 'Gross Billed',
      color: '#0F172A'
    },
    {
      title: "Realized Payments",
      value: stats ? `₹${(stats.paidAmount || 0).toLocaleString()}` : '₹0',
      change: 'Settled',
      color: '#16A34A'
    },
    {
      title: "Udhaar / Outstanding",
      value: stats ? `₹${(stats.outstandingAmount || 0).toLocaleString()}` : '₹0',
      change: 'Credit Due',
      color: '#DC2626'
    },
    {
      title: "Catering Enquiries",
      value: stats ? stats.cateringLeads.toString() : '0',
      change: '8 Stages',
      color: '#D97706'
    }
  ];

  return (
    <div>
      {/* Top Header with Date Filter Pills & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2328' }}>Operations Dashboard</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Live Real-time Financial Metrics & Pipeline Status
          </p>
        </div>

        {/* Date Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: 'var(--cw-radius-pill)' }}>
          {(['today', 'yesterday', 'week', 'month'] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--cw-radius-pill)',
                border: 'none',
                backgroundColor: activeFilter === f ? '#FFFFFF' : 'transparent',
                color: activeFilter === f ? '#0F172A' : '#64748B',
                fontWeight: activeFilter === f ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: activeFilter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                textTransform: 'capitalize'
              }}
            >
              {f === 'today' ? 'Today' : f === 'yesterday' ? 'Yesterday' : f === 'week' ? 'Last 7 Days' : 'This Month'}
            </button>
          ))}
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
            📊 Excel Report
          </a>
          <button
            onClick={() => loadDashboardData()}
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
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--cw-radius-md)', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ {error} • <button onClick={() => loadDashboardData()} style={{ background: 'transparent', border: 'none', textDecoration: 'underline', color: '#991B1B', cursor: 'pointer', fontWeight: 700 }}>Click here to retry</button>
        </div>
      )}

      {/* 4 Primary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        {statCards.map((s, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--cw-radius-md)',
              border: '1px solid var(--cw-color-border)',
              padding: '18px 20px',
              boxShadow: 'var(--cw-shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--cw-color-text-muted)', fontWeight: 600 }}>
                {s.title}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: s.color, backgroundColor: `${s.color}15`, padding: '2px 6px', borderRadius: '4px' }}>
                {s.change}
              </span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: s.color, fontFamily: 'var(--cw-font-heading)' }}>
              {loading ? '...' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Payment Modes Channel Breakdown Strip */}
      {stats && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
            Payment Channels ({activeFilter}):
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>💵</span>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>CASH / COD</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#16A34A' }}>₹{(stats.breakdown?.codAmount || 0).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📱</span>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>UPI SCAN</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0284C7' }}>₹{(stats.breakdown?.upiAmount || 0).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📑</span>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>CREDIT / UDHAAR</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#DC2626' }}>₹{(stats.breakdown?.creditAmount || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Sales Overview Chart (Left) & Recent Orders (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px'
        }}
      >
        {/* Sales Overview Bar Chart Section (Panel 5) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--cw-radius-md)',
            border: '1px solid var(--cw-color-border)',
            padding: '20px',
            boxShadow: 'var(--cw-shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E2328' }}>Weekly Channel Overview</h3>
            {/* Channel Legend */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#38BDF8', borderRadius: '2px' }} /> Dine-in</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#34D399', borderRadius: '2px' }} /> Delivery</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#F472B6', borderRadius: '2px' }} /> Corporate</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#FBBF24', borderRadius: '2px' }} /> Catering</span>
            </div>
          </div>

          <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', padding: '10px 0', borderBottom: '1px solid #E2E8F0' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
              const heights = [60, 75, 50, 90, 80, 110, 130];
              const h = heights[idx];
              return (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '140px' }}>
                    <div style={{ width: '6px', height: `${h * 0.4}px`, backgroundColor: '#38BDF8', borderRadius: '2px 2px 0 0' }} />
                    <div style={{ width: '6px', height: `${h * 0.7}px`, backgroundColor: '#34D399', borderRadius: '2px 2px 0 0' }} />
                    <div style={{ width: '6px', height: `${h * 0.5}px`, backgroundColor: '#F472B6', borderRadius: '2px 2px 0 0' }} />
                    <div style={{ width: '6px', height: `${h * 0.3}px`, backgroundColor: '#FBBF24', borderRadius: '2px 2px 0 0' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders Table (Panel 5) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--cw-radius-md)',
            border: '1px solid var(--cw-color-border)',
            padding: '20px',
            boxShadow: 'var(--cw-shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E2328' }}>Recent Orders</h3>
            <Link href="/orders" style={{ fontSize: '12px', color: 'var(--cw-color-primary)', fontWeight: 700, textDecoration: 'none' }}>
              View All Orders →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              {loading ? 'Fetching orders from database...' : 'No orders recorded yet.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cw-color-border)', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '8px 8px', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '8px 8px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const badge = getStatusBadge(o.status);
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 4px', fontWeight: 700 }}>#{o.order_number}</td>
                      <td style={{ padding: '10px 8px', color: '#1E2328' }}>{o.customer_name || 'Customer'}</td>
                      <td style={{ padding: '10px 8px', color: '#64748B' }}>{o.order_type}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 700, textAlign: 'right' }}>₹{o.grand_total}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 'var(--cw-radius-pill)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: badge.color,
                            backgroundColor: badge.bg
                          }}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
