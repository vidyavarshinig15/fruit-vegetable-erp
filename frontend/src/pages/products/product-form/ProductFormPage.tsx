import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useShop } from '@/contexts/ShopContext';
import { api } from '@/api/client';
import { Save, X, Undo, UserCheck, AlertCircle, Apple, Star, FileUp } from 'lucide-react';

const unitOptions = [
  { value: 'Kg', label: 'Kg (Kilogram)' },
  { value: 'Gram', label: 'Gram (g)' },
  { value: 'Piece', label: 'Piece (Unit)' },
  { value: 'Dozen', label: 'Dozen (12 Pcs)' },
  { value: 'Bundle', label: 'Bundle' },
  { value: 'Packet', label: 'Packet' },
  { value: 'Litre', label: 'Litre' },
  { value: 'Millilitre', label: 'Millilitre (ml)' },
  { value: 'Box', label: 'Box' },
  { value: 'Tray', label: 'Tray' },
  { value: 'Bag', label: 'Bag' },
  { value: 'Crate', label: 'Crate' },
  { value: 'No.', label: 'No. (Number)' },
];

export const ProductFormPage: React.FC = () => {
  const { activeShop } = useShop();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  // Form States
  const [name, setName] = useState('');
  const [kannadaName, setKannadaName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitType, setUnitType] = useState('Kg');
  const [defaultRate, setDefaultRate] = useState<number>(0);
  const [minRate, setMinRate] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isFavourite, setIsFavourite] = useState(false);
  
  // Image Upload states
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');

  // UI States
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Fetch Categories List
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/products/categories');
      if (res.data?.success) {
        setCategories(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }, []);

  // Load existing product if in Edit Mode
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchCategories();
        if (isEdit) {
          const res = await api.get(`/products/${id}`);
          if (res.data?.success && res.data?.data) {
            const prod = res.data.data;
            setName(prod.name);
            setKannadaName(prod.kannadaName || '');
            setCategoryId(prod.categoryId || '');
            setUnitType(prod.unitType);
            setDefaultRate(prod.defaultRate);
            setMinRate(prod.minRate);
            setNotes(prod.notes || '');
            setIsFavourite(prod.isFavourite);
            setImageUrl(prod.imageUrl || null);
          }
        }
      } catch (err: any) {
        setGlobalError(err.response?.data?.message || 'Failed to load product catalog data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, isEdit, fetchCategories]);

  // Set window unsavedChanges flag
  const markDirty = () => {
    (window as any).unsavedChanges = true;
  };

  const clearDirty = () => {
    (window as any).unsavedChanges = false;
  };

  useEffect(() => {
    return () => {
      clearDirty();
    };
  }, []);

  // Base64 Image Selector
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Only PNG, JPEG and WEBP product images are accepted.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Product image file size exceeds the 2MB limit.');
      return;
    }

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    markDirty();
  };

  // Pre-validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'Product catalog name is required';
    if (!unitType) errors.unitType = 'Unit type selection is required';
    
    if (defaultRate <= 0) {
      errors.defaultRate = 'Default rate must be greater than zero';
    }
    
    if (minRate <= 0) {
      errors.minRate = 'Minimum floor rate must be greater than zero';
    } else if (minRate > defaultRate) {
      errors.minRate = 'Minimum floor price cannot exceed the selling rate';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
      setGlobalError('Validation failed: Correct inputs before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        kannadaName: kannadaName || null,
        categoryId: categoryId || null,
        unitType,
        defaultRate: Number(defaultRate),
        minRate: Number(minRate),
        notes: notes || null,
        isFavourite,
        imageUrl,
      };

      if (isEdit) {
        await api.put(`/products/${id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      clearDirty();
      navigate('/products');
    } catch (err: any) {
      setGlobalError(err.response?.data?.message || 'Failed to save product in database catalog.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-bold text-slate-400">
        Loading product configurations...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Apple className="w-8 h-8 text-market-700 dark:text-market-400" />
            {isEdit ? 'Edit Product Item' : 'Add Wholesale Product'}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Shop Catalog Context: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>
        <Link to="/products">
          <Button variant="ghost" size="sm" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2">
            <X className="w-4 h-4" /> Cancel
          </Button>
        </Link>
      </div>

      {globalError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-400 font-bold text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Main inputs form */}
      <form onSubmit={handleSubmit} onChange={markDirty} className="space-y-6">
        {/* Profile Card */}
        <Card title="Product profile" subtitle="Registered item names and categories.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product English Name *"
              required
              placeholder="e.g. Potato Local"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={formErrors.name}
            />
            <Input
              label="Kannada Translation Name"
              placeholder="e.g. ಆಲೂಗಡ್ಡೆ"
              value={kannadaName}
              onChange={(e) => setKannadaName(e.target.value)}
            />
            <Select
              label="Store Classification Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'Unassigned Category' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Select
              label="Wholesale Billing Unit *"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              options={unitOptions}
              error={formErrors.unitType}
            />
          </div>
        </Card>

        {/* Rates & Prices Card */}
        <Card title="Wholesale Rates Setup" subtitle="Setup standard selling rates and floor limits.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Today's Selling Rate (₹) *"
              type="number"
              required
              step="0.01"
              value={defaultRate}
              onChange={(e) => setDefaultRate(Number(e.target.value))}
              error={formErrors.defaultRate}
            />
            <Input
              label="Minimum Floor Limit Price (₹) *"
              type="number"
              required
              step="0.01"
              value={minRate}
              onChange={(e) => setMinRate(Number(e.target.value))}
              error={formErrors.minRate}
              helperText="Cannot sell below this floor rate"
            />
          </div>
        </Card>

        {/* Thumbnail Image upload */}
        <Card title="Product Catalog Image" subtitle="Upload optional product thumbnail.">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Product thumbnail preview"
                className="w-24 h-24 object-cover border-2 border-slate-200 rounded-2xl shrink-0"
              />
            ) : (
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center text-slate-400 text-xs text-center shrink-0">
                No Image
              </div>
            )}

            <div className="flex-1 space-y-2">
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 border border-slate-350 rounded-xl font-bold text-xs transition-all shadow-sm">
                <FileUp className="w-4 h-4 text-slate-500" />
                <span>{imageName || 'Select PNG/JPEG/WEBP file (2MB max)'}</span>
                <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} className="hidden" />
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => { setImageUrl(null); setImageName(''); }}
                  className="block text-xs font-bold text-red-500 hover:underline"
                >
                  Remove Image
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Favourite Toggles */}
        <Card title="Product Status & Flags">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => { setIsFavourite(!isFavourite); markDirty(); }}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm border transition-all ${
                isFavourite
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavourite ? 'fill-white' : ''}`} />
              <span>Mark as Favourite Product</span>
            </button>
          </div>
        </Card>

        {/* Notes Card */}
        <Card title="Internal Remarks" subtitle="e.g. Seasonal product, Premium quality.">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Write internal product notes here..."
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-market-700 focus:ring-4 focus:ring-market-100 transition-all"
          />
        </Card>

        {/* Action button controls */}
        <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-850 pt-4">
          <Link to="/products">
            <Button type="button" variant="secondary">
              <Undo className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Product Catalog'}
          </Button>
        </div>
      </form>
    </div>
  );
};
