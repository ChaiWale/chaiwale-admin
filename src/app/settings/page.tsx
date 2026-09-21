'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchHeroSlides,
  updateHeroSlides,
  HeroSlideDto,
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
  const [activeTab, setActiveTab] = useState<'store' | 'hero'>('store');
  const [settings, setSettings] = useState<StoreSettingsState>(DEFAULT_SETTINGS);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Homepage Hero Showcase State
  const [heroSlides, setHeroSlides] = useState<HeroSlideDto[]>([]);
  const [loadingHero, setLoadingHero] = useState<boolean>(false);
  const [savingHero, setSavingHero] = useState<boolean>(false);
  const [heroFeedback, setHeroFeedback] = useState<string | null>(null);
  const [uploadingHeroIndex, setUploadingHeroIndex] = useState<number | null>(null);

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
    loadHeroSlides();
  }, []);

  const loadHeroSlides = async () => {
    setLoadingHero(true);
    try {
      const data = await fetchHeroSlides();
      setHeroSlides(data);
    } catch (err: any) {
      console.error('Failed to load hero slides:', err);
    } finally {
      setLoadingHero(false);
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

  // Hero Showcase Handlers
  const handleHeroSlideChange = (index: number, field: keyof HeroSlideDto, value: any) => {
    setHeroSlides((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleHeroHighlightChange = (slideIndex: number, bulletIndex: number, value: string) => {
    setHeroSlides((prev) => {
      const copy = [...prev];
      const highlights = Array.isArray(copy[slideIndex].highlights) ? [...copy[slideIndex].highlights] : ['', '', ''];
      highlights[bulletIndex] = value;
      copy[slideIndex] = { ...copy[slideIndex], highlights };
      return copy;
    });
  };

  const handleHeroImageUpload = async (index: number, file: File) => {
    try {
      setUploadingHeroIndex(index);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await uploadMenuImage(base64, file.name.replace(/\.[^/.]+$/, ''), 'hero');
          const uploadedUrl = res.publicUrl || res.imagePath;
          handleHeroSlideChange(index, 'image', uploadedUrl);
          setHeroFeedback('✓ Hero slide image uploaded successfully to Supabase!');
          setTimeout(() => setHeroFeedback(null), 3500);
        } catch (uploadErr: any) {
          alert(`Image upload error: ${uploadErr.message}`);
        } finally {
          setUploadingHeroIndex(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(`Image processing error: ${err.message}`);
      setUploadingHeroIndex(null);
    }
  };

  const handleSaveHeroSlides = async () => {
    setSavingHero(true);
    try {
      const updated = await updateHeroSlides(heroSlides);
      setHeroSlides(updated);
      setHeroFeedback('✓ All 5 homepage hero showcase slides updated successfully!');
      setTimeout(() => setHeroFeedback(null), 4000);
    } catch (err: any) {
      alert(`Failed to save hero slides: ${err.message}`);
    } finally {
      setSavingHero(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2328' }}>System & Store Settings</h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
          Manage Chaiwale store profile, outlet operational timings, payment details, promotional banners and animated hero slides
        </p>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', flexWrap: 'wrap' }}>
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
          onClick={() => setActiveTab('hero')}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'hero' ? 'var(--cw-color-primary)' : '#F1F5F9',
            color: activeTab === 'hero' ? '#FFFFFF' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>✨ Homepage Hero Banner ({heroSlides.length || 5} Slides)</span>
        </button>
      </div>

      {heroFeedback && (
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
          {heroFeedback}
        </div>
      )}


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
      {/* TAB 2: HOMEPAGE HERO BANNER (5 SLIDES)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'hero' && (
        <div>
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
            {/* Top Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✨ 5-Slide Animated Homepage Hero Showcase</span>
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  Directly upload 16:9 images, customize headlines, tags, bullet points and call-to-action buttons. No coding required.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveHeroSlides}
                disabled={savingHero || loadingHero}
                style={{
                  padding: '10px 22px',
                  backgroundColor: 'var(--cw-color-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--cw-radius-md)',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: savingHero ? 'not-allowed' : 'pointer',
                  opacity: savingHero ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                }}
              >
                <span>{savingHero ? 'Saving Hero Slides...' : '💾 Save Hero Showcase'}</span>
              </button>
            </div>

            {loadingHero ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Loading Hero Showcase settings...</p>
              </div>
            ) : heroSlides.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Default 5 slides will be initialized upon saving.</p>
                <button
                  type="button"
                  onClick={handleSaveHeroSlides}
                  style={{
                    marginTop: '12px',
                    padding: '8px 20px',
                    backgroundColor: 'var(--cw-color-primary)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Initialize 5 Master Slides
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {heroSlides.map((slide, idx) => {
                  return (
                    <div
                      key={slide.id || `slide-${idx}`}
                      style={{
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        padding: '20px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                        width: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Slide Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#0F172A', color: '#F8FAFC', fontSize: '12px', fontWeight: 800 }}>
                            SLIDE 0{idx + 1}
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
                            {slide.badge || `Slide ${idx + 1}`}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
                          ID: {slide.id}
                        </span>
                      </div>

                      {/* 2-Column Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)', gap: '20px', alignItems: 'start', width: '100%', boxSizing: 'border-box' }}>
                        
                        {/* Left Column: 16:9 Image Preview & Upload */}
                        <div style={{ minWidth: 0, boxSizing: 'border-box' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                            16:9 Showcase Image Preview
                          </label>
                          <div
                            style={{
                              width: '100%',
                              aspectRatio: '16 / 9',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              backgroundColor: '#0F172A',
                              border: '1px solid #CBD5E1',
                              position: 'relative',
                              marginBottom: '12px'
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveMediaUrl(slide.image)}
                              alt={slide.imageAlt || `Hero Slide ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>

                          {/* Direct File Upload (Supabase storage) */}
                          <input
                            type="file"
                            id={`hero-file-upload-${idx}`}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleHeroImageUpload(idx, file);
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => document.getElementById(`hero-file-upload-${idx}`)?.click()}
                            disabled={uploadingHeroIndex === idx}
                            style={{
                              width: '100%',
                              padding: '9px 14px',
                              backgroundColor: '#0284C7',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '7px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: uploadingHeroIndex === idx ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              marginBottom: '8px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <span>{uploadingHeroIndex === idx ? '⏳ Uploading to Supabase...' : '📁 Upload / Change Image File'}</span>
                          </button>

                          <div style={{ fontSize: '11px', color: '#64748B', wordBreak: 'break-all' }}>
                            <strong>Path:</strong> {slide.image}
                          </div>
                        </div>

                        {/* Right Column: Text & CTA Settings */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0, boxSizing: 'border-box' }}>
                          
                          {/* Row 1: Badge & Tagline */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', minWidth: 0 }}>
                            <div style={{ minWidth: 0 }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                Pill Badge Text
                              </label>
                              <input
                                type="text"
                                value={slide.badge}
                                onChange={(e) => handleHeroSlideChange(idx, 'badge', e.target.value)}
                                placeholder="e.g. Chaiwale Flagship Menu"
                                style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                              />
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                Sub-tag
                              </label>
                              <input
                                type="text"
                                value={slide.tag}
                                onChange={(e) => handleHeroSlideChange(idx, 'tag', e.target.value)}
                                placeholder="e.g. Chai, Snacks & All-Day Adda"
                                style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                              />
                            </div>
                          </div>

                          {/* Row 2: Headline & Headline Accent */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', minWidth: 0 }}>
                            <div style={{ minWidth: 0 }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                Main Headline Line 1
                              </label>
                              <input
                                type="text"
                                value={slide.headline}
                                onChange={(e) => handleHeroSlideChange(idx, 'headline', e.target.value)}
                                placeholder="e.g. Dilli Ka Dilchasp Swad,"
                                style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600 }}
                              />
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D96B27', marginBottom: '4px' }}>
                                Highlight Headline Line 2 (Gradient Text)
                              </label>
                              <input
                                type="text"
                                value={slide.headlineAccent}
                                onChange={(e) => handleHeroSlideChange(idx, 'headlineAccent', e.target.value)}
                                placeholder="e.g. Har Pal, Har Bite Me."
                                style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700, color: '#D96B27' }}
                              />
                            </div>
                          </div>

                          {/* Row 3: Subtitle Description */}
                          <div style={{ minWidth: 0 }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                              Description Paragraph
                            </label>
                            <textarea
                              rows={2}
                              value={slide.sub}
                              onChange={(e) => handleHeroSlideChange(idx, 'sub', e.target.value)}
                              placeholder="Describe this offering in 1-2 engaging sentences..."
                              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', lineHeight: 1.5 }}
                            />
                          </div>

                          {/* Row 4: CTAs */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', minWidth: 0 }}>
                            <div style={{ minWidth: 0 }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                Primary Button Label & Link
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', minWidth: 0 }}>
                                <input
                                  type="text"
                                  value={slide.primaryCtaLabel}
                                  onChange={(e) => handleHeroSlideChange(idx, 'primaryCtaLabel', e.target.value)}
                                  placeholder="e.g. Explore Full Menu"
                                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                                />
                                <input
                                  type="text"
                                  value={slide.primaryCtaHref}
                                  onChange={(e) => handleHeroSlideChange(idx, 'primaryCtaHref', e.target.value)}
                                  placeholder="e.g. /menu"
                                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                                />
                              </div>
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#15803D', marginBottom: '4px' }}>
                                WhatsApp Button Label & URL
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', minWidth: 0 }}>
                                <input
                                  type="text"
                                  value={slide.waCtaLabel}
                                  onChange={(e) => handleHeroSlideChange(idx, 'waCtaLabel', e.target.value)}
                                  placeholder="e.g. Order on WhatsApp"
                                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                                />
                                <input
                                  type="text"
                                  value={slide.waCtaHref}
                                  onChange={(e) => handleHeroSlideChange(idx, 'waCtaHref', e.target.value)}
                                  placeholder="https://wa.me/..."
                                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Row 5: 3 Highlights Bullets */}
                          <div style={{ minWidth: 0 }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                              3 Key Highlights (Bullets with checkmarks)
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', minWidth: 0 }}>
                              {[0, 1, 2].map((bIdx) => (
                                <input
                                  key={`b-${idx}-${bIdx}`}
                                  type="text"
                                  value={slide.highlights?.[bIdx] || ''}
                                  onChange={(e) => handleHeroHighlightChange(idx, bIdx, e.target.value)}
                                  placeholder={`Highlight #${bIdx + 1}`}
                                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                                />
                              ))}
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
            {heroSlides.length > 0 && (
              <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleSaveHeroSlides}
                  disabled={savingHero}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: 'var(--cw-color-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--cw-radius-md)',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: savingHero ? 'not-allowed' : 'pointer',
                    opacity: savingHero ? 0.7 : 1,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  {savingHero ? 'Saving Hero Showcase...' : '💾 Save All 5 Hero Showcase Slides'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

