'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchAdminMenuItems,
  toggleItemAvailability,
  createAdminMenuItem,
  updateAdminMenuItem,
  createAdminCategory,
  fetchCategories,
  AdminMenuItemDto,
  CategoryDto
} from '../../services/admin-api.client';

export default function AdminMenuPage() {
  const [items, setItems] = useState<AdminMenuItemDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Add Category Modal State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryOrder, setNewCategoryOrder] = useState('99');
  const [addCategorySaving, setAddCategorySaving] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null);

  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCategoryId, setAddCategoryId] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addIsVeg, setAddIsVeg] = useState(true);
  const [addDescription, setAddDescription] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Item Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminMenuItemDto | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editIsVeg, setEditIsVeg] = useState(true);
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsData, catsData] = await Promise.all([
        fetchAdminMenuItems(),
        fetchCategories().catch(() => [])
      ]);
      setItems(itemsData);
      setCategories(catsData);
      if (catsData.length > 0 && !addCategoryId) {
        setAddCategoryId(catsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load catalog from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const handleToggle = async (item: AdminMenuItemDto) => {
    const nextState = !item.is_available;
    setTogglingId(item.id);
    setFeedback(null);
    try {
      const updated = await toggleItemAvailability(item.id, nextState);
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_available: updated.is_available } : i)));
      setFeedback(`"${item.name}" marked as ${nextState ? 'Available (Online)' : 'Unavailable (86’d)'}`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenEdit = (item: AdminMenuItemDto) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategoryId(item.category_id);
    setEditPrice(String(item.base_price));
    setEditIsVeg(item.is_veg);
    setEditDescription(item.description || '');
    setEditError(null);
    setShowEditModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addPrice || !addCategoryId) {
      setAddError('Please fill in Item Name, Category, and Price.');
      return;
    }
    setAddSaving(true);
    setAddError(null);
    try {
      const created = await createAdminMenuItem({
        name: addName.trim(),
        category_id: addCategoryId,
        base_price: Number(addPrice),
        is_veg: addIsVeg,
        description: addDescription.trim() || undefined,
        is_available: true
      });
      setShowAddModal(false);
      setAddName('');
      setAddPrice('');
      setAddDescription('');
      setFeedback(`Added new item "${created.name}" to menu!`);
      loadMenu();
    } catch (err: any) {
      setAddError(err.message || 'Failed to create menu item');
    } finally {
      setAddSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editName.trim() || !editPrice) {
      setEditError('Please fill in Item Name and Price.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateAdminMenuItem(editingItem.id, {
        name: editName.trim(),
        category_id: editCategoryId,
        base_price: Number(editPrice),
        is_veg: editIsVeg,
        description: editDescription.trim()
      });
      setShowEditModal(false);
      setFeedback(`Updated item "${updated.name}" successfully!`);
      setItems(prev => prev.map(i => (i.id === updated.id ? { ...i, ...updated } : i)));
    } catch (err: any) {
      setEditError(err.message || 'Failed to update menu item');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setAddCategoryError('Please enter a category name');
      return;
    }
    setAddCategorySaving(true);
    setAddCategoryError(null);
    try {
      const created = await createAdminCategory({
        name: newCategoryName.trim(),
        display_order: Number(newCategoryOrder) || 99
      });
      setShowAddCategoryModal(false);
      setNewCategoryName('');
      setFeedback(`Category "${created.name}" created successfully!`);
      const catsData = await fetchCategories();
      setCategories(catsData);
      setSelectedCategoryFilter(created.id);
    } catch (err: any) {
      setAddCategoryError(err.message || 'Failed to create category');
    } finally {
      setAddCategorySaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesFilter =
      availabilityFilter === 'ALL' ||
      (availabilityFilter === 'AVAILABLE' && item.is_available) ||
      (availabilityFilter === 'UNAVAILABLE' && !item.is_available);
    const matchesCategory =
      selectedCategoryFilter === 'ALL' || item.category_id === selectedCategoryFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.slug.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query));
    return matchesFilter && matchesCategory && matchesSearch;
  });

  const totalCount = items.length;
  const availableCount = items.filter(i => i.is_available).length;
  const unavailableCount = totalCount - availableCount;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2328' }}>Menu Catalog & Availability Control</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Live stock switches & item updates affect both customer storefront and billing POS instantaneously
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setAddCategoryError(null);
              setShowAddCategoryModal(true);
            }}
            style={{
              padding: '9px 18px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            + Add New Category
          </button>
          <button
            onClick={() => {
              setAddError(null);
              setShowAddModal(true);
            }}
            style={{
              padding: '9px 18px',
              backgroundColor: 'var(--cw-color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--cw-radius-md)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            + Add New Menu Item
          </button>
          <button
            onClick={loadMenu}
            disabled={loading}
            style={{
              padding: '9px 16px',
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
            {loading ? 'Refreshing...' : '🔄 Refresh Catalog'}
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DCFCE7', color: '#16A34A', borderRadius: 'var(--cw-radius-md)', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
          ✓ {feedback}
        </div>
      )}

      {error && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--cw-radius-md)', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ {error} • <button onClick={loadMenu} style={{ background: 'transparent', border: 'none', textDecoration: 'underline', color: '#991B1B', cursor: 'pointer', fontWeight: 700 }}>Click here to retry</button>
        </div>
      )}

      {/* KPI Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '14px 18px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Catalog Items</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1E2328', marginTop: '4px' }}>{totalCount}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '14px 18px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600, textTransform: 'uppercase' }}>Active in Storefront</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>{availableCount}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '14px 18px', borderRadius: 'var(--cw-radius-md)', border: '1px solid var(--cw-color-border)' }}>
          <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600, textTransform: 'uppercase' }}>Sold Out / 86’d</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>{unavailableCount}</div>
        </div>
      </div>

      {/* Zomato-Style Category Selector Pills */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '20px',
          whiteSpace: 'nowrap'
        }}
      >
        <button
          onClick={() => setSelectedCategoryFilter('ALL')}
          style={{
            padding: '8px 18px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: selectedCategoryFilter === 'ALL' ? '2px solid var(--cw-color-primary)' : '1px solid var(--cw-color-border)',
            backgroundColor: selectedCategoryFilter === 'ALL' ? '#FEF3C7' : '#FFFFFF',
            color: selectedCategoryFilter === 'ALL' ? '#B45309' : '#475569',
            boxShadow: selectedCategoryFilter === 'ALL' ? '0 2px 6px rgba(180, 83, 9, 0.15)' : 'none'
          }}
        >
          🍽️ All Categories ({items.length})
        </button>
        {categories.map((cat) => {
          const count = items.filter((i) => i.category_id === cat.id).length;
          const isSelected = selectedCategoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryFilter(cat.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--cw-color-primary)' : '1px solid var(--cw-color-border)',
                backgroundColor: isSelected ? '#FEF3C7' : '#FFFFFF',
                color: isSelected ? '#B45309' : '#475569',
                boxShadow: isSelected ? '0 2px 6px rgba(180, 83, 9, 0.15)' : 'none'
              }}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
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
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'AVAILABLE', 'UNAVAILABLE'] as const).map(f => (
            <button
              key={f}
              onClick={() => setAvailabilityFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: availabilityFilter === f ? 'var(--cw-color-primary)' : '#F4F6F8',
                color: availabilityFilter === f ? '#FFFFFF' : '#64748B'
              }}
            >
              {f === 'ALL' ? 'All Items' : f === 'AVAILABLE' ? 'Active Only' : 'Unavailable (86’d)'}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search items by name..."
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

      {/* Items Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--cw-radius-md)',
          border: '1px solid var(--cw-color-border)',
          boxShadow: 'var(--cw-shadow-sm)',
          overflow: 'hidden'
        }}
      >
        {loading && items.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>Loading menu items from database...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>No items match your filter</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--cw-color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Item Details</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Dietary</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Price</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Storefront Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isToggling = togglingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: item.is_available ? '#FFFFFF' : '#FFFBFB',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {/* Name & Description */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: item.is_available ? '#1E2328' : '#94A3B8' }}>
                          {item.name}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', maxWidth: '340px' }}>
                            {item.description}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace', marginTop: '2px' }}>
                          slug: {item.slug}
                        </div>
                      </td>

                      {/* Dietary Indicator */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: item.is_veg ? '#DCFCE7' : '#FEE2E2',
                            color: item.is_veg ? '#16A34A' : '#DC2626'
                          }}
                        >
                          ● {item.is_veg ? '100% Veg' : 'Non-Veg'}
                        </span>
                      </td>

                      {/* Base Price (Zero Tax Mode) */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#1E2328', fontSize: '14px' }}>
                          ₹{Number(item.base_price).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>Zero-Tax Final Price</div>
                      </td>

                      {/* Live Storefront Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: item.is_available ? '#DCFCE7' : '#FEE2E2',
                            color: item.is_available ? '#16A34A' : '#DC2626'
                          }}
                        >
                          {item.is_available ? '● Active in Menu' : '✕ Unavailable (86’d)'}
                        </span>
                      </td>

                      {/* Action Buttons: Edit + Toggle */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--cw-radius-md)',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#F8FAFC',
                              color: '#334155',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleToggle(item)}
                            disabled={isToggling}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--cw-radius-md)',
                              border: item.is_available ? '1px solid #DC2626' : '1px solid #16A34A',
                              backgroundColor: item.is_available ? '#FFF1F2' : '#F0FDF4',
                              color: item.is_available ? '#DC2626' : '#16A34A',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: isToggling ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isToggling ? 'Saving...' : item.is_available ? 'Mark Sold Out' : 'Mark Available'}
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

      {/* Modal: Add New Menu Item */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0'
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
              Add New Menu Item
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '18px' }}>
              Create a new item in the central catalog. It will immediately reflect in Storefront and BillBook.
            </p>

            {addError && (
              <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '14px' }}>
                ⚠️ {addError}
              </div>
            )}

            <form onSubmit={handleSaveAdd}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masala Bun Maska"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={addCategoryId}
                    onChange={(e) => setAddCategoryId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 50"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Dietary Classification
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="isVeg"
                      checked={addIsVeg === true}
                      onChange={() => setAddIsVeg(true)}
                    />
                    <span style={{ color: '#16A34A', fontWeight: 700 }}>● Veg</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="isVeg"
                      checked={addIsVeg === false}
                      onChange={() => setAddIsVeg(false)}
                    />
                    <span style={{ color: '#DC2626', fontWeight: 700 }}>● Non-Veg</span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief dish description..."
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#F1F5F9', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  style={{ flex: 2, padding: '10px', backgroundColor: 'var(--cw-color-primary)', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: addSaving ? 'not-allowed' : 'pointer' }}
                >
                  {addSaving ? 'Saving Item...' : 'Save & Publish Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Menu Item */}
      {showEditModal && editingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0'
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
              Edit Menu Item
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '18px' }}>
              Modify details for &quot;{editingItem.name}&quot;. Updates sync live across all platforms.
            </p>

            {editError && (
              <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '14px' }}>
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Dietary Classification
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="editIsVeg"
                      checked={editIsVeg === true}
                      onChange={() => setEditIsVeg(true)}
                    />
                    <span style={{ color: '#16A34A', fontWeight: 700 }}>● Veg</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="editIsVeg"
                      checked={editIsVeg === false}
                      onChange={() => setEditIsVeg(false)}
                    />
                    <span style={{ color: '#DC2626', fontWeight: 700 }}>● Non-Veg</span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#F1F5F9', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  style={{ flex: 2, padding: '10px', backgroundColor: 'var(--cw-color-primary)', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: editSaving ? 'not-allowed' : 'pointer' }}
                >
                  {editSaving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px 28px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
                + Add New Menu Category
              </h3>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            {addCategoryError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '6px', marginBottom: '14px', fontSize: '12px' }}>
                ⚠️ {addCategoryError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Category Name * (e.g. Desserts, Burgers, Combos)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Desserts & Sweets"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Display Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={newCategoryOrder}
                  onChange={(e) => setNewCategoryOrder(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#F1F5F9', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCategorySaving}
                  style={{ flex: 2, padding: '10px', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: addCategorySaving ? 'not-allowed' : 'pointer' }}
                >
                  {addCategorySaving ? 'Creating...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
