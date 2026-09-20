'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
  regenerateClientPin,
  fetchClientStatement,
  addClientEntry,
  deleteClientEntry,
  addClientPayment,
  deleteClientPayment,
  ClientOfficeDto,
  ClientStatementDto
} from '../../services/admin-api.client';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientOfficeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'SETTLED'>('ALL');

  // Copy feedback state { [key: string]: boolean }
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Create / Edit Client Modal
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientOfficeDto | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    company_name: '',
    floor_unit: '',
    notes: '',
    client_pin: ''
  });
  const [savingClient, setSavingClient] = useState(false);

  // Statement / Bill Details Modal
  const [selectedClientForStatement, setSelectedClientForStatement] = useState<ClientOfficeDto | null>(null);
  const [statementData, setStatementData] = useState<ClientStatementDto | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [activeTab, setActiveTab] = useState<'entries' | 'payments'>('entries');

  // Add Bill Entry Modal
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [entryTargetClient, setEntryTargetClient] = useState<ClientOfficeDto | null>(null);
  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    item_name: '',
    quantity: 1,
    unit_price: 20,
    notes: ''
  });
  const [savingEntry, setSavingEntry] = useState(false);

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTargetClient, setPaymentTargetClient] = useState<ClientOfficeDto | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_mode: 'UPI',
    notes: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Generate 4-digit numerical PIN helper (1000 - 9999)
  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load client accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCopyText = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setClientForm({
      name: '',
      phone: '',
      company_name: '',
      floor_unit: '',
      notes: '',
      client_pin: generateRandomPin()
    });
    setShowClientModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (client: ClientOfficeDto) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      phone: client.phone,
      company_name: client.company_name || '',
      floor_unit: client.floor_unit || '',
      notes: client.notes || '',
      client_pin: client.client_pin || ''
    });
    setShowClientModal(true);
  };

  // Save (Create or Update) Client
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim() || !clientForm.phone.trim()) {
      alert('Please provide client name and phone number');
      return;
    }
    setSavingClient(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: clientForm.name,
          phone: clientForm.phone,
          company_name: clientForm.company_name,
          floor_unit: clientForm.floor_unit,
          notes: clientForm.notes
        });
        showNotification(`Updated client "${clientForm.name}" successfully`);
      } else {
        const created = await createClient(clientForm);
        showNotification(`Client "${created.name}" created with PIN: ${created.client_pin}`);
      }
      setShowClientModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save client');
    } finally {
      setSavingClient(false);
    }
  };

  // Regenerate PIN
  const handleRegeneratePin = async (client: ClientOfficeDto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Regenerate access PIN for ${client.name}? The old PIN will immediately stop working.`)) {
      return;
    }
    try {
      const newPin = await regenerateClientPin(client.id);
      showNotification(`New PIN for ${client.name}: ${newPin}`);
      loadData();
      if (selectedClientForStatement && selectedClientForStatement.id === client.id) {
        setSelectedClientForStatement({ ...selectedClientForStatement, client_pin: newPin });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate PIN');
    }
  };

  // Delete Client
  const handleDeleteClient = async (client: ClientOfficeDto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to permanently delete client account "${client.name}" and all their khata records? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteClient(client.id);
      showNotification(`Deleted client "${client.name}"`);
      if (selectedClientForStatement?.id === client.id) {
        setSelectedClientForStatement(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete client');
    }
  };

  // View Statement & Bill Details Modal
  const handleViewStatement = async (client: ClientOfficeDto) => {
    setSelectedClientForStatement(client);
    setLoadingStatement(true);
    setActiveTab('entries');
    try {
      const statement = await fetchClientStatement(client.id);
      setStatementData(statement);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch statement');
    } finally {
      setLoadingStatement(false);
    }
  };

  // Quick Add Entry
  const handleOpenAddEntry = (client: ClientOfficeDto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEntryTargetClient(client);
    setEntryForm({
      date: new Date().toISOString().split('T')[0],
      item_name: '',
      quantity: 1,
      unit_price: 20,
      notes: ''
    });
    setShowAddEntryModal(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryTargetClient || !entryForm.item_name.trim() || entryForm.quantity <= 0 || entryForm.unit_price <= 0) {
      alert('Please fill out all required fields with valid amounts');
      return;
    }
    setSavingEntry(true);
    try {
      await addClientEntry({
        office_id: entryTargetClient.id,
        item_name: entryForm.item_name,
        quantity: Number(entryForm.quantity),
        unit_price: Number(entryForm.unit_price),
        date: entryForm.date,
        notes: entryForm.notes
      });
      showNotification(`Added ${entryForm.quantity}x ${entryForm.item_name} for ${entryTargetClient.name}`);
      setShowAddEntryModal(false);
      loadData();
      if (selectedClientForStatement?.id === entryTargetClient.id) {
        handleViewStatement(selectedClientForStatement);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add bill entry');
    } finally {
      setSavingEntry(false);
    }
  };

  // Quick Record Payment
  const handleOpenPayment = (client: ClientOfficeDto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPaymentTargetClient(client);
    setPaymentForm({
      date: new Date().toISOString().split('T')[0],
      amount: client.balance_due > 0 ? client.balance_due : 0,
      payment_mode: 'UPI',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetClient || paymentForm.amount <= 0) {
      alert('Please enter a valid payment amount greater than ₹0');
      return;
    }
    setSavingPayment(true);
    try {
      await addClientPayment({
        office_id: paymentTargetClient.id,
        amount: Number(paymentForm.amount),
        payment_mode: paymentForm.payment_mode,
        date: paymentForm.date,
        notes: paymentForm.notes
      });
      showNotification(`Recorded payment of ₹${paymentForm.amount} from ${paymentTargetClient.name}`);
      setShowPaymentModal(false);
      loadData();
      if (selectedClientForStatement?.id === paymentTargetClient.id) {
        handleViewStatement(selectedClientForStatement);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setSavingPayment(false);
    }
  };

  // Delete Individual Entry from Statement
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to remove this bill entry?')) return;
    try {
      await deleteClientEntry(entryId);
      showNotification('Bill entry removed');
      if (selectedClientForStatement) {
        handleViewStatement(selectedClientForStatement);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  // Delete Individual Payment from Statement
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await deleteClientPayment(paymentId);
      showNotification('Payment record deleted');
      if (selectedClientForStatement) {
        handleViewStatement(selectedClientForStatement);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment');
    }
  };

  // Compute Aggregates
  const aggregates = useMemo(() => {
    const totalClients = clients.length;
    const totalBilled = clients.reduce((acc, c) => acc + (c.total_consumption || 0), 0);
    const totalPaid = clients.reduce((acc, c) => acc + (c.total_payments || 0), 0);
    const totalOverdue = clients.reduce((acc, c) => acc + Math.max(0, c.balance_due || 0), 0);
    const overdueCount = clients.filter((c) => (c.balance_due || 0) > 0).length;
    return { totalClients, totalBilled, totalPaid, totalOverdue, overdueCount };
  }, [clients]);

  // Filtered & Searched Clients (Multi-Keyword Search)
  const filteredClients = useMemo(() => {
    const rawQuery = searchQuery.toLowerCase().trim();
    const keywords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];

    return clients.filter((client) => {
      if (statusFilter === 'OVERDUE' && (client.balance_due || 0) <= 0) {
        return false;
      }
      if (statusFilter === 'SETTLED' && (client.balance_due || 0) > 0) {
        return false;
      }

      if (keywords.length === 0) return true;

      // Concatenate all searchable text for this client
      const searchableFields = [
        client.name,
        client.phone,
        client.company_name || '',
        client.floor_unit || '',
        client.client_pin || '',
        client.notes || ''
      ].join(' ').toLowerCase();

      // Client matches if EVERY keyword token is found
      return keywords.every((kw) => searchableFields.includes(kw));
    });
  }, [clients, searchQuery, statusFilter]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Banner / Heading */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0F172A',
              margin: '0 0 6px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span>👥</span> Client Accounts & Access PINs
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Manage corporate and daily customers, their generated 6-character access PINs, overdue balances, and khata billing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={loadData}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔄</span> Refresh
          </button>

          <button
            onClick={handleOpenCreateModal}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: '#C45A1C',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(196, 90, 28, 0.25)'
            }}
          >
            <span>➕</span> Register New Client
          </button>
        </div>
      </div>

      {/* Notifications / Feedback */}
      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            border: '1px solid #A7F3D0',
            fontSize: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>✅</span> {feedback}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FECACA',
            fontSize: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>⚠️</span> {error}
        </div>
      )}

      {/* 4 Financial KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Card 1: Total Clients */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Registered Clients
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
            {aggregates.totalClients}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
            Active corporate & regular khata accounts
          </div>
        </div>

        {/* Card 2: Total Billed */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Billed / Consumed
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0284C7', marginTop: '6px' }}>
            ₹{aggregates.totalBilled.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
            Lifetime cumulative orders logged
          </div>
        </div>

        {/* Card 3: Total Paid */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Payments Settled
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#16A34A', marginTop: '6px' }}>
            ₹{aggregates.totalPaid.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
            Cleared via Cash, UPI, and Bank
          </div>
        </div>

        {/* Card 4: Total Overdue */}
        <div
          style={{
            backgroundColor: aggregates.totalOverdue > 0 ? '#FEF2F2' : '#F0FDF4',
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${aggregates.totalOverdue > 0 ? '#FECACA' : '#BBF7D0'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: aggregates.totalOverdue > 0 ? '#991B1B' : '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Outstanding Overdue
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: aggregates.totalOverdue > 0 ? '#DC2626' : '#16A34A', marginTop: '6px' }}>
            ₹{aggregates.totalOverdue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: aggregates.totalOverdue > 0 ? '#B91C1C' : '#15803D', marginTop: '4px' }}>
            {aggregates.overdueCount} {aggregates.overdueCount === 1 ? 'account' : 'accounts'} with balance due
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 320px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
                fontSize: '15px'
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by client name, mobile, company, floor, PIN, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Filter:</span>
          {(['ALL', 'OVERDUE', 'SETTLED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                border: statusFilter === filter ? '1px solid #C45A1C' : '1px solid #E2E8F0',
                backgroundColor: statusFilter === filter ? '#FFF7ED' : '#FFFFFF',
                color: statusFilter === filter ? '#C45A1C' : '#475569',
                cursor: 'pointer'
              }}
            >
              {filter === 'ALL' ? 'All Clients' : filter === 'OVERDUE' ? '⚠️ Overdue Only' : '✅ Fully Settled'}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontWeight: 600 }}>Loading client accounts and PINs...</div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1E293B', fontSize: '18px' }}>No Clients Found</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748B' }}>
              {searchQuery ? 'No client matches your search filter.' : 'Register your first corporate or canteen khata account to generate an access PIN.'}
            </p>
            <button
              onClick={handleOpenCreateModal}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#C45A1C',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ➕ Register Client
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Client & Company</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Mobile / WhatsApp</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'center' }}>Generated Access PIN</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Total Billed</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Total Paid</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Balance Due</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const isOverdue = (client.balance_due || 0) > 0;
                  const isCopied = copiedKey === `pin-${client.id}`;

                  return (
                    <tr
                      key={client.id}
                      onClick={() => handleViewStatement(client)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Name & Company */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '15px' }}>
                          {client.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                          {client.company_name && (
                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                              🏢 {client.company_name}
                            </span>
                          )}
                          {client.floor_unit && (
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#F1F5F9',
                                color: '#475569',
                                fontWeight: 500
                              }}
                            >
                              📍 {client.floor_unit}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '16px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#1E293B', fontWeight: 500 }}>
                          {client.phone}
                        </div>
                        <a
                          href={`https://wa.me/91${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${client.name}! Here is your Chaiwale Khata Access PIN: ${client.client_pin}. Check your live balance and bill at: https://chaiwale.co/check-bill`)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: '12px',
                            color: '#16A34A',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px',
                            fontWeight: 500
                          }}
                        >
                          <span>💬</span> WhatsApp PIN
                        </a>
                      </td>

                      {/* Generated PIN Badge */}
                      <td style={{ padding: '16px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '15px',
                              fontWeight: 700,
                              letterSpacing: '0.12em',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#FFF7ED',
                              color: '#9A3412',
                              border: '1px solid #FDBA74',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                          >
                            {client.client_pin || 'NO PIN'}
                          </span>

                          <button
                            title="Copy PIN to clipboard"
                            onClick={() => handleCopyText(client.client_pin || '', `pin-${client.id}`)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: isCopied ? '#DCFCE7' : '#FFFFFF',
                              color: isCopied ? '#166534' : '#475569',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all 0.15s'
                            }}
                          >
                            {isCopied ? 'Copied!' : '📋'}
                          </button>

                          <button
                            title="Regenerate Access PIN"
                            onClick={(e) => handleRegeneratePin(client, e)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#475569',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            🔄
                          </button>
                        </div>
                      </td>

                      {/* Total Billed */}
                      <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                        ₹{(client.total_consumption || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Total Paid */}
                      <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                        ₹{(client.total_payments || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Overdue / Balance Due */}
                      <td style={{ padding: '16px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 700,
                            backgroundColor: isOverdue ? '#FEE2E2' : '#DCFCE7',
                            color: isOverdue ? '#DC2626' : '#15803D',
                            border: `1px solid ${isOverdue ? '#FCA5A5' : '#86EFAC'}`
                          }}
                        >
                          {isOverdue ? `₹${(client.balance_due || 0).toLocaleString('en-IN')} Overdue` : '₹0 Settled'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            title="View Statement & Bills"
                            onClick={() => handleViewStatement(client)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              color: '#0F172A',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            👁️ Bill Details
                          </button>

                          <button
                            title="Add Bill Entry"
                            onClick={(e) => handleOpenAddEntry(client, e)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              color: '#C45A1C',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            ➕ Bill
                          </button>

                          <button
                            title="Record Payment"
                            onClick={(e) => handleOpenPayment(client, e)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              color: '#16A34A',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            💳 Pay
                          </button>

                          <button
                            title="Edit Client"
                            onClick={() => handleOpenEditModal(client)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              color: '#64748B',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            ✏️
                          </button>

                          <button
                            title="Delete Client"
                            onClick={(e) => handleDeleteClient(client, e)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #FECACA',
                              color: '#DC2626',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️
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

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW STATEMENT & DETAILED BILLS (When Clicking on Client)        */}
      {/* ========================================================================= */}
      {selectedClientForStatement && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedClientForStatement(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '860px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '24px 28px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                backgroundColor: '#FAF5F0'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                    {selectedClientForStatement.name}
                  </h2>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      color: '#9A3412',
                      border: '1px solid #FDBA74'
                    }}
                  >
                    PIN: {selectedClientForStatement.client_pin}
                  </span>
                  <button
                    onClick={() => handleCopyText(selectedClientForStatement.client_pin || '', 'modal-pin')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: '1px solid #CBD5E1',
                      backgroundColor: copiedKey === 'modal-pin' ? '#DCFCE7' : '#FFFFFF',
                      color: copiedKey === 'modal-pin' ? '#166534' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedKey === 'modal-pin' ? 'Copied PIN!' : 'Copy PIN'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '13px', color: '#64748B' }}>
                  <span>📱 {selectedClientForStatement.phone}</span>
                  {selectedClientForStatement.company_name && <span>🏢 {selectedClientForStatement.company_name}</span>}
                  {selectedClientForStatement.floor_unit && <span>📍 {selectedClientForStatement.floor_unit}</span>}
                </div>
              </div>

              <button
                onClick={() => setSelectedClientForStatement(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Financial Summary Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                padding: '16px 28px',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                gap: '16px'
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Total Consumption
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                  ₹{(statementData?.totalConsumption ?? selectedClientForStatement.total_consumption ?? 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Total Paid
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#16A34A', marginTop: '4px' }}>
                  ₹{(statementData?.totalPayments ?? selectedClientForStatement.total_payments ?? 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Balance Due / Overdue
                </div>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: (statementData?.balanceDue ?? selectedClientForStatement.balance_due ?? 0) > 0 ? '#DC2626' : '#16A34A',
                    marginTop: '4px'
                  }}
                >
                  ₹{(statementData?.balanceDue ?? selectedClientForStatement.balance_due ?? 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Modal Quick Actions */}
            <div
              style={{
                padding: '14px 28px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setActiveTab('entries')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: activeTab === 'entries' ? '#C45A1C' : '#E2E8F0',
                    color: activeTab === 'entries' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  🍲 Bills / Consumption ({statementData?.entries?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('payments')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: activeTab === 'payments' ? '#C45A1C' : '#E2E8F0',
                    color: activeTab === 'payments' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  💳 Payment History ({statementData?.payments?.length || 0})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleOpenAddEntry(selectedClientForStatement)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#C45A1C',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Add Item
                </button>

                <button
                  onClick={() => handleOpenPayment(selectedClientForStatement)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#16A34A',
                    cursor: 'pointer'
                  }}
                >
                  💳 Record Pay
                </button>

                {statementData?.whatsappText && (
                  <button
                    onClick={() => handleCopyText(statementData.whatsappText, 'wa-text')}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: copiedKey === 'wa-text' ? '#DCFCE7' : '#16A34A',
                      color: copiedKey === 'wa-text' ? '#166534' : '#FFFFFF',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {copiedKey === 'wa-text' ? 'Copied WhatsApp Bill!' : '📲 Copy WhatsApp Bill'}
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body Content */}
            <div style={{ padding: '24px 28px', flex: 1, minHeight: '300px' }}>
              {loadingStatement ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                  ⏳ Loading statement details...
                </div>
              ) : activeTab === 'entries' ? (
                <div>
                  {(!statementData?.entries || statementData.entries.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>🍲</div>
                      <p style={{ margin: 0 }}>No consumption or bill entries found for this client yet.</p>
                      <button
                        onClick={() => handleOpenAddEntry(selectedClientForStatement)}
                        style={{
                          marginTop: '12px',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          backgroundColor: '#C45A1C',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ➕ Add First Consumption Entry
                      </button>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px' }}>Date</th>
                          <th style={{ padding: '10px 12px' }}>Item Description</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Unit Price</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '10px 12px' }}>Notes</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center' }}>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementData.entries.map((ent) => (
                          <tr key={ent.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 12px', color: '#64748B' }}>{ent.date}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>{ent.item_name}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#334155' }}>{ent.quantity}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748B' }}>₹{ent.unit_price}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>₹{ent.total_amount}</td>
                            <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: '12px' }}>{ent.notes || '-'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeleteEntry(ent.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  fontSize: '14px'
                                }}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div>
                  {(!statementData?.payments || statementData.payments.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>💳</div>
                      <p style={{ margin: 0 }}>No payments recorded yet for this client.</p>
                      <button
                        onClick={() => handleOpenPayment(selectedClientForStatement)}
                        style={{
                          marginTop: '12px',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        💳 Record Payment
                      </button>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px' }}>Date</th>
                          <th style={{ padding: '10px 12px' }}>Payment Mode</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount Paid</th>
                          <th style={{ padding: '10px 12px' }}>Notes / Reference</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center' }}>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementData.payments.map((pay) => (
                          <tr key={pay.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 12px', color: '#64748B' }}>{pay.date}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#E0F2FE',
                                  color: '#0369A1',
                                  fontWeight: 600
                                }}
                              >
                                {pay.payment_mode}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#16A34A' }}>
                              ₹{pay.amount.toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: '12px' }}>{pay.notes || '-'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeletePayment(pay.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  fontSize: '14px'
                                }}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 28px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC'
              }}
            >
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Customer can view this on <strong style={{ color: '#0F172A' }}>/check-bill</strong> using phone & PIN
              </div>
              <button
                onClick={() => setSelectedClientForStatement(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTER / EDIT CLIENT MODAL                                     */}
      {/* ========================================================================= */}
      {showClientModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowClientModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSaveClient}>
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FAF5F0'
                }}
              >
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
                  {editingClient ? '✏️ Edit Client Account' : '➕ Register New Client'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Client / Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Mobile / Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Mobile / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Company Name & Floor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TCS / Tech Mahindra"
                      value={clientForm.company_name}
                      onChange={(e) => setClientForm({ ...clientForm, company_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Floor / Unit / Cabin
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Floor 3, Bay B"
                      value={clientForm.floor_unit}
                      onChange={(e) => setClientForm({ ...clientForm, floor_unit: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Client PIN Display / Generator */}
                {!editingClient && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Auto-Generated Access PIN (4 numerical digits)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        placeholder="e.g. 4829"
                        value={clientForm.client_pin}
                        onChange={(e) => setClientForm({ ...clientForm, client_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '18px',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          letterSpacing: '0.2em',
                          backgroundColor: '#FFF7ED',
                          color: '#9A3412',
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setClientForm({ ...clientForm, client_pin: generateRandomPin() })}
                        style={{
                          padding: '9px 14px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🎲 Randomize
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                      Customer will use this 4-digit numerical PIN with their phone number on the bill checker portal.
                    </span>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Regular morning chai, bi-weekly billing"
                    value={clientForm.notes}
                    onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  backgroundColor: '#F8FAFC'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClient}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#C45A1C',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {savingClient ? 'Saving...' : editingClient ? 'Update Client' : 'Create Client & PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUICK ADD BILL / CONSUMPTION ENTRY                               */}
      {/* ========================================================================= */}
      {showAddEntryModal && entryTargetClient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowAddEntryModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSaveEntry}>
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FAF5F0'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1E293B' }}>
                    ➕ Add Bill Entry
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>For {entryTargetClient.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddEntryModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={entryForm.date}
                    onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Item / Service Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Masala Chai (Kulhad) or Bun Maska"
                    value={entryForm.item_name}
                    onChange={(e) => setEntryForm({ ...entryForm, item_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={entryForm.quantity}
                      onChange={(e) => setEntryForm({ ...entryForm, quantity: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Unit Price (₹) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={entryForm.unit_price}
                      onChange={(e) => setEntryForm({ ...entryForm, unit_price: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Calculated Total:</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                    ₹{entryForm.quantity * entryForm.unit_price}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Delivered to 3rd floor meeting"
                    value={entryForm.notes}
                    onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  backgroundColor: '#F8FAFC'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddEntryModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEntry}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#C45A1C',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {savingEntry ? 'Adding...' : 'Add to Khata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RECORD PAYMENT MODAL                                             */}
      {/* ========================================================================= */}
      {showPaymentModal && paymentTargetClient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '460px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSavePayment}>
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FAF5F0'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1E293B' }}>
                    💳 Record Payment
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>From {paymentTargetClient.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: paymentTargetClient.balance_due > 0 ? '#FEF2F2' : '#F0FDF4',
                    border: `1px solid ${paymentTargetClient.balance_due > 0 ? '#FECACA' : '#BBF7D0'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Current Overdue Balance:</span>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: paymentTargetClient.balance_due > 0 ? '#DC2626' : '#16A34A'
                    }}
                  >
                    ₹{paymentTargetClient.balance_due.toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#16A34A',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Direct Bank Transfer / NEFT</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Reference / Transaction ID / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref #489123 or Settled at counter"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  backgroundColor: '#F8FAFC'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {savingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
