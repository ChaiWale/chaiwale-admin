'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  fetchAdminMenuItems,
  toggleItemAvailability,
  createAdminMenuItem,
  updateAdminMenuItem,
  createAdminCategory,
  fetchCategories,
  uploadMenuImage,
  resolveMediaUrl,
  AdminMenuItemDto,
  CategoryDto,
  MenuItemVariantDto
} from '../../services/admin-api.client';
import ChaiLoader from '../../components/ChaiLoader';
import { compressAndConvertToWebP, formatBytes } from '../../utils/image-compressor';

const POPULAR_TAG_OPTIONS = [
  'Bestseller ⭐',
  'Chef\'s Special 👨‍🍳',
  'Must Try 🔥',
  'Signature Dish 👑',
  'Jain Available 🌿',
  'Kid Friendly 👶'
];

export default function AdminMenuPage() {
  const [items, setItems] = useState<AdminMenuItemDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
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
  const [addDietary, setAddDietary] = useState<'VEG' | 'NON_VEG' | 'EGG'>('VEG');
  const [addSpiceLevel, setAddSpiceLevel] = useState<'NONE' | 'MILD' | 'MEDIUM' | 'HOT'>('NONE');
  const [addTags, setAddTags] = useState<string[]>([]);
  const [addDescription, setAddDescription] = useState('');
  const [addImagePath, setAddImagePath] = useState<string | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [addImageUploading, setAddImageUploading] = useState(false);
  const [addImageStats, setAddImageStats] = useState<{ orig: number; comp: number; savings: number } | null>(null);
  const [addVariants, setAddVariants] = useState<Array<{ name: string; price: string }>>([]);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Item Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminMenuItemDto | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDietary, setEditDietary] = useState<'VEG' | 'NON_VEG' | 'EGG'>('VEG');
  const [editSpiceLevel, setEditSpiceLevel] = useState<'NONE' | 'MILD' | 'MEDIUM' | 'HOT'>('NONE');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [editImagePath, setEditImagePath] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [editImageStats, setEditImageStats] = useState<{ orig: number; comp: number; savings: number } | null>(null);
  const [editVariants, setEditVariants] = useState<Array<{ id?: string; name: string; price: string }>>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const addFileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

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
      setFeedback(`"${item.name}" marked as ${nextState ? 'In Stock (Available)' : 'Out of Stock'}`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleImageFileChange = async (file: File, isEdit: boolean) => {
    try {
      if (isEdit) setEditImageUploading(true);
      else setAddImageUploading(true);

      // 1. Client-side automatic WebP conversion & compression
      const compressed = await compressAndConvertToWebP(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.82 });

      const stats = {
        orig: compressed.originalSize,
        comp: compressed.compressedSize,
        savings: compressed.reductionPercentage
      };

      if (isEdit) {
        setEditImagePreview(compressed.base64);
        setEditImageStats(stats);
      } else {
        setAddImagePreview(compressed.base64);
        setAddImageStats(stats);
      }

      // 2. Upload to Supabase Storage 'menu' bucket
      const targetCatId = isEdit ? editCategoryId : addCategoryId;
      const catSlug = categories.find(c => c.id === targetCatId)?.slug || 'items';
      const uploadRes = await uploadMenuImage(compressed.base64, compressed.fileName, catSlug);

      if (isEdit) {
        setEditImagePath(uploadRes.imagePath);
      } else {
        setAddImagePath(uploadRes.imagePath);
      }
    } catch (err: any) {
      alert(`Image WebP processing failed: ${err.message}`);
    } finally {
      if (isEdit) setEditImageUploading(false);
      else setAddImageUploading(false);
    }
  };

  const resetAddForm = () => {
    setAddName('');
    setAddPrice('');
    setAddDietary('VEG');
    setAddSpiceLevel('NONE');
    setAddTags([]);
    setAddDescription('');
    setAddImagePath(null);
    setAddImagePreview(null);
    setAddImageStats(null);
    setAddVariants([]);
    setAddError(null);
  };

  const handleOpenEdit = (item: AdminMenuItemDto) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategoryId(item.category_id);
    setEditPrice(String(item.base_price));
    setEditDietary(item.is_egg ? 'EGG' : item.is_veg ? 'VEG' : 'NON_VEG');
    setEditSpiceLevel((item.spice_level as any) || 'NONE');
    setEditTags(Array.isArray(item.tags) ? item.tags : []);
    setEditDescription(item.description || '');
    setEditImagePath(item.image_path || null);
    setEditImagePreview(item.image_path ? resolveMediaUrl(item.image_path) : null);
    setEditImageStats(null);
    setEditVariants(
      item.variants && item.variants.length > 0
        ? item.variants.map(v => ({ id: v.id, name: v.name, price: String(v.price) }))
        : []
    );
    setEditError(null);
    setShowEditModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addPrice || !addCategoryId) {
      setAddError('Please fill in Item Name, Category, and Base Price.');
      return;
    }
    setAddSaving(true);
    setAddError(null);
    try {
      const validVariants = addVariants
        .filter(v => v.name.trim() && !isNaN(Number(v.price)))
        .map(v => ({ name: v.name.trim(), price: Number(v.price) }));

      const created = await createAdminMenuItem({
        name: addName.trim(),
        category_id: addCategoryId,
        base_price: Number(addPrice),
        is_veg: addDietary === 'VEG',
        is_egg: addDietary === 'EGG',
        spice_level: addSpiceLevel,
        tags: addTags,
        description: addDescription.trim() || undefined,
        image_path: addImagePath,
        is_available: true,
        variants: validVariants.length > 0 ? validVariants : undefined
      });

      setShowAddModal(false);
      resetAddForm();
      setFeedback(`Added new item "${created.name}" successfully!`);
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
      setEditError('Please fill in Item Name and Base Price.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const validVariants = editVariants
        .filter(v => v.name.trim() && !isNaN(Number(v.price)))
        .map(v => ({ name: v.name.trim(), price: Number(v.price) }));

      const updated = await updateAdminMenuItem(editingItem.id, {
        name: editName.trim(),
        category_id: editCategoryId,
        base_price: Number(editPrice),
        is_veg: editDietary === 'VEG',
        is_egg: editDietary === 'EGG',
        spice_level: editSpiceLevel,
        tags: editTags,
        description: editDescription.trim(),
        image_path: editImagePath,
        variants: validVariants
      });

      setShowEditModal(false);
      setFeedback(`Updated item "${updated.name}" successfully!`);
      loadMenu();
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

  const toggleTag = (tag: string, isEdit: boolean) => {
    if (isEdit) {
      setEditTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    } else {
      setAddTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    }
  };

  const applyHalfFullPreset = (isEdit: boolean, currentBasePrice: string) => {
    const base = Number(currentBasePrice) || 0;
    const half = Math.round(base * 0.6) || 40;
    const full = base || 70;
    const newVariants = [
      { name: 'Half', price: String(half) },
      { name: 'Full', price: String(full) }
    ];
    if (isEdit) setEditVariants(newVariants);
    else setAddVariants(newVariants);
  };

  const applyRegularLargePreset = (isEdit: boolean, currentBasePrice: string) => {
    const base = Number(currentBasePrice) || 0;
    const regular = base || 50;
    const large = Math.round(base * 1.5) || 80;
    const newVariants = [
      { name: 'Regular', price: String(regular) },
      { name: 'Large', price: String(large) }
    ];
    if (isEdit) setEditVariants(newVariants);
    else setAddVariants(newVariants);
  };

  const addEmptyVariant = (isEdit: boolean) => {
    if (isEdit) setEditVariants(prev => [...prev, { name: '', price: '' }]);
    else setAddVariants(prev => [...prev, { name: '', price: '' }]);
  };

  const removeVariant = (index: number, isEdit: boolean) => {
    if (isEdit) setEditVariants(prev => prev.filter((_, i) => i !== index));
    else setAddVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariantRow = (index: number, field: 'name' | 'price', value: string, isEdit: boolean) => {
    if (isEdit) {
      setEditVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
    } else {
      setAddVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
    }
  };

  const filteredItems = items.filter(item => {
    const matchesFilter =
      availabilityFilter === 'ALL' ||
      (availabilityFilter === 'AVAILABLE' && item.is_available) ||
      (availabilityFilter === 'UNAVAILABLE' && !item.is_available);
    const matchesCategory =
      selectedCategoryFilter === 'ALL' || item.category_id === selectedCategoryFilter;

    const rawQuery = searchQuery.toLowerCase().trim();
    const keywords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];

    let matchesSearch = true;
    if (keywords.length > 0) {
      const categoryName = categories.find(c => c.id === item.category_id)?.name || '';
      const tagsText = (item.tags || []).join(' ');
      const variantsText = (item.variants || []).map(v => v.name).join(' ');
      const dietText = item.is_veg ? 'veg pure veg' : (item.is_egg ? 'egg' : 'non-veg nonveg');
      const spiceText = item.spice_level || '';
      const searchable = [
        item.name,
        item.slug,
        item.description || '',
        categoryName,
        tagsText,
        variantsText,
        dietText,
        spiceText
      ].join(' ').toLowerCase();

      matchesSearch = keywords.every(kw => searchable.includes(kw));
    }

    return matchesFilter && matchesCategory && matchesSearch;
  });

  const availableCount = items.filter(i => i.is_available).length;
  const unavailableCount = items.filter(i => !i.is_available).length;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2328' }}>Menu Catalog & Availability</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Manage dish availability, portion pricing, categories, and real-time menu synchronization across counter POS and online ordering.
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
            + New Category
          </button>
          <button
            onClick={() => {
              resetAddForm();
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
              boxShadow: '0 2px 4px rgba(111, 67, 42, 0.2)'
            }}
          >
            + Add New Dish
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            border: '1px solid #A7F3D0',
            padding: '12px 18px',
            borderRadius: 'var(--cw-radius-md)',
            marginBottom: '20px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ✓ {feedback}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FECACA',
            padding: '12px 18px',
            borderRadius: 'var(--cw-radius-md)',
            marginBottom: '20px',
            fontSize: '13px'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Categories Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '16px',
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

      {/* Search, Filter & View Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '14px 18px',
          borderRadius: 'var(--cw-radius-md)',
          border: '1px solid var(--cw-color-border)',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setAvailabilityFilter('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: availabilityFilter === 'ALL' ? 'var(--cw-color-primary)' : '#F4F6F8',
              color: availabilityFilter === 'ALL' ? '#FFFFFF' : '#64748B'
            }}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setAvailabilityFilter('AVAILABLE')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: availabilityFilter === 'AVAILABLE' ? '#16A34A' : '#F4F6F8',
              color: availabilityFilter === 'AVAILABLE' ? '#FFFFFF' : '#64748B'
            }}
          >
            ● In Stock ({availableCount})
          </button>
          <button
            onClick={() => setAvailabilityFilter('UNAVAILABLE')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: availabilityFilter === 'UNAVAILABLE' ? '#DC2626' : '#F4F6F8',
              color: availabilityFilter === 'UNAVAILABLE' ? '#FFFFFF' : '#64748B'
            }}
          >
            ✕ Out of Stock ({unavailableCount})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Dual View Toggle */}
          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: viewMode === 'cards' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'cards' ? 'var(--cw-color-primary)' : '#64748B',
                boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>⊞</span> Card View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'list' ? 'var(--cw-color-primary)' : '#64748B',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>☰</span> List View
            </button>
          </div>

          <input
            type="text"
            placeholder="Search dishes by name, category, tags..."
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
      </div>

      {/* Items Container */}
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
          <div style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
            <ChaiLoader label="Loading Menu Catalog..." sublabel="Fetching authentic dishes & categories..." />
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>No items match your filter</p>
          </div>
        ) : viewMode === 'cards' ? (
          /* ========================================================================= */
          /* CARD VIEW: Grid of Modern Food Cards                                      */
          /* ========================================================================= */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '18px',
              padding: '20px'
            }}
          >
            {filteredItems.map(item => {
              const isToggling = togglingId === item.id;
              const itemImgUrl = item.image_path ? resolveMediaUrl(item.image_path) : null;
              const catName = categories.find(c => c.id === item.category_id)?.name || 'Chaiwale';
              const hasVariants = item.variants && item.variants.length > 0;

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: item.is_available ? '1px solid #E2E8F0' : '1px solid #FECACA',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    opacity: item.is_available ? 1 : 0.85
                  }}
                >
                  {/* Card Image Banner */}
                  <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: '#F8FAFC', overflow: 'hidden' }}>
                    {itemImgUrl ? (
                      <img
                        src={itemImgUrl}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', backgroundColor: '#F1F5F9' }}>
                        🍲
                      </div>
                    )}

                    {/* Dietary Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(4px)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        color: item.is_egg ? '#D97706' : item.is_veg ? '#16A34A' : '#DC2626'
                      }}
                    >
                      <span>●</span> {item.is_egg ? 'Egg' : item.is_veg ? 'Pure Veg' : 'Non-Veg'}
                    </div>

                    {/* Category Pill */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        color: '#FFFFFF',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 700
                      }}
                    >
                      {catName}
                    </div>

                    {/* Out of Stock Overlay Bar */}
                    {!item.is_available && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          insetInline: 0,
                          backgroundColor: 'rgba(220, 38, 38, 0.92)',
                          color: '#FFFFFF',
                          textAlign: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px',
                          letterSpacing: '0.04em'
                        }}
                      >
                        OUT OF STOCK (PAUSED)
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>
                        {item.name}
                      </h3>
                      {item.spice_level && item.spice_level !== 'NONE' && (
                        <span title={`Spice level: ${item.spice_level}`} style={{ fontSize: '12px' }}>
                          {item.spice_level === 'HOT' ? '🌶️🌶️🌶️' : item.spice_level === 'MEDIUM' ? '🌶️🌶️' : '🌶️'}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          margin: '6px 0 10px',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {item.description}
                      </p>
                    )}

                    {/* Pricing */}
                    <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>
                          ₹{Number(item.base_price).toFixed(2)}
                        </span>
                        {hasVariants && (
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                            (Base Price)
                          </span>
                        )}
                      </div>

                      {hasVariants && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                          {item.variants!.map(v => (
                            <span
                              key={v.id || v.name}
                              style={{
                                fontSize: '10.5px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#F1F5F9',
                                color: '#334155',
                                fontWeight: 700
                              }}
                            >
                              {v.name}: ₹{v.price}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Stock Toggle & Edit */}
                    <div
                      style={{
                        marginTop: '14px',
                        paddingTop: '12px',
                        borderTop: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        disabled={isToggling}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: item.is_available ? '1px solid #16A34A' : '1px solid #DC2626',
                          backgroundColor: item.is_available ? '#DCFCE7' : '#FEE2E2',
                          color: item.is_available ? '#166534' : '#991B1B',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          cursor: isToggling ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        <span>{item.is_available ? '● In Stock' : '✕ Out of Stock'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#F8FAFC',
                          color: '#334155',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--cw-color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Dish / Media</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Dietary & Spice</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Pricing & Variants</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Storefront Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isToggling = togglingId === item.id;
                  const itemImgUrl = item.image_path ? resolveMediaUrl(item.image_path) : null;
                  const hasVariants = item.variants && item.variants.length > 0;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: item.is_available ? '#FFFFFF' : '#FFFBFB',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {/* Name & Photo Thumbnail */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              minWidth: '48px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {itemImgUrl ? (
                              <img
                                src={itemImgUrl}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                loading="lazy"
                              />
                            ) : (
                              <span style={{ fontSize: '20px' }}>🍲</span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: item.is_available ? '#1E2328' : '#94A3B8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {item.name}
                              {item.spice_level && item.spice_level !== 'NONE' && (
                                <span title={`Spice level: ${item.spice_level}`}>
                                  {item.spice_level === 'HOT' ? '🌶️🌶️🌶️' : item.spice_level === 'MEDIUM' ? '🌶️🌶️' : '🌶️'}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.description}
                              </div>
                            )}
                            {item.tags && item.tags.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {item.tags.map(tag => (
                                  <span key={tag} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Dietary & Classification */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: item.is_egg ? '#FEF3C7' : item.is_veg ? '#DCFCE7' : '#FEE2E2',
                              color: item.is_egg ? '#D97706' : item.is_veg ? '#16A34A' : '#DC2626'
                            }}
                          >
                            ● {item.is_egg ? 'Egg Item' : item.is_veg ? '100% Veg' : 'Non-Veg'}
                          </span>
                          {item.image_path && (
                            <span style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>
                              ✓ WebP Image
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pricing & Variants */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#1E2328', fontSize: '14px' }}>
                          ₹{Number(item.base_price).toFixed(2)}
                        </div>
                        {hasVariants ? (
                          <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {item.variants!.map(v => (
                              <span
                                key={v.id || v.name}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#F1F5F9',
                                  color: '#334155',
                                  fontWeight: 600
                                }}
                              >
                                {v.name}: ₹{v.price}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Single Portion</div>
                        )}
                      </td>

                      {/* Live Storefront Status */}
                      <td style={{ padding: '12px 16px' }}>
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
                          {item.is_available ? '● In Stock' : '✕ Out of Stock'}
                        </span>
                      </td>

                      {/* Action Buttons: Edit + Toggle */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW MENU ITEM (Zomato Restaurant Partner Style)                 */}
      {/* ========================================================================= */}
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
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
          >
            {/* Modal Top Bar */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Menu Item Details
                </span>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: '2px 0 0 0' }}>
                  Add New Dish
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: '#EDF2F7',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#4A5568'
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveAdd} style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {addError && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px', fontWeight: 600 }}>
                  ⚠️ {addError}
                </div>
              )}

              {/* Grid: Details (Left) & Image Upload (Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Left Column: Basic Details */}
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Dish / Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Masala Bun Maska, Kulhad Chai"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
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
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
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
                        step="1"
                        min="0"
                        required
                        placeholder="e.g. 50"
                        value={addPrice}
                        onChange={(e) => setAddPrice(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Description (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Brief description of preparation, taste, and ingredients..."
                      value={addDescription}
                      onChange={(e) => setAddDescription(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Right Column: Image Uploader with WebP Converter */}
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      Dish Photo
                    </label>
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                      ⚡ Optimized WebP
                    </span>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={addFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFileChange(file, false);
                    }}
                  />

                  {/* Photo Preview / Drop Area */}
                  <div
                    onClick={() => addFileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      minHeight: '140px',
                      border: '2px dashed #CBD5E1',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: '#FFFFFF',
                      padding: '12px',
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {addImagePreview ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '120px' }}>
                        <img
                          src={addImagePreview}
                          alt="Dish Preview"
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                        <div style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                          Click to Change
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '28px', marginBottom: '4px' }}>📸</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          {addImageUploading ? 'Converting & Uploading...' : 'Upload Food Photo'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          JPG, PNG, WEBP • Auto-compressed & converted to WebP
                        </div>
                      </>
                    )}
                  </div>

                  {/* Compression Stats Badge */}
                  {addImageStats && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#ECFDF5', borderRadius: '6px', fontSize: '11px', color: '#065F46' }}>
                      ✓ {formatBytes(addImageStats.orig)} ➔ <strong>{formatBytes(addImageStats.comp)} WebP</strong> ({addImageStats.savings}% saved)
                    </div>
                  )}

                  {addImagePath && (
                    <div style={{ marginTop: '6px', fontSize: '10px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Cloud Path: <code style={{ color: '#0F172A' }}>{addImagePath}</code>
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Dietary & Spice Level */}
              <div style={{ padding: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                  {/* Dietary Switcher */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      Dietary Classification
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setAddDietary('VEG')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: addDietary === 'VEG' ? '2px solid #16A34A' : '1px solid #CBD5E1',
                          backgroundColor: addDietary === 'VEG' ? '#DCFCE7' : '#FFFFFF',
                          color: addDietary === 'VEG' ? '#16A34A' : '#475569'
                        }}
                      >
                        🟢 Veg
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddDietary('EGG')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: addDietary === 'EGG' ? '2px solid #D97706' : '1px solid #CBD5E1',
                          backgroundColor: addDietary === 'EGG' ? '#FEF3C7' : '#FFFFFF',
                          color: addDietary === 'EGG' ? '#B45309' : '#475569'
                        }}
                      >
                        🟡 Egg
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddDietary('NON_VEG')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: addDietary === 'NON_VEG' ? '2px solid #DC2626' : '1px solid #CBD5E1',
                          backgroundColor: addDietary === 'NON_VEG' ? '#FEE2E2' : '#FFFFFF',
                          color: addDietary === 'NON_VEG' ? '#DC2626' : '#475569'
                        }}
                      >
                        🔴 Non-Veg
                      </button>
                    </div>
                  </div>

                  {/* Spiciness Level */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      Taste & Spiciness
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['NONE', 'MILD', 'MEDIUM', 'HOT'] as const).map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setAddSpiceLevel(lvl)}
                          style={{
                            flex: 1,
                            padding: '8px 6px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: addSpiceLevel === lvl ? '2px solid #E11D48' : '1px solid #CBD5E1',
                            backgroundColor: addSpiceLevel === lvl ? '#FFE4E6' : '#FFFFFF',
                            color: addSpiceLevel === lvl ? '#BE123C' : '#475569'
                          }}
                        >
                          {lvl === 'NONE' ? '🌱 None' : lvl === 'MILD' ? '🌶️ Mild' : lvl === 'MEDIUM' ? '🌶️🌶️ Med' : '🌶️🌶️🌶️ Hot'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Popular Tags Chips */}
                <div style={{ marginTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Menu Badges & Merchandising Tags
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {POPULAR_TAG_OPTIONS.map(tag => {
                      const active = addTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag, false)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: active ? '1.5px solid #D97706' : '1px solid #CBD5E1',
                            backgroundColor: active ? '#FEF3C7' : '#FFFFFF',
                            color: active ? '#92400E' : '#64748B'
                          }}
                        >
                          {active ? '✓ ' : '+ '}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section: Portions & Variants (Half / Full, Regular / Large) */}
              <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      Portions & Variants (Half / Full, Sizes)
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748B' }}>
                      Offer customer options like Half vs Full plate or Small vs Large portion with custom prices.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => applyHalfFullPreset(false, addPrice)}
                      style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', cursor: 'pointer' }}
                    >
                      + Half / Full
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRegularLargePreset(false, addPrice)}
                      style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#E0E7FF', color: '#4338CA', border: '1px solid #C7D2FE', cursor: 'pointer' }}
                    >
                      + Reg / Large
                    </button>
                    <button
                      type="button"
                      onClick={() => addEmptyVariant(false)}
                      style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', cursor: 'pointer' }}
                    >
                      + Custom Variant
                    </button>
                  </div>
                </div>

                {addVariants.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '12px' }}>
                    Single portion dish. Base price <strong>₹{addPrice || 0}</strong> applies. Click &quot;+ Half / Full&quot; above to add portion variants.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {addVariants.map((v, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="e.g. Half, Full, 250ml"
                          value={v.name}
                          onChange={(e) => updateVariantRow(idx, 'name', e.target.value, false)}
                          style={{ flex: 2, padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                        />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '8px', color: '#64748B', fontSize: '12px' }}>₹</span>
                          <input
                            type="number"
                            placeholder="Price"
                            value={v.price}
                            onChange={(e) => updateVariantRow(idx, 'price', e.target.value, false)}
                            style={{ width: '100%', padding: '8px 10px 8px 20px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariant(idx, false)}
                          style={{ background: '#FEE2E2', border: 'none', color: '#DC2626', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                          title="Remove variant"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#F1F5F9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving || addImageUploading}
                  style={{ flex: 2, padding: '12px', backgroundColor: 'var(--cw-color-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: (addSaving || addImageUploading) ? 'not-allowed' : 'pointer' }}
                >
                  {addImageUploading ? 'Uploading WebP Photo...' : addSaving ? 'Publishing Item...' : 'Save & Publish to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT MENU ITEM (Zomato Restaurant Partner Style)                     */}
      {/* ========================================================================= */}
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
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
          >
            {/* Modal Top Bar */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Edit Dish Details
                </span>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: '2px 0 0 0' }}>
                  Edit Dish: {editingItem.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{
                  background: '#EDF2F7',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#4A5568'
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveEdit} style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {editError && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px', fontWeight: 600 }}>
                  ⚠️ {editError}
                </div>
              )}

              {/* Grid: Details (Left) & Image Upload (Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Left Column: Basic Details */}
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Dish / Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
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
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
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
                        step="1"
                        min="0"
                        required
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Right Column: Image Uploader with WebP Converter */}
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      Dish Photo
                    </label>
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                      ⚡ Optimized WebP
                    </span>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={editFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFileChange(file, true);
                    }}
                  />

                  {/* Photo Preview / Drop Area */}
                  <div
                    onClick={() => editFileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      minHeight: '140px',
                      border: '2px dashed #CBD5E1',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: '#FFFFFF',
                      padding: '12px',
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {editImagePreview ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '120px' }}>
                        <img
                          src={editImagePreview}
                          alt="Dish Preview"
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                        <div style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                          Click to Replace
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '28px', marginBottom: '4px' }}>📸</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          {editImageUploading ? 'Converting & Uploading...' : 'Upload Food Photo'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          JPG, PNG, WEBP • Auto-compressed & converted to WebP
                        </div>
                      </>
                    )}
                  </div>

                  {/* Compression Stats Badge */}
                  {editImageStats && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#ECFDF5', borderRadius: '6px', fontSize: '11px', color: '#065F46' }}>
                      ✓ {formatBytes(editImageStats.orig)} ➔ <strong>{formatBytes(editImageStats.comp)} WebP</strong> ({editImageStats.savings}% saved)
                    </div>
                  )}

                  {editImagePath && (
                    <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        Path: {editImagePath}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditImagePath(null);
                          setEditImagePreview(null);
                          setEditImageStats(null);
                        }}
                        style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Remove Photo
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Dietary & Spice Level */}
              <div style={{ padding: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                  {/* Dietary Switcher */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      Dietary Classification
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setEditDietary('VEG')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: editDietary === 'VEG' ? '2px solid #16A34A' : '1px solid #CBD5E1',
                          backgroundColor: editDietary === 'VEG' ? '#DCFCE7' : '#FFFFFF',
                          color: editDietary === 'VEG' ? '#16A34A' : '#475569'
                        }}
                      >
                        🟢 Veg
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditDietary('EGG')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: editDietary === 'EGG' ? '2px solid #D97706' : '1px solid #CBD5E1',
                          backgroundColor: editDietary === 'EGG' ? '#FEF3C7' : '#FFFFFF',
                          color: editDietary === 'EGG' ? '#B45309' : '#475569'
                        }}
                      >
                        🟡 Egg
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditDietary('NON_VEG')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: editDietary === 'NON_VEG' ? '2px solid #DC2626' : '1px solid #CBD5E1',
                          backgroundColor: editDietary === 'NON_VEG' ? '#FEE2E2' : '#FFFFFF',
                          color: editDietary === 'NON_VEG' ? '#DC2626' : '#475569'
                        }}
                      >
                        🔴 Non-Veg
                      </button>
                    </div>
                  </div>

                  {/* Spiciness Level */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      Taste & Spiciness
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['NONE', 'MILD', 'MEDIUM', 'HOT'] as const).map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setEditSpiceLevel(lvl)}
                          style={{
                            flex: 1,
                            padding: '8px 6px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: editSpiceLevel === lvl ? '2px solid #E11D48' : '1px solid #CBD5E1',
                            backgroundColor: editSpiceLevel === lvl ? '#FFE4E6' : '#FFFFFF',
                            color: editSpiceLevel === lvl ? '#BE123C' : '#475569'
                          }}
                        >
                          {lvl === 'NONE' ? '🌱 None' : lvl === 'MILD' ? '🌶️ Mild' : lvl === 'MEDIUM' ? '🌶️🌶️ Med' : '🌶️🌶️🌶️ Hot'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Popular Tags Chips */}
                <div style={{ marginTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Menu Badges & Merchandising Tags
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {POPULAR_TAG_OPTIONS.map(tag => {
                      const active = editTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag, true)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: active ? '1.5px solid #D97706' : '1px solid #CBD5E1',
                            backgroundColor: active ? '#FEF3C7' : '#FFFFFF',
                            color: active ? '#92400E' : '#64748B'
                          }}
                        >
                          {active ? '✓ ' : '+ '}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section: Portions & Variants (Half / Full, Regular / Large) */}
              <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      Portions & Variants (Half / Full, Sizes)
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748B' }}>
                      Offer customer options like Half vs Full plate or Small vs Large portion with custom prices.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => applyHalfFullPreset(true, editPrice)}
                      style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', cursor: 'pointer' }}
                    >
                      + Half / Full
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRegularLargePreset(true, editPrice)}
                      style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#E0E7FF', color: '#4338CA', border: '1px solid #C7D2FE', cursor: 'pointer' }}
                    >
                      + Reg / Large
                    </button>
                    <button
                      type="button"
                      onClick={() => addEmptyVariant(true)}
                      style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', cursor: 'pointer' }}
                    >
                      + Custom Variant
                    </button>
                  </div>
                </div>

                {editVariants.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '12px' }}>
                    Single portion dish. Base price <strong>₹{editPrice || 0}</strong> applies. Click &quot;+ Half / Full&quot; above to add portion variants.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {editVariants.map((v, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="e.g. Half, Full, 250ml"
                          value={v.name}
                          onChange={(e) => updateVariantRow(idx, 'name', e.target.value, true)}
                          style={{ flex: 2, padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                        />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '8px', color: '#64748B', fontSize: '12px' }}>₹</span>
                          <input
                            type="number"
                            placeholder="Price"
                            value={v.price}
                            onChange={(e) => updateVariantRow(idx, 'price', e.target.value, true)}
                            style={{ width: '100%', padding: '8px 10px 8px 20px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariant(idx, true)}
                          style={{ background: '#FEE2E2', border: 'none', color: '#DC2626', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                          title="Remove variant"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#F1F5F9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving || editImageUploading}
                  style={{ flex: 2, padding: '12px', backgroundColor: 'var(--cw-color-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: (editSaving || editImageUploading) ? 'not-allowed' : 'pointer' }}
                >
                  {editImageUploading ? 'Uploading WebP Photo...' : editSaving ? 'Updating...' : 'Save & Sync Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD CATEGORY MODAL                                                         */}
      {/* ========================================================================= */}
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
