'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin, clearStoredSession } from '../../services/admin-api.client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('expired') === 'true') {
        setSessionExpiredNotice(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginAdmin(email, password);

      // 1. Billing account is strictly for BillBook POS, blocked in Admin Panel
      if (res.user.email?.toLowerCase().includes('bills@') || email.toLowerCase().includes('bills@')) {
        clearStoredSession();
        setErrorMessage('Access Denied: Billing accounts can only access the BillBook POS Terminal.');
        return;
      }

      // 2. Customer accounts cannot access operational portal
      if (res.user.role === 'customer') {
        clearStoredSession();
        setErrorMessage('Access denied: Customer accounts cannot access the operational portal.');
        return;
      }

      // 3. Orders account in Admin Panel has access ONLY to Menu Management
      if (res.user.email?.toLowerCase().includes('orders@') || email.toLowerCase().includes('orders@')) {
        router.push('/menu');
        return;
      }

      router.push('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        padding: '36px 32px'
      }}
    >
      {/* Header Branding with Approved Official Logo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img
          src="/assets/chaiwale-logo.jpeg"
          alt="Chaiwale Logo"
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '10px',
            objectFit: 'cover',
            margin: '0 auto 12px',
            display: 'block',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        />
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2328', margin: 0, letterSpacing: '0.04em' }}>Admin</h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', marginBottom: 0 }}>
          Operations &amp; Staff Portal
        </p>
      </div>

      {/* Session Expired / Re-authentication notice */}
      {sessionExpiredNotice && !errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            border: '1px solid #BFDBFE',
            borderRadius: 'var(--cw-radius-md)',
            marginBottom: '18px',
            fontSize: '12px',
            lineHeight: 1.4
          }}
        >
          ℹ️ Session authentication required. Please sign in to access the operational hub.
        </div>
      )}

      {/* Error notification */}
      {errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            border: '1px solid #FECACA',
            borderRadius: 'var(--cw-radius-md)',
            marginBottom: '18px',
            fontSize: '12px',
            lineHeight: 1.4
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '6px'
              }}
            >
              Staff / Manager Email
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="e.g. staff.auth@desk-portal.net"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--cw-radius-md)',
                border: '1px solid var(--cw-color-border)',
                fontSize: '14px',
                backgroundColor: '#F8FAFC'
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '6px'
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--cw-radius-md)',
                border: '1px solid var(--cw-color-border)',
                fontSize: '14px',
                backgroundColor: '#F8FAFC'
              }}
            />
          </div>


          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--cw-color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--cw-shadow-sm)',
              transition: 'background-color 0.15s'
            }}
          >
            {loading ? 'Verifying Credentials...' : 'Sign In to Portal'}
          </button>
        </form>

        <div
          style={{
            marginTop: '24px',
            borderTop: '1px solid var(--cw-color-border)',
            paddingTop: '16px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#94A3B8'
          }}
        >
          Protected by Encrypted Token Authentication & Role-Based Access Control
        </div>
      </div>
  );
}
