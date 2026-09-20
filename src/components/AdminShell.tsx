'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminHeaderUser from './AdminHeaderUser';
import { getStoredAuthToken, getStoredAuthUser } from '../services/admin-api.client';

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const isLoginPage = pathname === '/login';

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const token = getStoredAuthToken();
    const user = getStoredAuthUser();
    setCurrentUser(user);

    if (isLoginPage) {
      // If user is already authenticated and visits /login, send them to dashboard or /menu
      if (token && user) {
        if (user.email?.toLowerCase().includes('orders@')) {
          router.replace('/menu');
        } else {
          router.replace('/');
        }
      } else {
        setIsAuthenticated(false);
      }
    } else {
      // Protected routes require valid auth
      if (!token || !user) {
        setIsAuthenticated(false);
        router.replace('/login');
      } else {
        // Enforce RBAC: Orders staff can ONLY access /menu
        if (user.email?.toLowerCase().includes('orders@') && !pathname.startsWith('/menu')) {
          router.replace('/menu');
          return;
        }
        setIsAuthenticated(true);
      }
    }
  }, [pathname, isLoginPage, router]);

  // 1. DEDICATED LOGIN SCREEN (No Admin Sidebar, No Dashboard Header)
  if (isLoginPage) {
    return (
      <main
        style={{
          minHeight: '100vh',
          width: '100%',
          backgroundColor: '#0F172A',
          backgroundImage: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(111, 67, 42, 0.3), rgba(15, 23, 42, 1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        {children}
      </main>
    );
  }

  // 2. CHECKING AUTHENTICATION SPLASH
  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          backgroundColor: '#1E2328',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: '#FFFFFF'
        }}
      >
        <img
          src="/assets/chaiwale-logo.jpeg"
          alt="Chaiwale"
          style={{ width: '54px', height: '54px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        />
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#E2E8F0', letterSpacing: '0.02em' }}>
          Verifying Operational Credentials...
        </div>
      </div>
    );
  }

  // 3. AUTHENTICATED DASHBOARD SHELL (Sidebar + Top Bar + Content)
  const isOrdersStaff = currentUser?.email?.toLowerCase().includes('orders@');

  const navItems = isOrdersStaff
    ? [{ label: 'Menu Management', href: '/menu', icon: '🍲' }]
    : [
        { label: 'Dashboard', href: '/', icon: '📊' },
        { label: 'Invoices', href: '/invoices', icon: '🧾' },
        { label: 'Customer Ledgers', href: '/ledger', icon: '📑' },
        { label: 'Statements & Sales', href: '/statements', icon: '📈' },
        { label: 'Live Orders', href: '/orders', icon: '📦' },
        { label: 'Menu Management', href: '/menu', icon: '🍲' },
        { label: 'Catering Leads', href: '/catering', icon: '📋' },
        { label: 'Staff Attendance', href: '/attendance', icon: '📅' },
        { label: 'Settings', href: '/settings', icon: '⚙️' }
      ];

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Operations Dashboard';
    if (path.startsWith('/invoices')) return 'Invoices & Billing History';
    if (path.startsWith('/ledger')) return 'Customer & Corporate Ledgers';
    if (path.startsWith('/statements')) return 'Sales Statements & Registers';
    if (path.startsWith('/orders')) return 'Live Orders & Status';
    if (path.startsWith('/menu')) return 'Menu Catalog & Availability';
    if (path.startsWith('/catering')) return 'Catering Inquiries & Pipeline';
    if (path.startsWith('/attendance')) return 'Staff Attendance Roster';
    if (path.startsWith('/settings')) return 'System & Store Settings';
    return 'Operations Hub';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: '#F4F6F8' }}>
      {/* Left Dark Sidebar */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#1E2328',
          color: '#CBD5E1',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: '1px solid #2D3748'
        }}
      >
        {/* Logo & Brand Header */}
        <div
          style={{
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid #2D3748'
          }}
        >
          <img
            src="/assets/chaiwale-logo.jpeg"
            alt="Chaiwale"
            style={{ height: '36px', width: '36px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <div>
            <strong
              style={{
                fontFamily: 'var(--cw-font-heading)',
                color: '#FFFFFF',
                fontSize: '16px',
                letterSpacing: '0.04em',
                display: 'block'
              }}
            >
              CHAIWALE
            </strong>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Operations Hub</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map((item, idx) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={idx}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: isActive ? '#2D3748' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--cw-color-accent)' : '3px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Store Indicator */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #2D3748', fontSize: '11px', color: '#64748B' }}>
          <span>Outlet: <strong style={{ color: '#94A3B8' }}>Netaji Subhash Place (NSP)</strong></span>
        </div>
      </aside>

      {/* Main Dashboard Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Operational Bar */}
        <header
          style={{
            height: '60px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--cw-color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--cw-font-heading)', color: '#1E293B' }}>
              {getPageTitle(pathname)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '13px' }}>
            <span style={{ color: 'var(--cw-color-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', display: 'inline-block' }} />
              Operational Live
            </span>
            <AdminHeaderUser />
          </div>
        </header>

        <main style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
