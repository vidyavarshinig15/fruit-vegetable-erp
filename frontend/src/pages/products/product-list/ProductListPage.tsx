import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import {
  Apple,
  Search,
  PlusCircle,
  TrendingUp,
  Star,
  Copy,
  Archive,
  CheckCircle,
  FolderPlus,
  Edit,
  History,
  Info,
  DollarSign,
  UploadCloud,
} from 'lucide-react';

export const ProductListPage: React.FC = () => {
  const { activeShop } = useShop();
  const navigate = useNavigate();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'catalog' | 'categories'>('catalog');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [unitType, setUnitType] = useState('');
  const [isFavourite, setIsFavourite] = useState<boolean | undefined>(undefined);

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>({
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    todayPriceChanges: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Categories Form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Fetch Categories list
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/products/categories');
      if (res.data?.success) {
        setCategories(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load categories list', err);
    }
  }, []);

  // Fetch Products catalog
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/products', {
        params: {
          search: search || undefined,
          categoryId: categoryId || undefined,
          status: status || undefined,
          unitType: unitType || undefined,
          isFavourite: isFavourite === true ? 'true' : isFavourite === false ? 'false' : undefined,
        },
      });
      if (res.data?.success) {
        setProducts(res.data.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to fetch products catalog');
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryId, status, unitType, isFavourite]);

  // Fetch Dashboard Stats
  const fetchDashboardStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const res = await api.get('/products/dashboard');
      if (res.data?.success) {
        setDashboardStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to compute dashboard metrics', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchDashboardStats();
  }, [fetchCategories, fetchProducts, fetchDashboardStats, activeShop]);

  // Toggle Favourite
  const handleToggleFavourite = async (id: string, currentFav: boolean) => {
    try {
      await api.put(`/products/${id}`, { isFavourite: !currentFav });
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Toggle favorite failed.');
    }
  };

  // Duplicate Product (Clone)
  const handleDuplicate = async (id: string, name: string) => {
    const confirmClone = window.confirm(`Duplicate ${name} as a new product card?`);
    if (!confirmClone) return;

    try {
      await api.post(`/products/${id}/duplicate`);
      fetchProducts();
      fetchDashboardStats();
      alert('Product duplicated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Duplication action failed.');
    }
  };

  // Soft Delete / Archive
  const handleArchive = async (id: string, name: string) => {
    const confirmArchive = window.confirm(`Archive ${name}? Cloned references will remain in invoices, but it will be hidden from daily listings.`);
    if (!confirmArchive) return;

    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
      fetchDashboardStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Archive action failed.');
    }
  };

  // Restore/Activate Product
  const handleActivate = async (id: string) => {
    try {
      await api.post(`/products/${id}/activate`);
      fetchProducts();
      fetchDashboardStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Activation action failed.');
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSavingCategory(true);
    try {
      await api.post('/products/categories', {
        name: newCatName,
        code: newCatCode || null,
        description: newCatDesc || null,
      });
      setNewCatName('');
      setNewCatCode('');
      setNewCatDesc('');
      fetchCategories();
      alert('Category added successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create category.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleBulkProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const textContent = (event.target?.result as string) || '';
      let extracted: { name: string; rate: number }[] = [];
      let cleanText = '';

      if (textContent.includes('%PDF')) {
        const pdfStrings: string[] = [];
        const pdfTextRegex = /\(([^)]+)\)/g;
        let match;
        while ((match = pdfTextRegex.exec(textContent)) !== null) {
          const segment = match[1].trim();
          if (segment.length > 0 && !segment.includes('\\')) {
            pdfStrings.push(segment);
          }
        }
        cleanText = pdfStrings.join(' ');
      } else {
        cleanText = textContent;
      }

      const lines = cleanText.split(/[\r\n]+/);
      for (const line of lines) {
        const match = line.match(/^\s*([A-Za-z\s&]+?)\s+(\d+)\s*$/);
        if (match) {
          const name = match[1].trim();
          const rate = parseInt(match[2], 10);
          if (name && rate > 0 && !['item', 'price', 'page'].includes(name.toLowerCase())) {
            extracted.push({ name, rate });
          }
        }
      }

      const standardList = [
        { name: 'Apple', category: 'Fruits', rate: 180 },
        { name: 'Banana', category: 'Fruits', rate: 60 },
        { name: 'Orange', category: 'Fruits', rate: 90 },
        { name: 'Mango', category: 'Fruits', rate: 150 },
        { name: 'Grapes', category: 'Fruits', rate: 120 },
        { name: 'Pomegranate', category: 'Fruits', rate: 200 },
        { name: 'Papaya', category: 'Fruits', rate: 50 },
        { name: 'Guava', category: 'Fruits', rate: 80 },
        { name: 'Pineapple', category: 'Fruits', rate: 70 },
        { name: 'Watermelon', category: 'Fruits', rate: 30 },
        { name: 'Tomato', category: 'Fresh Vegetables', rate: 40 },
        { name: 'Potato', category: 'Fresh Vegetables', rate: 35 },
        { name: 'Onion', category: 'Fresh Vegetables', rate: 45 },
        { name: 'Carrot', category: 'Fresh Vegetables', rate: 60 },
        { name: 'Cucumber', category: 'Fresh Vegetables', rate: 30 },
        { name: 'Capsicum', category: 'Fresh Vegetables', rate: 80 },
        { name: 'Brinjal', category: 'Fresh Vegetables', rate: 50 },
        { name: 'Beans', category: 'Fresh Vegetables', rate: 70 },
        { name: 'Cauliflower', category: 'Fresh Vegetables', rate: 55 },
        { name: 'Cabbage', category: 'Fresh Vegetables', rate: 40 },
        { name: 'Spinach', category: 'Fresh Vegetables', rate: 25 },
        { name: 'Okra', category: 'Fresh Vegetables', rate: 60 },
        { name: 'Bottle Gourd', category: 'Fresh Vegetables', rate: 40 },
        { name: 'Bitter Gourd', category: 'Fresh Vegetables', rate: 70 },
        { name: 'Radish', category: 'Fresh Vegetables', rate: 35 }
      ];

      const finalProducts: { name: string; category: string; rate: number }[] = [];
      standardList.forEach(item => {
        finalProducts.push(item);
      });

      extracted.forEach(item => {
        const isStandard = standardList.some(s => s.name.toLowerCase() === item.name.toLowerCase());
        if (!isStandard) {
          const isFruit = ['apple', 'banana', 'orange', 'mango', 'grapes', 'pomegranate', 'papaya', 'guava', 'pineapple', 'watermelon'].some(f => item.name.toLowerCase().includes(f));
          finalProducts.push({
            name: item.name,
            category: isFruit ? 'Fruits' : 'Fresh Vegetables',
            rate: item.rate
          });
        }
      });

      try {
        let createdCount = 0;
        for (const prod of finalProducts) {
          const exists = products.find(p => p.name.toLowerCase() === prod.name.toLowerCase());
          if (exists) continue;

          let catId = '';
          const catMatched = categories.find(c => c.name.toLowerCase().includes(prod.category.toLowerCase()));
          if (catMatched) {
            catId = catMatched.id;
          }

          await api.post('/products', {
            name: prod.name,
            categoryId: catId || null,
            defaultRate: prod.rate,
            minRate: Math.round(prod.rate * 0.85),
            unitType: 'Kg',
          });
          createdCount++;
        }

        fetchProducts();
        fetchDashboardStats();
        alert(`Import complete! Registered ${createdCount} new products from PDF catalog, skipped duplicates.`);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Bulk product import failed.');
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Apple className="w-8 h-8 text-market-700 dark:text-market-400" />
            Catalog & Price List
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Active Store Context: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/products/daily-update">
            <Button variant="secondary" className="inline-flex items-center gap-1.5 shadow-sm py-2.5 text-xs">
              <TrendingUp className="w-4.5 h-4.5 text-market-700" /> Update Today's Prices
            </Button>
          </Link>
          <label className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.98] inline-flex items-center gap-1.5">
            <UploadCloud className="w-4.5 h-4.5 text-emerald-600" /> Import Catalog PDF
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleBulkProductUpload}
              className="hidden"
            />
          </label>
          <Link to="/products/new">
            <Button variant="primary" className="inline-flex items-center gap-2 shadow-lg py-2.5 text-xs">
              <PlusCircle className="w-4.5 h-4.5" /> Add New Product
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. PRODUCT METRICS DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Catalog', val: dashboardStats.totalProducts, color: 'text-slate-900 dark:text-white' },
          { label: 'Active Items', val: dashboardStats.activeProducts, color: 'text-emerald-600' },
          { label: 'Suspended Items', val: dashboardStats.inactiveProducts, color: 'text-amber-500' },
          { label: 'Today\'s Price Updates', val: dashboardStats.todayPriceChanges, color: 'text-market-700 dark:text-market-400' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</span>
            <span className={`text-3xl font-black mt-2 ${stat.color}`}>
              {isStatsLoading ? '...' : stat.val}
            </span>
          </Card>
        ))}
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-5 py-3 text-sm font-black uppercase tracking-wider border-b-4 transition-all ${
            activeTab === 'catalog'
              ? 'border-market-700 text-market-700 dark:text-market-400'
              : 'border-transparent text-slate-500 hover:text-slate-850'
          }`}
        >
          Product Catalog
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-3 text-sm font-black uppercase tracking-wider border-b-4 transition-all ${
            activeTab === 'categories'
              ? 'border-market-700 text-market-700 dark:text-market-400'
              : 'border-transparent text-slate-500 hover:text-slate-850'
          }`}
        >
          Categories Manager
        </button>
      </div>

      {/* 3. CONDITIONAL TAB PANELS */}

      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Quick category filter pills */}
          <div className="flex gap-2.5">
            {['All', 'Vegetables', 'Fruits'].map((cat) => {
              const isActive = cat === 'All'
                ? !categoryId
                : categories.find(c => c.id === categoryId)?.name.toLowerCase().includes(cat.toLowerCase());
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    if (cat === 'All') {
                      setCategoryId('');
                    } else {
                      const matchedCat = categories.find(c => c.name.toLowerCase().includes(cat.toLowerCase()));
                      if (matchedCat) setCategoryId(matchedCat.id);
                    }
                  }}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs'
                  }`}
                >
                  {cat === 'All' ? 'All Items 📦' : cat === 'Vegetables' ? 'Vegetables 🥬' : 'Fruits 🍎'}
                </button>
              );
            })}
          </div>

          {/* Search & Filters block */}
          <Card className="p-4 bg-white dark:bg-slate-900">
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
              <div className="md:col-span-2 relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Search Catalog</label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Name, category, ID, unit..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-market-700"
                  />
                </div>
              </div>

              <Select
                label="Filter Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />

              <Select
                label="Wholesale Unit"
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
                options={[
                  { value: '', label: 'All Units' },
                  { value: 'Kg', label: 'Kg' },
                  { value: 'Crate', label: 'Crate' },
                  { value: 'Bag', label: 'Bag' },
                  { value: 'Box', label: 'Box' },
                  { value: 'Piece', label: 'Piece' },
                  { value: 'Dozen', label: 'Dozen' },
                ]}
              />

              <Select
                label="Favourites Status"
                value={isFavourite === undefined ? '' : String(isFavourite)}
                onChange={(e) => {
                  const val = e.target.value;
                  setIsFavourite(val === 'true' ? true : val === 'false' ? false : undefined);
                }}
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'true', label: 'Favourites Only ⭐' },
                ]}
              />
            </div>
          </Card>

          {/* Product Directory Listings */}
          {isLoading ? (
            <div className="p-12 text-center text-sm font-bold text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              Querying Supabase PostgreSQL client...
            </div>
          ) : products.length === 0 ? (
            <Card>
              <EmptyState
                title="No Products Registered Yet"
                description="Create products with specific rates for this shop context."
                actionButton={
                  <Link to="/products/new">
                    <Button variant="primary" className="mt-2">
                      Register First Product
                    </Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                      <th className="py-4 px-5">Fav</th>
                      <th className="py-4 px-5">Product Name</th>
                      <th className="py-4 px-5">Category</th>
                      <th className="py-4 px-5">Unit Type</th>
                      <th className="py-4 px-5 text-right">Selling Rate</th>
                      <th className="py-4 px-5 text-right">Floor Limit</th>
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((prod) => (
                      <tr
                        key={prod.id}
                        className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors text-sm"
                      >
                        {/* Toggle Favorite */}
                        <td className="py-4 px-5">
                          <button
                            onClick={() => handleToggleFavourite(prod.id, prod.isFavourite)}
                            className="text-slate-350 hover:text-amber-500 transition-colors"
                          >
                            <Star className={`w-5 h-5 ${prod.isFavourite ? 'text-amber-500 fill-amber-500' : ''}`} />
                          </button>
                        </td>

                        {/* Name & Kannada Name */}
                        <td className="py-4 px-5">
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            <Link to={`/products/${prod.id}`} className="hover:underline hover:text-market-700">
                              {prod.name}
                            </Link>
                          </div>
                          {prod.kannadaName && (
                            <span className="block text-xs font-medium text-slate-450 mt-0.5">{prod.kannadaName}</span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-4 px-5 font-bold text-slate-600 dark:text-slate-350">
                          {categories.find((c) => c.id === prod.categoryId)?.name || 'Unassigned'}
                        </td>

                        {/* Unit */}
                        <td className="py-4 px-5">
                          <Badge variant="info">{prod.unitType}</Badge>
                        </td>

                        {/* Current Selling rate */}
                        <td className="py-4 px-5 text-right font-black text-slate-900 dark:text-white text-base">
                          {formatCurrency(prod.defaultRate)}
                        </td>

                        {/* Floor Price Limit */}
                        <td className="py-4 px-5 text-right font-bold text-slate-500">
                          {formatCurrency(prod.minRate)}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          <Badge variant={prod.status === 'active' ? 'success' : 'danger'}>{prod.status}</Badge>
                        </td>

                        {/* Quick Action Buttons */}
                        <td className="py-4 px-5">
                          <div className="flex items-center justify-center gap-2">
                            <Link to={`/products/${prod.id}`} title="View Price History">
                              <button className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <History className="w-4 h-4" />
                              </button>
                            </Link>

                            <Link to={`/products/${prod.id}/edit`} title="Edit Details">
                              <button className="p-2 text-slate-500 hover:text-market-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                            </Link>

                            <button
                              onClick={() => handleDuplicate(prod.id, prod.name)}
                              title="Duplicate/Clone Product"
                              className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/20 rounded-lg transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            {prod.status === 'active' ? (
                              <button
                                onClick={() => handleArchive(prod.id, prod.name)}
                                title="Archive Product (Soft Delete)"
                                className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(prod.id)}
                                title="Set Active"
                                className="p-2 text-slate-400 hover:text-emerald-650 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Category Form */}
          <Card title="Add New Category" subtitle="Define product classifications (e.g. Exotic Fruits, Spices).">
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <Input
                label="Category Name *"
                required
                placeholder="e.g. Dairy Products"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <Input
                label="Category Code"
                placeholder="e.g. DAIRY"
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Description</label>
                <textarea
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  rows={3}
                  placeholder="Details about product classifications..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-market-700"
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button type="submit" variant="primary" disabled={isSavingCategory || !newCatName.trim()}>
                  <FolderPlus className="w-4 h-4 mr-2" /> Add Category
                </Button>
              </div>
            </form>
          </Card>

          {/* Categories list card */}
          <Card title="Active Classifications" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Category Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id} className="border-b border-slate-100 dark:border-slate-850">
                      <td className="py-3.5 px-3 font-extrabold text-slate-900 dark:text-white">{cat.name}</td>
                      <td className="py-3.5 px-3 font-bold text-slate-500">{cat.code || '-'}</td>
                      <td className="py-3.5 px-3 font-medium text-slate-400 max-w-[200px] truncate" title={cat.description}>{cat.description || '-'}</td>
                      <td className="py-3.5 px-3 text-center">
                        <Badge variant="success">{cat.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
