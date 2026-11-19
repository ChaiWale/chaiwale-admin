'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  fetchRecentOrders,
  updateOrderStatus,
  verifyOrderPayment,
  deleteOrder,
  getInvoicePdfUrl,
  AdminOrderDto
} from '../../services/admin-api.client';
import { buildWhatsAppUrl, WhatsAppTemplates } from '../../utils/whatsapp';
import { ThermalReceiptModal, ThermalReceiptData } from '../../components/ThermalReceiptModal';
import ChaiLoader from '../../components/ChaiLoader';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters: Status + Date + Search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // In-App Pop-up Modal States (No browser alert / confirm)
  const [rejectModalOrder, setRejectModalOrder] = useState<AdminOrderDto | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Kitchen busy / Peak rush');

  const [deleteModalOrder, setDeleteModalOrder] = useState<AdminOrderDto | null>(null);

  const [verifyUpiOrder, setVerifyUpiOrder] = useState<AdminOrderDto | null>(null);
  const [verifyUpiUtr, setVerifyUpiUtr] = useState<string>('');

  // Thermal Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<ThermalReceiptData | null>(null);

  const previousPendingCount = useRef<number>(0);

  const loadOrders = async (silent = false) => {
    if (!silent) {
      if (orders.length === 0) setLoading(true);
      else setIsRefreshing(true);
    }
    setError(null);
    try {
      const data = await fetchRecentOrders(75);
      setOrders(data);
      setLastRefreshed(new Date());

      // Audio notification if new pending order arrived
      const currentPending = data.filter(o => o.status === 'PENDING' || o.status === 'NEW').length;
      if (silent && currentPending > previousPendingCount.current) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.start();
          osc.stop(ctx.currentTime + 0.45);
        } catch {}
      }
      previousPendingCount.current = currentPending;
    } catch (err: any) {
      setError(err.message || 'Failed to load orders from central backend');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Background auto-refresh polling every 20 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadOrders(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    setActionSuccess(null);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      setActionSuccess(`Order updated to ${newStatus.replace(/_/g, ' ')}`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Reject Confirmation Handler (In-App Modal)
  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return;
    const orderId = rejectModalOrder.id;
    const orderNum = rejectModalOrder.order_number;
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, 'CANCELLED');
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o))
      );
      setActionSuccess(`Order #${orderNum} rejected (${rejectReason})`);
      setRejectModalOrder(null);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete Confirmation Handler (In-App Modal)
  const handleConfirmDelete = async () => {
    if (!deleteModalOrder) return;
    const orderId = deleteModalOrder.id;
    const orderNum = deleteModalOrder.order_number;
    setUpdatingId(orderId);
    try {
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setActionSuccess(`Order #${orderNum} permanently deleted`);
      setDeleteModalOrder(null);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // UPI Verification Handler (In-App Modal)
  const handleConfirmVerifyPayment = async () => {
    if (!verifyUpiOrder) return;
    const orderId = verifyUpiOrder.id;
    const orderNum = verifyUpiOrder.order_number;
    const utr = verifyUpiUtr.trim();
    setUpdatingId(orderId);
    try {
      await verifyOrderPayment(orderId, utr || undefined);
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? { ...o, payment_status: 'PAID', transaction_ref: utr || o.transaction_ref }
            : o
        )
      );
      setActionSuccess(`UPI Payment verified for #${orderNum}`);
      setVerifyUpiOrder(null);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(`Payment verification failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenReceiptModal = (order: AdminOrderDto, mode: 'CUSTOMER_BILL' | 'KOT') => {
    const items = (order.items || []).map((i: any) => ({
      name: i.item_name || i.name || 'Menu Item',
      quantity: Number(i.quantity || 1),
      unitPrice: Number(i.unit_price || 0),
      lineTotal: Number(i.line_total || (Number(i.quantity || 1) * Number(i.unit_price || 0)))
    }));

    setReceiptModalData({
      receiptType: mode,
      orderNumber: order.order_number,
      invoiceNumber: order.order_number,
      date: order.created_at,
      paymentMode: order.payment_mode || 'CASH',
      customerName: order.customer_name || 'Counter Customer',
      customerPhone: (order as any).customer_phone || '',
      customerAddress: order.delivery_address || (order.order_type === 'DINE_IN' ? 'Table Order' : 'Takeaway Counter'),
      items,
      subtotal: Number(order.subtotal || order.grand_total || 0),
      tax: Number(order.tax_amount || 0),
      discount: Number(order.discount_amount || 0),
      grandTotal: Number(order.grand_total || 0)
    });
    setReceiptModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
      case 'NEW':
        return {
          color: '#B45309',
          bg: '#FEF3C7',
          border: '#FDE68A',
          label: '🟡 Awaiting Confirmation'
        };
      case 'CONFIRMED':
        return {
          color: '#0284C7',
          bg: '#E0F2FE',
          border: '#BAE6FD',
          label: '🔵 Confirmed'
        };
      case 'PREPARING':
        return {
          color: '#D97706',
          bg: '#FEF3C7',
          border: '#FCD34D',
          label: '🍳 In Kitchen'
        };
      case 'READY':
        return {
          color: '#0D9488',
          bg: '#CCFBF1',
          border: '#99F6E4',
          label: '🥡 Food Ready'
        };
      case 'OUT_FOR_DELIVERY':
        return {
          color: '#7C3AED',
          bg: '#EDE9FE',
          border: '#DDD6FE',
          label: '🛵 Out for Delivery'
        };
      case 'DELIVERED':
      case 'COMPLETED':
        return {
          color: '#16A34A',
          bg: '#DCFCE7',
          border: '#BBF7D0',
          label: '✅ Delivered'
        };
      case 'CANCELLED':
        return {
          color: '#DC2626',
          bg: '#FEE2E2',
          border: '#FECACA',
          label: '❌ Cancelled'
        };
      default:
        return {
          color: '#64748B',
          bg: '#F1F5F9',
          border: '#E2E8F0',
          label: status
        };
    }
  };

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
      all: orders.length,
      today: orders.filter(o => isWithinDateFilter(o.created_at, 'today')).length,
      yesterday: orders.filter(o => isWithinDateFilter(o.created_at, 'yesterday')).length,
      week: orders.filter(o => isWithinDateFilter(o.created_at, 'week')).length,
      month: orders.filter(o => isWithinDateFilter(o.created_at, 'month')).length
    };
  }, [orders]);

  // Orders filtered by Date first
  const dateFilteredOrders = useMemo(() => {
    return orders.filter(o => isWithinDateFilter(o.created_at, dateFilter));
  }, [orders, dateFilter]);

  // Status Counts calculated on active date scope
  const counts = useMemo(() => {
    return {
      all: dateFilteredOrders.length,
      pending: dateFilteredOrders.filter(o => o.status === 'PENDING' || o.status === 'NEW').length,
      kitchen: dateFilteredOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'PREPARING').length,
      ready: dateFilteredOrders.filter(o => o.status === 'READY').length,
      out: dateFilteredOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length,
      delivered: dateFilteredOrders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length,
      cancelled: dateFilteredOrders.filter(o => o.status === 'CANCELLED').length
    };
  }, [dateFilteredOrders]);

  // Final Filtered Orders
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter(order => {
      const s = (order.status || '').toUpperCase();
      let matchesFilter = true;
      if (statusFilter === 'PENDING') {
        matchesFilter = s === 'PENDING' || s === 'NEW';
      } else if (statusFilter === 'KITCHEN') {
        matchesFilter = s === 'CONFIRMED' || s === 'PREPARING';
      } else if (statusFilter === 'READY') {
        matchesFilter = s === 'READY';
      } else if (statusFilter === 'OUT_FOR_DELIVERY') {
        matchesFilter = s === 'OUT_FOR_DELIVERY';
      } else if (statusFilter === 'DELIVERED') {
        matchesFilter = s === 'DELIVERED' || s === 'COMPLETED';
      } else if (statusFilter === 'CANCELLED') {
        matchesFilter = s === 'CANCELLED';
      }

      if (!matchesFilter) return false;

      const rawQuery = searchQuery.toLowerCase().trim();
      const keywords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];
      if (keywords.length === 0) return true;

      const itemsText = (order.items || []).map((i: any) => i.item_name || i.name || '').join(' ');
      const searchable = [
        order.order_number,
        order.customer_name || '',
        order.customer_phone || '',
        order.delivery_address || '',
        order.special_instructions || '',
        order.status || '',
        order.order_type || '',
        order.payment_mode || '',
        order.transaction_ref || '',
        order.grand_total?.toString() || '',
        itemsText
      ].join(' ').toLowerCase();

      return keywords.every(kw => searchable.includes(kw));
    });
  }, [dateFilteredOrders, statusFilter, searchQuery]);

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2328', margin: 0 }}>
              Live Order Manager
            </h1>
            {counts.pending > 0 && (
              <span
                className="pulse-badge"
                style={{
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ⚠️ {counts.pending} New Action Needed
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '3px' }}>
            Real-time kitchen stream and delivery pipeline with instant status actions.
          </p>
        </div>

        {/* Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Auto Refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '7px 12px',
              backgroundColor: autoRefresh ? '#ECFDF5' : '#F1F5F9',
              border: `1px solid ${autoRefresh ? '#A7F3D0' : '#CBD5E1'}`,
              color: autoRefresh ? '#065F46' : '#64748B',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title={autoRefresh ? 'Auto-refreshing every 20s. Click to pause.' : 'Auto-refresh paused. Click to enable.'}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: autoRefresh ? '#10B981' : '#94A3B8' }} />
            {autoRefresh ? 'Live Stream: ON' : 'Live Stream: PAUSED'}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => loadOrders(false)}
            disabled={loading || isRefreshing}
            style={{
              padding: '7px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--cw-color-border)',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              cursor: loading || isRefreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 'var(--cw-radius-md)', marginBottom: '14px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: 'var(--cw-radius-md)', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error} •{' '}
          <button onClick={() => loadOrders(false)} style={{ background: 'transparent', border: 'none', textDecoration: 'underline', color: '#991B1B', cursor: 'pointer', fontWeight: 700 }}>
            Retry now
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 18px',
          borderRadius: 'var(--cw-radius-lg)',
          border: '1px solid var(--cw-color-border)',
          marginBottom: '20px',
          boxShadow: 'var(--cw-shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* ROW 1: Date Filter Tabs (Today, Yesterday, 7 Days, Month, All Time) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px' }}>
            Date Range:
          </span>
          {[
            { id: 'all', label: 'All Orders', count: dateCounts.all },
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
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
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

        {/* ROW 2: Status Pipeline Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
          {[
            { id: 'ALL', label: 'All Statuses', count: counts.all },
            { id: 'PENDING', label: '🟡 Pending Approval', count: counts.pending, urgent: counts.pending > 0 },
            { id: 'KITCHEN', label: '🍳 In Kitchen', count: counts.kitchen },
            { id: 'READY', label: '🥡 Food Ready', count: counts.ready },
            { id: 'OUT_FOR_DELIVERY', label: '🛵 Out for Delivery', count: counts.out },
            { id: 'DELIVERED', label: '✅ Delivered', count: counts.delivered },
            { id: 'CANCELLED', label: '❌ Cancelled', count: counts.cancelled }
          ].map(tab => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '24px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? 'none' : '1px solid #E2E8F0',
                  backgroundColor: isSelected
                    ? tab.urgent ? '#D97706' : '#6F432A'
                    : tab.urgent ? '#FEF3C7' : '#F8FAFC',
                  color: isSelected
                    ? '#FFFFFF'
                    : tab.urgent ? '#92400E' : '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(255,255,255,0.25)'
                      : tab.urgent ? '#F59E0B' : '#E2E8F0',
                    color: isSelected ? '#FFFFFF' : tab.urgent ? '#FFFFFF' : '#475569',
                    padding: '1px 7px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 800
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ROW 3: Search input */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Search orders by #, customer name, phone, address, dish items, or kitchen notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--cw-color-border)',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '13px',
              backgroundColor: '#FAF5EE',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                fontWeight: 700
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Orders List / Grid (CARDS ONLY) */}
      {loading && orders.length === 0 ? (
        <div style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
          <ChaiLoader label="Loading Live Orders..." sublabel="Connecting to real-time order stream..." />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--cw-radius-lg)',
            border: '1px solid var(--cw-color-border)',
            color: '#64748B'
          }}
        >
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>📦</span>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1E2328' }}>No Orders Found</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>
            {searchQuery || statusFilter !== 'ALL' || dateFilter !== 'all'
              ? 'No orders match your active date filter, status, or search query.'
              : 'Orders placed from the website storefront or POS counter will appear here in real-time.'}
          </p>
          {(searchQuery || statusFilter !== 'ALL' || dateFilter !== 'all') && (
            <button
              onClick={() => { setStatusFilter('ALL'); setDateFilter('all'); setSearchQuery(''); }}
              style={{
                marginTop: '14px',
                padding: '6px 16px',
                borderRadius: '16px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="orders-grid-container" style={{ display: 'grid' }}>
          {filteredOrders.map(order => {
            const badge = getStatusBadge(order.status);
            const isUpdating = updatingId === order.id;
            const isPending = order.status === 'PENDING' || order.status === 'NEW';
            const cleanPhone = getCleanPhone(order.customer_phone);
            const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const mapsUrl = order.delivery_address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`
              : null;

            return (
              <div
                key={order.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: isPending ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                  boxShadow: isPending ? '0 4px 16px rgba(245, 158, 11, 0.16)' : '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Pending Alert Strip */}
                {isPending && (
                  <div
                    style={{
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      padding: '5px 16px',
                      borderBottom: '1px solid #FDE68A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      letterSpacing: '0.02em'
                    }}
                  >
                    <span>⚠️ NEW INCOMING ORDER — ACTION REQUIRED</span>
                    <span>{formatRelativeTime(order.created_at)}</span>
                  </div>
                )}

                {/* Card Header: Order ID, Type & Status */}
                <div
                  style={{
                    padding: '14px 16px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        href={getInvoicePdfUrl(order.order_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontWeight: 800,
                          color: '#1D4ED8',
                          fontFamily: 'monospace',
                          fontSize: '14.5px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE'
                        }}
                        title="Download Tax Invoice PDF"
                      >
                        📄 #{order.order_number} ↗
                      </a>

                      {/* Order Type Tag */}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor:
                            order.order_type === 'DIRECT_DELIVERY' ? '#EFF6FF' :
                            order.order_type === 'TAKEAWAY' ? '#FFFBEB' : '#F0FDF4',
                          color:
                            order.order_type === 'DIRECT_DELIVERY' ? '#1D4ED8' :
                            order.order_type === 'TAKEAWAY' ? '#B45309' : '#15803D',
                          border: `1px solid ${
                            order.order_type === 'DIRECT_DELIVERY' ? '#BFDBFE' :
                            order.order_type === 'TAKEAWAY' ? '#FDE68A' : '#BBF7D0'
                          }`,
                          letterSpacing: '0.03em'
                        }}
                      >
                        {order.order_type === 'DIRECT_DELIVERY' ? '🛵 DELIVERY' :
                         order.order_type === 'TAKEAWAY' ? '🥡 TAKEAWAY' :
                         order.order_type === 'DINE_IN' ? '🍽️ DINE IN' : order.order_type}
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', fontWeight: 500 }}>
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {!isPending && `(${formatRelativeTime(order.created_at)})`}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '14px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Customer & Destination Details Section */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    margin: '4px 16px 10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px'
                  }}
                >
                  {/* Customer Name */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>
                      👤 {order.customer_name || 'Walk-in Guest'}
                    </div>

                    {/* Direct Contact Buttons */}
                    {order.customer_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <a
                          href={`tel:${order.customer_phone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#1D4ED8',
                            backgroundColor: '#EFF6FF',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            border: '1px solid #BFDBFE'
                          }}
                          title="Call customer directly"
                        >
                          📞 Call
                        </a>

                        {waPhone && (
                          <a
                            href={`https://wa.me/${waPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#166534',
                              backgroundColor: '#DCFCE7',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              border: '1px solid #BBF7D0'
                            }}
                            title="Chat with customer on WhatsApp"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Phone Number Display */}
                  {order.customer_phone && (
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', fontWeight: 600 }}>
                      📱 {order.customer_phone}
                    </div>
                  )}

                  {/* Delivery Address */}
                  {order.delivery_address ? (
                    <div style={{ marginTop: '6px', color: '#334155', fontSize: '12.5px', lineHeight: 1.45 }}>
                      📍 <strong>Address:</strong> {order.delivery_address}{' '}
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '11px',
                            color: '#0284C7',
                            textDecoration: 'underline',
                            fontWeight: 700,
                            marginLeft: '4px'
                          }}
                        >
                          [🗺️ Open in Maps]
                        </a>
                      )}
                    </div>
                  ) : order.order_type === 'TAKEAWAY' ? (
                    <div style={{ marginTop: '4px', color: '#64748B', fontSize: '12px' }}>
                      🥡 Takeaway Counter Pickup (Rohini Sector 3)
                    </div>
                  ) : order.order_type === 'DINE_IN' ? (
                    <div style={{ marginTop: '4px', color: '#64748B', fontSize: '12px' }}>
                      🍽️ Dine-in Table Service
                    </div>
                  ) : null}

                  {/* Special Instructions Note */}
                  {order.special_instructions && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '7px 10px',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FCD34D',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#92400E',
                        lineHeight: 1.4
                      }}
                    >
                      📝 <strong>Kitchen Note:</strong> {order.special_instructions}
                    </div>
                  )}
                </div>

                {/* Items Summary Snapshot */}
                <div style={{ padding: '0 16px 10px', flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Items Snapshot ({order.items?.length || 0})
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '13px',
                            padding: '3px 0',
                            borderBottom: idx < order.items!.length - 1 ? '1px dashed #F1F5F9' : 'none'
                          }}
                        >
                          <span style={{ color: '#1E2328' }}>
                            <strong style={{ color: '#6F432A', marginRight: '6px', fontSize: '13.5px' }}>{item.quantity}x</strong>
                            {item.item_name}
                          </span>
                          <span style={{ fontWeight: 700, color: '#334155', fontSize: '12.5px' }}>
                            ₹{Number(item.line_total || item.unit_price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>{order.order_type} Order</span>
                    )}
                  </div>

                  {/* Financials Strip */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#F1F5F9',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      marginTop: '10px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                        ₹{Number(order.grand_total).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        (Tax: ₹{Number(order.tax_amount || 0).toFixed(2)})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {/* Payment Mode */}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: order.payment_mode === 'UPI' ? '#E0F2FE' : '#DCFCE7',
                          color: order.payment_mode === 'UPI' ? '#0284C7' : '#166534'
                        }}
                      >
                        {order.payment_mode === 'UPI' ? '📱 UPI' : '💵 CASH'}
                      </span>

                      {/* Payment Status */}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            order.payment_status === 'PAID' || order.payment_status === 'COMPLETED'
                              ? '#DCFCE7'
                              : '#FEF3C7',
                          color:
                            order.payment_status === 'PAID' || order.payment_status === 'COMPLETED'
                              ? '#16A34A'
                              : '#D97706'
                        }}
                      >
                        {order.payment_status || 'PENDING'}
                      </span>

                      {/* Verify UPI Payment Button -> Opens In-App Modal */}
                      {order.payment_mode === 'UPI' && order.payment_status !== 'PAID' && (
                        <button
                          onClick={() => {
                            setVerifyUpiOrder(order);
                            setVerifyUpiUtr(order.transaction_ref || '');
                          }}
                          disabled={isUpdating}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: isUpdating ? 'not-allowed' : 'pointer'
                          }}
                          title="Verify UTR reference and mark PAID"
                        >
                          ✓ Verify UPI
                        </button>
                      )}
                    </div>
                  </div>

                  {order.transaction_ref && (
                    <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', marginTop: '4px' }}>
                      UTR Ref: {order.transaction_ref}
                    </div>
                  )}
                </div>

                {/* Primary 1-Tap Action Pipeline Button */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', backgroundColor: '#FAFAFA' }}>
                  {isPending ? (
                    /* PENDING / NEW: Big Accept & Confirm + Reject (Opens Modal) */
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleStatusChange(order.id, 'CONFIRMED')}
                        disabled={isUpdating}
                        style={{
                          flex: 2,
                          padding: '11px 14px',
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13.5px',
                          fontWeight: 800,
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                        }}
                      >
                        {isUpdating ? 'Updating...' : '✅ Accept & Confirm Order'}
                      </button>

                      {/* Reject Button -> Opens in-app modal instead of window.confirm */}
                      <button
                        onClick={() => {
                          setRejectModalOrder(order);
                          setRejectReason('Kitchen busy / Peak rush');
                        }}
                        disabled={isUpdating}
                        style={{
                          flex: 1,
                          padding: '11px 12px',
                          backgroundColor: '#FFFFFF',
                          color: '#DC2626',
                          border: '1.5px solid #FCA5A5',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  ) : order.status === 'CONFIRMED' ? (
                    /* CONFIRMED: Send to Kitchen */
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleStatusChange(order.id, 'PREPARING')}
                        disabled={isUpdating}
                        style={{
                          flex: 1,
                          padding: '11px 14px',
                          backgroundColor: '#0284C7',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13.5px',
                          fontWeight: 800,
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {isUpdating ? 'Updating...' : '🍳 Start Preparing (Kitchen)'}
                      </button>
                      <button
                        onClick={() => {
                          setRejectModalOrder(order);
                          setRejectReason('Order cancelled by store');
                        }}
                        disabled={isUpdating}
                        style={{
                          padding: '11px 12px',
                          backgroundColor: '#FFFFFF',
                          color: '#64748B',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: isUpdating ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : order.status === 'PREPARING' ? (
                    /* PREPARING: Mark Ready */
                    <button
                      onClick={() => handleStatusChange(order.id, 'READY')}
                      disabled={isUpdating}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        backgroundColor: '#0D9488',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {isUpdating ? 'Updating...' : '🥡 Mark Food Ready for Pickup / Dispatch'}
                    </button>
                  ) : order.status === 'READY' ? (
                    /* READY: Out for delivery or Hand over */
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {order.order_type === 'DIRECT_DELIVERY' ? (
                        <button
                          onClick={() => handleStatusChange(order.id, 'OUT_FOR_DELIVERY')}
                          disabled={isUpdating}
                          style={{
                            flex: 1,
                            padding: '11px 14px',
                            backgroundColor: '#7C3AED',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: 800,
                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          {isUpdating ? 'Updating...' : '🛵 Send Out for Delivery'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                          disabled={isUpdating}
                          style={{
                            flex: 1,
                            padding: '11px 14px',
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: 800,
                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          {isUpdating ? 'Updating...' : '✔️ Hand Over & Complete'}
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                        disabled={isUpdating}
                        style={{
                          padding: '11px 12px',
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: isUpdating ? 'not-allowed' : 'pointer'
                        }}
                        title="Directly mark delivered"
                      >
                        ✔️ Delivered
                      </button>
                    </div>
                  ) : order.status === 'OUT_FOR_DELIVERY' ? (
                    /* OUT FOR DELIVERY: Mark Delivered */
                    <button
                      onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                      disabled={isUpdating}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {isUpdating ? 'Updating...' : '✔️ Mark Delivered & Fulfilled'}
                    </button>
                  ) : order.status === 'DELIVERED' || order.status === 'COMPLETED' ? (
                    <div
                      style={{
                        padding: '9px 12px',
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 800,
                        textAlign: 'center',
                        border: '1px solid #BBF7D0'
                      }}
                    >
                      ✓ Fulfilled & Delivered
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '9px 12px',
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 800,
                        textAlign: 'center',
                        border: '1px solid #FECACA'
                      }}
                    >
                      ✕ Order Cancelled
                    </div>
                  )}
                </div>

                {/* Secondary Action Toolbar */}
                <div
                  style={{
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '6px',
                    borderTop: '1px solid #F1F5F9',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {/* Bill Receipt Modal */}
                    <button
                      onClick={() => handleOpenReceiptModal(order, 'CUSTOMER_BILL')}
                      style={{
                        padding: '5px 8px',
                        backgroundColor: '#166534',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Print / View Thermal Customer Bill"
                    >
                      🧾 Bill
                    </button>

                    {/* Official PDF */}
                    <a
                      href={getInvoicePdfUrl(order.order_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '5px 8px',
                        backgroundColor: '#1D4ED8',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Download GST Invoice PDF"
                    >
                      📄 PDF
                    </a>

                    {/* Kitchen KOT */}
                    <button
                      onClick={() => handleOpenReceiptModal(order, 'KOT')}
                      style={{
                        padding: '5px 8px',
                        backgroundColor: '#334155',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Print Kitchen Order Ticket"
                    >
                      🍳 KOT
                    </button>

                    {/* WhatsApp Update */}
                    {(() => {
                      const msgFn =
                        order.status === 'CONFIRMED'
                          ? WhatsAppTemplates.ORDER_CONFIRMATION
                          : order.status === 'PREPARING'
                          ? WhatsAppTemplates.ORDER_PREPARING
                          : order.status === 'READY'
                          ? WhatsAppTemplates.ORDER_READY
                          : order.status === 'OUT_FOR_DELIVERY'
                          ? WhatsAppTemplates.ORDER_OUT_FOR_DELIVERY
                          : WhatsAppTemplates.ORDER_COMPLETED;

                      const msgText =
                        order.status === 'CONFIRMED'
                          ? (WhatsAppTemplates.ORDER_CONFIRMATION as any)({
                              customerName: order.customer_name || 'Customer',
                              orderNumber: order.order_number,
                              total: order.grand_total,
                              paymentMode: order.payment_mode || 'CASH',
                              trackingUrl: 'https://chaiwale.co.in'
                            })
                          : order.status === 'READY'
                          ? (WhatsAppTemplates.ORDER_READY as any)({
                              customerName: order.customer_name || 'Customer',
                              orderNumber: order.order_number,
                              total: order.grand_total
                            })
                          : (msgFn as any)({
                              customerName: order.customer_name || 'Customer',
                              orderNumber: order.order_number
                            });

                      const waResult = buildWhatsAppUrl((order as any).customer_phone, msgText);

                      return waResult.success && waResult.url ? (
                        <a
                          href={waResult.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '5px 8px',
                            backgroundColor: '#25D366',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Send update on WhatsApp"
                        >
                          💬 WA
                        </a>
                      ) : null;
                    })()}

                    {/* Delete Order -> Opens In-App Modal */}
                    <button
                      onClick={() => setDeleteModalOrder(order)}
                      disabled={isUpdating}
                      style={{
                        padding: '5px 8px',
                        backgroundColor: '#7F1D1D',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: isUpdating ? 'not-allowed' : 'pointer'
                      }}
                      title="Permanently delete order"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= IN-APP POPUP MODAL 1: REJECT ORDER ================= */}
      {rejectModalOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
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
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid #FCA5A5'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}
              >
                🛑
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                  Reject Order #{rejectModalOrder.order_number}?
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0' }}>
                  Customer: <strong>{rejectModalOrder.customer_name || 'Guest'}</strong> • Total: <strong>₹{rejectModalOrder.grand_total}</strong>
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
              Rejecting this order will cancel it immediately and update customer tracking to Cancelled. Please select the primary reason:
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1E2328', marginBottom: '6px' }}>
                Cancellation Reason:
              </label>
              <select
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#FAF5EE'
                }}
              >
                <option value="Kitchen busy / Peak rush">Kitchen busy / Peak rush</option>
                <option value="Items out of stock">Items out of stock</option>
                <option value="Delivery address unreachable">Delivery address unreachable</option>
                <option value="Customer requested cancellation">Customer requested cancellation</option>
                <option value="Payment not received / fake order">Payment not received / fake order</option>
                <option value="Store closing soon">Store closing soon</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setRejectModalOrder(null)}
                style={{
                  flex: 1,
                  padding: '11px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel / Keep Order
              </button>
              <button
                onClick={handleConfirmReject}
                style={{
                  flex: 1,
                  padding: '11px',
                  backgroundColor: '#DC2626',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                }}
              >
                ✕ Yes, Reject Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP POPUP MODAL 2: DELETE ORDER ================= */}
      {deleteModalOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
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
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid #FCA5A5'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  color: '#7F1D1D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}
              >
                🗑️
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#7F1D1D', margin: 0 }}>
                  Permanently Delete Order #{deleteModalOrder.order_number}?
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0' }}>
                  Customer: <strong>{deleteModalOrder.customer_name || 'Guest'}</strong>
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
              ⚠️ This order will be permanently erased from Supabase PostgreSQL database. This action is irreversible.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeleteModalOrder(null)}
                style={{
                  flex: 1,
                  padding: '11px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1,
                  padding: '11px',
                  backgroundColor: '#7F1D1D',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                🗑️ Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP POPUP MODAL 3: VERIFY UPI PAYMENT ================= */}
      {verifyUpiOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
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
              borderRadius: '16px',
              maxWidth: '430px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid #BBF7D0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}
              >
                📱
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#166534', margin: 0 }}>
                  Verify UPI Payment #{verifyUpiOrder.order_number}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0' }}>
                  Order Total: <strong>₹{verifyUpiOrder.grand_total}</strong>
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
              Confirm receipt in your UPI bank app (BHIM / PhonePe / GPay) and enter the 12-digit UTR reference:
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1E2328', marginBottom: '6px' }}>
                Bank UTR / Transaction Reference:
              </label>
              <input
                type="text"
                value={verifyUpiUtr}
                onChange={e => setVerifyUpiUtr(e.target.value)}
                placeholder="e.g. 432198765432"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  backgroundColor: '#F8FAFC'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setVerifyUpiOrder(null)}
                style={{
                  flex: 1,
                  padding: '11px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVerifyPayment}
                style={{
                  flex: 1,
                  padding: '11px',
                  backgroundColor: '#16A34A',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
                }}
              >
                ✓ Confirm & Mark PAID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Animated Thermal Receipt Printer & KOT Modal */}
      <ThermalReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        data={receiptModalData}
      />
    </div>
  );
}
