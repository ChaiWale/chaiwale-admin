'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStoredAuthUser, logoutAdmin, AdminUserDto } from '../services/admin-api.client';

export default function AdminHeaderUser() {
  const [user, setUser] = useState<AdminUserDto | null>(null);

  useEffect(() => {
    setUser(getStoredAuthUser());
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        style={{
          padding: '6px 14px',
          backgroundColor: 'var(--cw-color-primary)',
          color: '#FFFFFF',
          borderRadius: 'var(--cw-radius-md)',
          fontSize: '12px',
          fontWeight: 700,
          textDecoration: 'none'
        }}
      >
        Sign In
      </Link>
    );
  }

  const roleColors: Record<string, { bg: string; color: string }> = {
    admin: { bg: '#FEE2E2', color: '#991B1B' },
    manager: { bg: '#EDE9FE', color: '#6D28D9' },
    staff: { bg: '#E0F2FE', color: '#0369A1' }
  };

  const badge = roleColors[user.role] || { bg: '#F1F5F9', color: '#475569' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E2328' }}>{user.fullName || user.email}</div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: badge.bg,
            color: badge.color
          }}
        >
          {user.role}
        </span>
      </div>

      <button
        onClick={logoutAdmin}
        style={{
          padding: '6px 12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--cw-color-border)',
          borderRadius: 'var(--cw-radius-md)',
          fontSize: '12px',
          fontWeight: 600,
          color: '#DC2626',
          cursor: 'pointer'
        }}
        title="Sign Out"
      >
        Sign Out
      </button>
    </div>
  );
}
