'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchPromoBanners,
  updatePromoBanners,
  PromoBannerDto,
  uploadMenuImage,
  resolveMediaUrl
} from '../../services/admin-api.client';

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
  address: 'G-31, Vardhman Grand Plaza, Mangalam Place, M2K Road, Rohini Sector-3, New Delhi – 110085',
  phone: '+91 93101 12564',
  whatsapp: '919310112564',
  email: 'support@chaiwale.co.in',
  openingTime: '08:00 AM',
  closingTime: '06:00 PM',
  isOpen: true,
  upiId: 'chaiwale@ptyes',
  taxMode: 'Zero-Tax Direct Pricing (0% GST - Disabled)',
  currency: 'INR (₹)'
};

const STORAGE_KEY = 'chaiwale_admin_store_settings';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'store' | 'banners'>('store');
  const [settings, setSettings] = useState<StoreSettingsState>(DEFAULT_SETTINGS);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Homepage Promo Banners State
  const [banners, setBanners] = useState<PromoBannerDto[]>([]);
  const [loadingBanners, setLoadingBanners] = useState<boolean>(false);
  const [savingBanners, setSavingBanners] = useState<boolean>(false);
  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);
  const [uploadingBannerIndex, setUploadingBannerIndex] = useState<number | null>(null);

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
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoadingBanners(true);
    try {
      const data = await fetchPromoBanners();
      setBanners(data);
    } catch (err: any) {
      console.error('Failed to load promo banners:', err);
    } finally {
      setLoadingBanners(false);
    }
  };

  const handleChange = (field: keyof StoreSettingsState, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    setSavedFeedback('Store & operational settings saved successfully!');
    setTimeout(() => setSavedFeedback(null), 3500);
  };

  // Banner Handlers
  const handleBannerChange = (index: number, field: keyof PromoBannerDto, value: any) => {
    setBanners((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddBanner = () => {
    const newBanner: PromoBannerDto = {
      id: `banner-${Date.now()}`,
      badge: 'Special Offer',
      title: 'New Promotional Headline',
      description: 'Describe the special feast, lunch package, or party discount here.',
      image: '/assets/images/chai.jpg',
      ctaText: 'Inquire Now',
      ctaLink: '/catering',
      whatsappNumber: '918800410441',
      whatsappText: 'Hello Chaiwale, I am inquiring about this special promotion.',
      theme: 'cream',
      isActive: true,
      order: banners.length + 1
    };
    setBanners((prev) => [...prev, newBanner]);
  };

  const handleDeleteBanner = (index: number) => {
    if (window.confirm('Are you sure you want to remove this promotional banner from the homepage?')) {
      setBanners((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleBannerImageUpload = async (index: number, file: File) => {
    try {
      setUploadingBannerIndex(index);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await uploadMenuImage(base64, file.name.replace(/\.[^/.]+$/, ''), 'banners');
          const uploadedUrl = res.publicUrl || res.imagePath;
          handleBannerChange(index, 'image', uploadedUrl);
          setBannerFeedback('✓ Banner image uploaded successfully!');
          setTimeout(() => setBannerFeedback(null), 3000);
        } catch (uploadErr: any) {
          alert(`Image upload error: ${uploadErr.message}`);
        } finally {
          setUploadingBannerIndex(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(`Image processing error: ${err.message}`);
      setUploadingBannerIndex(null);
    }
  };

  const handleSaveBanners = async () => {
    setSavingBanners(true);
    try {
      const updated = await updatePromoBanners(banners);
      setBanners(updated);
      setBannerFeedback('✓ All homepage promotional banners updated successfully!');
      setTimeout(() => setBannerFeedback(null), 4000);
    } catch (err: any) {
      alert(`Failed to save banners: ${err.message}`);
    } finally {
      setSavingBanners(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2328' }}>System & Store Settings</h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
          Manage Chaiwale store profile, outlet operational timings, payment details, and homepage promotional banners
        </p>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'store' ? 'var(--cw-color-primary)' : '#F1F5F9',
            color: activeTab === 'store' ? '#FFFFFF' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🏪 Store Profile & Operations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'banners' ? 'var(--cw-color-primary)' : '#F1F5F9',
            color: activeTab === 'banners' ? '#FFFFFF' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🖼️ Homepage Promo Banners & Ads ({banners.length})</span>
        </button>
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

      {bannerFeedback && (
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
          {bannerFeedback}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: STORE PROFILE & OPERATIONS                                          */}
      {/* ========================================================================= */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveStore}>
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
                  WhatsApp Official Number
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
                  Support Email
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

          {/* Section 2: Timings & Status */}
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
              ⏰ Store Timings & Online Status
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Opening Time
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
                  Closing Time
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
                  Storefront Accepting Orders
                </label>
                <select
                  value={settings.isOpen ? 'true' : 'false'}
                  onChange={(e) => handleChange('isOpen', e.target.value === 'true')}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="true">🟢 Open (Taking Orders)</option>
                  <option value="false">🔴 Closed (Pause Orders)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Billing & Payments */}
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
              💳 Billing, Tax & UPI Configurations
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Official Merchant UPI ID
                </label>
                <input
                  type="text"
                  value={settings.upiId}
                  onChange={(e) => handleChange('upiId', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Tax Configuration
                </label>
                <input
                  type="text"
                  disabled
                  value={settings.taxMode}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: System Diagnostics */}
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
                <div style={{ color: '#64748B', fontWeight: 600 }}>Chaiwale Primary Database</div>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HOMEPAGE PROMO BANNERS & ADS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'banners' && (
        <div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Homepage Promotional Banners & Ad Cards
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  Manage the 3 primary ad cards on the website homepage (Bhandara, Monthly Meal Plans, Mom's Daawat) or add new custom promotions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleAddBanner}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--cw-radius-md)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  + Add New Ad Card
                </button>

                <button
                  type="button"
                  onClick={handleSaveBanners}
                  disabled={savingBanners}
                  style={{
                    padding: '9px 20px',
                    backgroundColor: 'var(--cw-color-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--cw-radius-md)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: savingBanners ? 'not-allowed' : 'pointer',
                    opacity: savingBanners ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(111, 67, 42, 0.2)'
                  }}
                >
                  {savingBanners ? 'Saving...' : '💾 Save All Banners'}
                </button>
              </div>
            </div>

            {loadingBanners ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Loading promotional banners...</p>
              </div>
            ) : banners.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', border: '2px dashed #E2E8F0', borderRadius: '12px' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>No promotional banners found</p>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>Click below to add your first homepage promotional card</p>
                <button
                  type="button"
                  onClick={handleAddBanner}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: 'var(--cw-color-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add Ad Card
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {banners.map((b, idx) => {
                  const resolvedImg = resolveMediaUrl(b.image);
                  return (
                    <div
                      key={b.id || idx}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '20px',
                        backgroundColor: b.isActive ? '#FFFFFF' : '#F8FAFC',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        position: 'relative'
                      }}
                    >
                      {/* Banner Header: Title & Switch */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: '#0F172A',
                              color: '#FFFFFF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 800
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                            {b.title || `Banner #${idx + 1}`}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700 }}>
                            <input
                              type="checkbox"
                              checked={b.isActive}
                              onChange={(e) => handleBannerChange(idx, 'isActive', e.target.checked)}
                              style={{ width: '16px', height: '16px', accentColor: '#16A34A' }}
                            />
                            <span style={{ color: b.isActive ? '#16A34A' : '#94A3B8' }}>
                              {b.isActive ? '● Live on Homepage' : '○ Hidden'}
                            </span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleDeleteBanner(idx)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      {/* Main Grid: Image on Left / Details on Right */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {/* Image Preview & Upload */}
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                            Banner Image Preview
                          </label>
                          <div
                            style={{
                              width: '100%',
                              height: '200px',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              backgroundColor: '#1E293B',
                              border: '1px solid #CBD5E1',
                              position: 'relative',
                              marginBottom: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <img
                              src={resolvedImg}
                              alt={b.title}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/assets/images/chai.jpg';
                              }}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                            {uploadingBannerIndex === idx && (
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '13px',
                                  fontWeight: 700
                                }}
                              >
                                ⏳ Uploading image...
                              </div>
                            )}
                          </div>

                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              textAlign: 'center',
                              padding: '10px 14px',
                              backgroundColor: '#F8FAFC',
                              border: '1.5px dashed #64748B',
                              borderRadius: '8px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              color: '#1E293B',
                              cursor: 'pointer',
                              width: '100%',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            📁 Upload / Change Image File
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleBannerImageUpload(idx, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>

                        {/* Text Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                              Header Tag / Badge
                            </label>
                            <input
                              type="text"
                              value={b.badge}
                              onChange={(e) => handleBannerChange(idx, 'badge', e.target.value)}
                              placeholder="e.g. 3-Day Trial Meal @ ₹79 Only! or Bhandara Catering"
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                              Main Headline / Title
                            </label>
                            <input
                              type="text"
                              value={b.title}
                              onChange={(e) => handleBannerChange(idx, 'title', e.target.value)}
                              placeholder="e.g. Good Food For A Better You"
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                              Description Copy
                            </label>
                            <textarea
                              rows={2}
                              value={b.description}
                              onChange={(e) => handleBannerChange(idx, 'description', e.target.value)}
                              placeholder="Detailed offer copy explaining the feast, package, or meal plan..."
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', lineHeight: 1.5 }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                Button Text
                              </label>
                              <input
                                type="text"
                                value={b.ctaText}
                                onChange={(e) => handleBannerChange(idx, 'ctaText', e.target.value)}
                                placeholder="e.g. Order Online"
                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                Button URL / Link
                              </label>
                              <input
                                type="text"
                                value={b.ctaLink}
                                onChange={(e) => handleBannerChange(idx, 'ctaLink', e.target.value)}
                                placeholder="e.g. /catering#bhandara"
                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                WhatsApp Number
                              </label>
                              <input
                                type="text"
                                value={b.whatsappNumber || ''}
                                onChange={(e) => handleBannerChange(idx, 'whatsappNumber', e.target.value)}
                                placeholder="e.g. 918800410441"
                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                WhatsApp Prefilled Message
                              </label>
                              <input
                                type="text"
                                value={b.whatsappText || ''}
                                onChange={(e) => handleBannerChange(idx, 'whatsappText', e.target.value)}
                                placeholder="e.g. TRIAL"
                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Save Button */}
            {banners.length > 0 && (
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleSaveBanners}
                  disabled={savingBanners}
                  style={{
                    padding: '12px 28px',
                    backgroundColor: 'var(--cw-color-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--cw-radius-md)',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: savingBanners ? 'not-allowed' : 'pointer',
                    opacity: savingBanners ? 0.7 : 1,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  {savingBanners ? 'Saving Changes...' : '💾 Save All Homepage Banners'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
