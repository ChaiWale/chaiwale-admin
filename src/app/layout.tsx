import type { Metadata } from 'next';
import React from 'react';
import AdminShell from '../components/AdminShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chaiwale Admin | Operations Dashboard',
  description: 'Internal Operations Dashboard for Chaiwale Management',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  },
  icons: {
    icon: '/assets/chaiwale-logo.jpeg',
    apple: '/assets/chaiwale-logo.jpeg'
  }
};

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/jpeg" href="/assets/chaiwale-logo.jpeg" />
      </head>
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', fontFamily: 'var(--cw-font-base, "Inter", sans-serif)' }}>
        <AdminShell>
          {children}
        </AdminShell>
      </body>
    </html>
  );
}
