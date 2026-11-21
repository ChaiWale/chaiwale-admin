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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isStoreOnline, setIsStoreOnline] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cw_store_online');
      if (saved !== null) setIsStoreOnline(saved === 'true');
    } catch {}
  }, []);

  const toggleStoreStatus = () => {
    const next = !isStoreOnline;
    setIsStoreOnline(next);
    try {
      localStorage.setItem('cw_store_online', String(next));
    } catch {}
  };

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

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
    ? [{ label: 'Menu Management', href: '/menu', icon: '📋' }]
    : [
        { label: 'Orders', href: '/orders', icon: '🛎️' },
        { label: 'Menu', href: '/menu', icon: '📋' },
        { label: 'Dashboard', href: '/', icon: '📊' },
        { label: 'Invoices', href: '/invoices', icon: '🧾' },
        { label: 'Customer Ledgers', href: '/ledger', icon: '📑' },
        { label: 'Sales & Statements', href: '/statements', icon: '📈' },
        { label: 'Clients & Khata', href: '/clients', icon: '👥' },
        { label: 'Catering Leads', href: '/catering', icon: '🎪' },
        { label: 'Staff Attendance', href: '/attendance', icon: '📅' },
        { label: 'Settings', href: '/settings', icon: '⚙️' }
      ];

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Operations Dashboard';
    if (path.startsWith('/clients')) return 'Client Accounts & Access PINs';
    if (path.startsWith('/invoices')) return 'Invoices & Billing History';
    if (path.startsWith('/ledger')) return 'Customer & Corporate Ledgers';
    if (path.startsWith('/statements')) return 'Sales Statements & Registers';
    if (path.startsWith('/orders')) return 'Orders Manager';
    if (path.startsWith('/menu')) return 'Menu Catalog & Availability';
    if (path.startsWith('/catering')) return 'Catering Inquiries & Pipeline';
    if (path.startsWith('/attendance')) return 'Staff Attendance Roster';
    if (path.startsWith('/settings')) return 'System & Store Settings';
    return 'Operations Hub';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: '#F8FAFC' }}>
      {/* Left Clean White Sidebar (Zomato Partner Style) */}
      <aside
        className="admin-sidebar-desktop"
        style={{
          width: '230px',
          backgroundColor: '#FFFFFF',
          color: '#334155',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: '1px solid #E2E8F0'
        }}
      >
        {/* Logo & Brand Header */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid #F1F5F9'
          }}
        >
          <img
            src="/assets/chaiwale-logo.jpeg"
            alt="Chaiwale"
            style={{ height: '36px', width: '36px', borderRadius: '8px', objectFit: 'cover' }}
          />
          <div>
            <strong
              style={{
                color: '#0F172A',
                fontSize: '17px',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                display: 'block'
              }}
            >
              Chaiwale
            </strong>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              Admin Dashboard
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
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
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#0F172A' : '#475569',
                  backgroundColor: isActive ? '#F1F5F9' : 'transparent',
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
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {mobileDrawerOpen && (
        <div
          className="admin-sidebar-mobile-drawer"
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '260px',
              maxWidth: '80%',
              backgroundColor: '#1E2328',
              color: '#CBD5E1',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
              animation: 'slideInLeft 0.2s ease-out'
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F1F5F9'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src="/assets/chaiwale-logo.jpeg"
                  alt="Chaiwale"
                  style={{ height: '32px', width: '32px', borderRadius: '6px', objectFit: 'cover' }}
                />
                <strong style={{ color: '#0F172A', fontSize: '16px', fontWeight: 800 }}>Chaiwale</strong>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto' }}>
              {navItems.map((item, idx) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#0F172A' : '#475569',
                      backgroundColor: isActive ? '#F1F5F9' : 'transparent',
                      textDecoration: 'none'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Dashboard Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Operational Bar (Zomato Partner Style) */}
        <header
          style={{
            height: '60px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="admin-mobile-menu-btn"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open mobile menu"
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '15px',
                cursor: 'pointer',
                color: '#334155'
              }}
            >
              ☰
            </button>
            <span
              className="admin-header-title"
              style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}
            >
              {getPageTitle(pathname)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px' }}>
            {/* Zomato Store Online / Offline Toggle Pill */}
            <button
              type="button"
              onClick={toggleStoreStatus}
              title={isStoreOnline ? 'Outlet is Online (Accepting Orders). Click to switch to Offline.' : 'Outlet is Offline (Paused). Click to switch to Online.'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: `1.5px solid ${isStoreOnline ? '#16A34A' : '#DC2626'}`,
                backgroundColor: isStoreOnline ? '#F0FDF4' : '#FEF2F2',
                color: isStoreOnline ? '#15803D' : '#B91C1C',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isStoreOnline ? '#16A34A' : '#DC2626' }} />
              {isStoreOnline ? 'Online ▾' : 'Offline ▾'}
            </button>

            <AdminHeaderUser />
          </div>
        </header>

        <main className="admin-main-content" style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      <style jsx global>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

