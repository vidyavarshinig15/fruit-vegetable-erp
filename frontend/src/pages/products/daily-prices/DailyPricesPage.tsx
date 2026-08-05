import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import {
  TrendingUp,
  Save,
  ArrowLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

interface GridPriceRow {
  id: string;
  name: string;
  kannadaName?: string;
  unitType: string;
  originalDefaultRate: number;
  originalMinRate: number;
  newDefaultRate: number;
  newMinRate: number;
  remarks: string;
}

export const DailyPricesPage: React.FC = () => {
  const { activeShop } = useShop();
  const navigate = useNavigate();

  // Search filter
  const [search, setSearch] = useState('');

  // Data states
  const [rows, setRows] = useState<GridPriceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load products for the active shop context
  const loadProducts = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/products');
      if (res.data?.success && res.data?.data) {
        const prodList = res.data.data?.products || res.data.data || [];
        const mapped = (prodList as any[]).map((p) => ({
          id: p.id,
          name: p.name,
          kannadaName: p.kannadaName || '',
          unitType: p.unitType,
          originalDefaultRate: p.defaultRate,
          originalMinRate: p.minRate,
          newDefaultRate: p.defaultRate,
          newMinRate: p.minRate,
          remarks: '',
        }));
        setRows(mapped);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to retrieve products list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [activeShop]);

  // Handle changes in grid inputs
  const handleRateChange = (id: string, field: 'defaultRate' | 'minRate', value: number) => {
    // Flag window dirty
    (window as any).unsavedChanges = true;

    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          if (field === 'defaultRate') {
            return { ...row, newDefaultRate: value };
          } else {
            return { ...row, newMinRate: value };
          }
        }
        return row;
      })
    );
  };

  const handleRemarksChange = (id: string, value: string) => {
    (window as any).unsavedChanges = true;
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, remarks: value } : row))
    );
  };

  // Pre-validate grid prices before submit
  const preValidate = (): boolean => {
    for (const row of rows) {
      if (row.newDefaultRate <= 0 || row.newMinRate <= 0) {
        alert(`Validation error: Selling price and floor rates must be positive numbers for product "${row.name}".`);
        return false;
      }
      if (row.newMinRate > row.newDefaultRate) {
        alert(`Validation error: Floor rate cannot exceed the selling rate for product "${row.name}".`);
        return false;
      }
    }
    return true;
  };

  // Submit bulk price changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preValidate()) return;

    // Filter only modified rows to minimize payload and database activity
    const modified = rows.filter(
      (r) =>
        r.newDefaultRate !== r.originalDefaultRate ||
        r.newMinRate !== r.originalMinRate
    );

    if (modified.length === 0) {
      alert('No price changes detected.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = modified.map((r) => ({
        productId: r.id,
        defaultRate: r.newDefaultRate,
        minRate: r.newMinRate,
        remarks: r.remarks || 'Daily market rate update',
      }));

      const res = await api.post('/products/bulk-update', { updates });
      if (res.data?.success) {
        (window as any).unsavedChanges = false;
        alert(`Successfully updated rates for ${res.data.data.updatedCount} products!`);
        navigate('/products');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Bulk price updates failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered rows matching search query
  const filteredRows = rows.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Back button and page title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <Link to="/products" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase">
            <ArrowLeft className="w-4 h-4" /> Cancel & Return
          </Link>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mt-2">
            <TrendingUp className="w-8 h-8 text-market-700 dark:text-market-400" />
            Daily Prices Update Grid
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Updating prices for: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          variant="primary"
          disabled={isSaving || rows.length === 0}
          className="inline-flex items-center gap-2 shadow-lg py-2.5 px-6"
        >
          <Save className="w-5 h-5" /> {isSaving ? 'Saving Updates...' : 'Publish New Prices'}
        </Button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Local search input */}
      <Card className="p-4 bg-white dark:bg-slate-900">
        <div className="relative max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Quick search products in grid..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-market-700"
          />
        </div>
      </Card>

      {/* Editable bulk price list grid table */}
      {isLoading ? (
        <div className="p-12 text-center text-sm font-bold text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
          Loading active shop inventory catalog...
        </div>
      ) : filteredRows.length === 0 ? (
        <Card>
          <EmptyState
            title="No Matching Catalog Products"
            description="Clear search filters or add products in the catalog directory first."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-4 px-5">Product Details</th>
                  <th className="py-4 px-5">Unit</th>
                  <th className="py-4 px-5 text-right">Yesterday Selling Price</th>
                  <th className="py-4 px-5 text-center">New Selling Rate (₹)</th>
                  <th className="py-4 px-5 text-center">Floor Limit Price (₹)</th>
                  <th className="py-4 px-5">Price Variation Alert</th>
                  <th className="py-4 px-5">Reason Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const diff = row.newDefaultRate - row.originalDefaultRate;
                  const priceDirection =
                    diff > 0 ? (
                      <span className="text-red-500 font-extrabold flex items-center gap-1">
                        🔺 Price Increased (+₹{diff.toFixed(2)})
                      </span>
                    ) : diff < 0 ? (
                      <span className="text-emerald-500 font-extrabold flex items-center gap-1">
                        🔻 Price Decreased (₹{diff.toFixed(2)})
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold flex items-center gap-1">
                        ⚪ Price Unchanged
                      </span>
                    );

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors text-sm font-semibold"
                    >
                      {/* Name & Kannada Name */}
                      <td className="py-3 px-5">
                        <div className="font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                          {row.name}
                        </div>
                        {row.kannadaName && (
                          <span className="block text-xs font-medium text-slate-400">{row.kannadaName}</span>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-5">
                        <Badge variant="info">{row.unitType}</Badge>
                      </td>

                      {/* Yesterday Price */}
                      <td className="py-3 px-5 text-right font-bold text-slate-500 pr-10">
                        {formatCurrency(row.originalDefaultRate)}
                      </td>

                      {/* Edit New selling price */}
                      <td className="py-3 px-5 text-center w-[150px]">
                        <input
                          type="number"
                          step="0.01"
                          value={row.newDefaultRate || ''}
                          onChange={(e) => handleRateChange(row.id, 'defaultRate', Number(e.target.value))}
                          className="w-full text-center px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-market-700"
                        />
                      </td>

                      {/* Edit New floor limit price */}
                      <td className="py-3 px-5 text-center w-[150px]">
                        <input
                          type="number"
                          step="0.01"
                          value={row.newMinRate || ''}
                          onChange={(e) => handleRateChange(row.id, 'minRate', Number(e.target.value))}
                          className="w-full text-center px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-market-700"
                        />
                      </td>

                      {/* Price Direction Highlights */}
                      <td className="py-3 px-5">
                        {priceDirection}
                      </td>

                      {/* Reason remarks input */}
                      <td className="py-3 px-5">
                        <input
                          type="text"
                          placeholder="e.g. Market shortage"
                          value={row.remarks}
                          onChange={(e) => handleRemarksChange(row.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-market-700"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
