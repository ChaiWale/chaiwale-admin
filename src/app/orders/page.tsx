'use client';

import React, { useState, useEffect } from 'react';
import { fetchRecentOrders, updateOrderStatus, verifyOrderPayment, deleteOrder, AdminOrderDto } from '../../services/admin-api.client';
import { buildWhatsAppUrl, WhatsAppTemplates } from '../../utils/whatsapp';
import { ThermalReceiptModal, ThermalReceiptData } from '../../components/ThermalReceiptModal';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<ThermalReceiptData | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRecentOrders(50);
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders from central backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    setActionSuccess(null);
    try {
      await updateOrderStatus(orderId, newStatus);
      // Update local state
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      setActionSuccess(`Order updated to ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVerifyPayment = async (order: AdminOrderDto) => {
    const utr = prompt(`Verify UPI Payment for #${order.order_number}?\nEnter/Confirm UTR reference:`, order.transaction_ref || '');
    if (utr === null) return;

    setUpdatingId(order.id);
    try {
      await verifyOrderPayment(order.id, utr.trim() || undefined);
      setOrders(prev =>
        prev.map(o => (o.id === order.id ? { ...o, payment_status: 'PAID', transaction_ref: utr.trim() || o.transaction_ref } : o))
      );
      setActionSuccess(`UPI Payment verified for #${order.order_number}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(`Payment verification failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (order: AdminOrderDto) => {
    if (!confirm(`Permanently delete order #${order.order_number}?\n\nThis cannot be undone.`)) return;
    setUpdatingId(order.id);
    try {
      await deleteOrder(order.id);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setActionSuccess(`Order #${order.order_number} permanently deleted`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
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
    switch (status) {
      case 'NEW':
        return { color: '#6366F1', bg: '#EEF2FF', label: 'New' };
      case 'CONFIRMED':
        return { color: '#0284C7', bg: '#E0F2FE', label: 'Confirmed' };
      case 'PREPARING':
        return { color: '#D97706', bg: '#FEF3C7', label: 'Preparing' };
      case 'READY':
        return { color: '#0D9488', bg: '#CCFBF1', label: 'Ready' };
      case 'OUT_FOR_DELIVERY':
        return { color: '#7C3AED', bg: '#EDE9FE', label: 'Out for Delivery' };
      case 'DELIVERED':
      case 'COMPLETED':
        return { color: '#16A34A', bg: '#DCFCE7', label: 'Delivered' };
      case 'CANCELLED':
        return { color: '#DC2626', bg: '#FEE2E2', label: 'Cancelled' };
      default:
        return { color: '#64748B', bg: '#F1F5F9', label: status };
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    if (!matchesStatus) return false;

    const rawQuery = searchQuery.toLowerCase().trim();
    const keywords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];
    if (keywords.length === 0) return true;

    const itemsText = (order.items || []).map((i: any) => i.item_name || i.name || '').join(' ');
    const searchable = [
      order.order_number,
      order.customer_name || '',
      order.delivery_address || '',
      order.status || '',
      order.order_type || '',
      order.payment_mode || '',
      order.transaction_ref || '',
      order.grand_total?.toString() || '',
      itemsText
    ].join(' ').toLowerCase();

    return keywords.every(kw => searchable.includes(kw));
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2328' }}>Live Order Stream</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Live order stream synchronized across kitchen display, counter POS, and web storefront
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={loadOrders}
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
            {loading ? 'Refreshing...' : '🔄 Refresh Stream'}
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DCFCE7', color: '#16A34A', borderRadius: 'var(--cw-radius-md)', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
          ✓ {actionSuccess}
        </div>
      )}

      {error && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--cw-radius-md)', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ {error} • <button onClick={loadOrders} style={{ background: 'transparent', border: 'none', textDecoration: 'underline', color: '#991B1B', cursor: 'pointer', fontWeight: 700 }}>Click here to retry</button>
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
          {['ALL', 'NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'].map(status => (
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
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Search input */}
        <input
          type="text"
          placeholder="Search orders by #, customer, phone, address, items, status, or keywords..."
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

      {/* Orders Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--cw-radius-md)',
          border: '1px solid var(--cw-color-border)',
          boxShadow: 'var(--cw-shadow-sm)',
          overflow: 'hidden'
        }}
      >
        {loading && orders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>Loading live orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>No orders found</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or filter.'
                : 'Orders created in the storefront or POS will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--cw-color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Order ID & Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Customer & Destination</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Items Summary</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Financials (5% GST)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Live Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const badge = getStatusBadge(order.status);
                  const isUpdating = updatingId === order.id;

                  return (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {/* Order Number & Timestamp */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 700, color: '#1E2328', fontFamily: 'monospace', fontSize: '13px' }}>
                          {order.order_number}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#F1F5F9',
                              color: '#475569',
                              letterSpacing: '0.04em'
                            }}
                          >
                            {order.order_type}
                          </span>
                        </div>
                      </td>

                      {/* Customer & Address */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, color: '#1E2328' }}>
                          {order.customer_name || 'Walk-in Guest'}
                        </div>
                        {order.delivery_address && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.delivery_address}>
                            📍 {order.delivery_address}
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td style={{ padding: '16px' }}>
                        {order.items && order.items.length > 0 ? (
                          <div>
                            {order.items.map((item, idx) => (
                              <div key={idx} style={{ fontSize: '12px', color: '#334155' }}>
                                <span style={{ fontWeight: 600 }}>{item.quantity}x</span> {item.item_name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94A3B8' }}>{order.order_type} order</span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 700, color: '#1E2328', fontSize: '14px' }}>
                          ₹{Number(order.grand_total).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Tax: ₹{Number(order.tax_amount || 0).toFixed(2)}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: order.payment_mode === 'UPI' ? '#E0F2FE' : order.payment_mode === 'CREDIT' ? '#FEE2E2' : '#DCFCE7',
                              color: order.payment_mode === 'UPI' ? '#0284C7' : order.payment_mode === 'CREDIT' ? '#DC2626' : '#16A34A'
                            }}
                          >
                            {order.payment_mode || 'CASH'}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: order.payment_status === 'PAID' || order.payment_status === 'COMPLETED' ? '#DCFCE7' : '#FEF3C7',
                              color: order.payment_status === 'PAID' || order.payment_status === 'COMPLETED' ? '#16A34A' : '#D97706'
                            }}
                          >
                            {order.payment_status || 'PENDING'}
                          </span>
                        </div>
                        {order.transaction_ref && (
                          <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace', marginTop: '3px' }} title={order.transaction_ref}>
                            Ref: {order.transaction_ref.length > 12 ? `${order.transaction_ref.slice(0, 10)}...` : order.transaction_ref}
                          </div>
                        )}
                      </td>

                      {/* Live Status Badge */}
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
                      </td>

                      {/* Status Action Selector */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {order.status === 'NEW' && (
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                              <button
                                onClick={() => handleStatusChange(order.id, 'CONFIRMED')}
                                disabled={isUpdating}
                                style={{
                                  flex: 1,
                                  padding: '6px 10px',
                                  backgroundColor: '#16A34A',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Accept this customer order"
                              >
                                ✓ Accept
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Reject order #${order.order_number}? This will cancel the order.`)) {
                                    handleStatusChange(order.id, 'CANCELLED');
                                  }
                                }}
                                disabled={isUpdating}
                                style={{
                                  flex: 1,
                                  padding: '6px 10px',
                                  backgroundColor: '#DC2626',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Reject / Cancel this order"
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}

                          <select
                            value={order.status}
                            disabled={isUpdating}
                            onChange={e => handleStatusChange(order.id, e.target.value)}
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
                            <option value="NEW">Set: New</option>
                            <option value="CONFIRMED">Set: Confirmed</option>
                            <option value="PREPARING">Set: Preparing</option>
                            <option value="READY">Set: Ready</option>
                            <option value="OUT_FOR_DELIVERY">Set: Out for Delivery</option>
                            <option value="DELIVERED">Set: Delivered</option>
                            <option value="CANCELLED">Set: Cancelled</option>
                          </select>

                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {order.payment_mode === 'UPI' && order.payment_status !== 'PAID' && (
                              <button
                                onClick={() => handleVerifyPayment(order)}
                                disabled={isUpdating}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#16A34A',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: 'var(--cw-radius-md)',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: isUpdating ? 'not-allowed' : 'pointer'
                                }}
                              >
                                ✓ Verify UPI
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenReceiptModal(order, 'CUSTOMER_BILL')}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#166534',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 'var(--cw-radius-md)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Print / View Customer Bill"
                            >
                              🧾 Bill
                            </button>

                            <button
                              onClick={() => handleOpenReceiptModal(order, 'KOT')}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#334155',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 'var(--cw-radius-md)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Print / View Kitchen Order Ticket (KOT)"
                            >
                              🍳 KOT
                            </button>

                            {/* 🗑️ Delete Order — Admin only */}
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              disabled={isUpdating}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#7F1D1D',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 'var(--cw-radius-md)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: isUpdating ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Permanently delete this order (admin only)"
                            >
                              🗑️
                            </button>

                            {/* WhatsApp Chat — only renders when customer has a valid phone */}
                            {(() => {
                              const msgFn = order.status === 'CONFIRMED'
                                ? WhatsAppTemplates.ORDER_CONFIRMATION
                                : order.status === 'PREPARING'
                                ? WhatsAppTemplates.ORDER_PREPARING
                                : order.status === 'READY'
                                ? WhatsAppTemplates.ORDER_READY
                                : order.status === 'OUT_FOR_DELIVERY'
                                ? WhatsAppTemplates.ORDER_OUT_FOR_DELIVERY
                                : WhatsAppTemplates.ORDER_COMPLETED;

                              const msgText = order.status === 'CONFIRMED'
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

                              const waResult = buildWhatsAppUrl(
                                (order as any).customer_phone,
                                msgText
                              );

                              return waResult.success && waResult.url ? (
                                <a
                                  href={waResult.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Chat on WhatsApp"
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#25D366',
                                    color: '#FFFFFF',
                                    textDecoration: 'none',
                                    borderRadius: 'var(--cw-radius-md)',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  WA
                                </a>
                              ) : null;
                            })()}
                          </div>
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

      {/* 3D Animated Thermal Receipt Printer & KOT Modal */}
      <ThermalReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        data={receiptModalData}
      />
    </div>
  );
}
