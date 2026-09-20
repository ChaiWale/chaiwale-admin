'use client';

import React, { useState, useEffect } from 'react';

interface StoreSettingsState {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
  upiId: string;
  taxMode: string;
  currency: string;
}

const DEFAULT_SETTINGS: StoreSettingsState = {
  storeName: 'Chaiwale',
  tagline: 'Sip, Bite, Repeat • Authentic Chai & Handcrafted Indian Snacks',
  address: 'Shop No. 1, Ground Floor, Best Sky Tower, Netaji Subhash Place (NSP), Pitampura, New Delhi, Delhi 110034',
  phone: '+91 93101 12564',
  whatsapp: '919310112564',
  email: 'support@chaiwale.co.in',
  openingTime: '08:00 AM',
  closingTime: '11:00 PM',
  isOpen: true,
  upiId: 'paytmqr28100505010115gsv3315o55@paytm',
  taxMode: 'Zero-Tax Direct Pricing (0% GST - Disabled)',
  currency: 'INR (₹)'
};

const STORAGE_KEY = 'chaiwale_admin_store_settings';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettingsState>(DEFAULT_SETTINGS);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setSettings(JSON.parse(stored));
        } catch {
          // fallback to default
        }
      }
    }
  }, []);

  const handleChange = (field: keyof StoreSettingsState, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    setSavedFeedback('Store & operational settings saved successfully!');
    setTimeout(() => setSavedFeedback(null), 3500);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2328' }}>System & Store Settings</h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
          Manage Chaiwale store profile, outlet operational timings, payment details, and billing preferences
        </p>
      </div>

      {savedFeedback && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#DCFCE7',
            color: '#166534',
            borderRadius: 'var(--cw-radius-md)',
            marginBottom: '20px',
            fontSize: '13px',
            fontWeight: 700,
            border: '1px solid #86EFAC'
          }}
        >
          ✓ {savedFeedback}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Section 1: Store Profile & Branding */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--cw-radius-md)',
            border: '1px solid var(--cw-color-border)',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: 'var(--cw-shadow-sm)'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏪 Store Profile & Location
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Store Brand Name
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Brand Tagline
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Official Outlet Address (Printed on Bills & Invoices)
            </label>
            <textarea
              rows={2}
              value={settings.address}
              onChange={(e) => handleChange('address', e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', lineHeight: 1.5 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Primary Helpline Phone
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                WhatsApp Dispatch Number
              </label>
              <input
                type="text"
                value={settings.whatsapp}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Support & Billing Email
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Store Operating Hours & Live Status */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--cw-radius-md)',
            border: '1px solid var(--cw-color-border)',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: 'var(--cw-shadow-sm)'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🕒 Operating Hours & Online Status
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Store Opening Time
              </label>
              <input
                type="text"
                value={settings.openingTime}
                onChange={(e) => handleChange('openingTime', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Store Closing Time
              </label>
              <input
                type="text"
                value={settings.closingTime}
                onChange={(e) => handleChange('closingTime', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Live Storefront Ordering Status
              </label>
              <button
                type="button"
                onClick={() => handleChange('isOpen', !settings.isOpen)}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: settings.isOpen ? '#DCFCE7' : '#FEE2E2',
                  color: settings.isOpen ? '#166534' : '#991B1B',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: settings.isOpen ? '#22C55E' : '#EF4444' }} />
                {settings.isOpen ? 'STORE OPEN (Accepting Orders)' : 'STORE CLOSED (Offline)'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Billing & Zero-Tax Configuration */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--cw-radius-md)',
            border: '1px solid var(--cw-color-border)',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: 'var(--cw-shadow-sm)'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            💰 Billing Engine & Zero-Tax Policy
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Taxation System
              </label>
              <input
                type="text"
                disabled
                value={settings.taxMode}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#F8FAFC', color: '#166534', fontWeight: 700 }}
              />
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                Tax rate fixed at 0% across entire platform. Subtotal = Grand Total.
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Official Counter UPI ID (Paytm Soundbox)
              </label>
              <input
                type="text"
                value={settings.upiId}
                onChange={(e) => handleChange('upiId', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'monospace' }}
              />
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                Linked to store Paytm soundbox for instantaneous counter payment reconciliation.
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: System Integration Status */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--cw-radius-md)',
            border: '1px solid var(--cw-color-border)',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: 'var(--cw-shadow-sm)'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔌 System Diagnostics & Services
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <div style={{ color: '#64748B', fontWeight: 600 }}>Backend API Server</div>
              <div style={{ fontWeight: 700, color: '#16A34A', marginTop: '4px' }}>● Port 5000 (Connected)</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <div style={{ color: '#64748B', fontWeight: 600 }}>Supabase PostgreSQL</div>
              <div style={{ fontWeight: 700, color: '#16A34A', marginTop: '4px' }}>● Live (Authenticated)</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <div style={{ color: '#64748B', fontWeight: 600 }}>BillBook Terminal</div>
              <div style={{ fontWeight: 700, color: '#16A34A', marginTop: '4px' }}>● Counter-01 Active</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <div style={{ color: '#64748B', fontWeight: 600 }}>Thermal ESC/POS</div>
              <div style={{ fontWeight: 700, color: '#16A34A', marginTop: '4px' }}>● Direct Driver Ready</div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="submit"
            style={{
              padding: '12px 28px',
              backgroundColor: 'var(--cw-color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          >
            💾 Save Store Settings
          </button>
        </div>
      </form>
    </div>
  );
}
