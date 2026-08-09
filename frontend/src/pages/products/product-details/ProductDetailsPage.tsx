import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useShop } from '@/contexts/ShopContext';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import {
  Apple,
  Edit,
  History,
  Info,
  DollarSign,
  Star,
  Copy,
  Archive,
  ArrowLeft,
  Calendar,
  MessageSquare,
  Trash2,
} from 'lucide-react';

export const ProductDetailsPage: React.FC = () => {
  const { activeShop } = useShop();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data states
  const [product, setProduct] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch product data and categories
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Parallel fetches
      const [prodRes, histRes, catRes] = await Promise.all([
        api.get(`/products/${id}`),
        api.get(`/products/${id}/history`),
        api.get('/products/categories'),
      ]);

      if (prodRes.data?.success) {
        setProduct(prodRes.data.data);
      }
      if (histRes.data?.success) {
        setHistory(histRes.data.data || []);
      }
      if (catRes.data?.success) {
        setCategories(catRes.data.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to retrieve product details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Duplicate Product
  const handleDuplicate = async () => {
    if (!product) return;
    const confirmClone = window.confirm(`Clone this product card?`);
    if (!confirmClone) return;

    try {
      const res = await api.post(`/products/${product.id}/duplicate`);
      if (res.data?.success) {
        alert('Product duplicated successfully!');
        navigate(`/products/${res.data.data.id}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Duplication action failed.');
    }
  };

  // Archive Soft Delete
  const handleArchive = async () => {
    if (!product) return;
    const confirmArchive = window.confirm(`Are you sure you want to delete "${product.name}"? Historical invoice records will remain intact, but it will be hidden from future catalog listings.`);
    if (!confirmArchive) return;

    try {
      await api.delete(`/products/${product.id}`);
      navigate('/products');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-bold text-slate-400">
        Loading product details file...
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
        {errorMsg || 'Product not found or access forbidden.'}
        <div className="mt-4">
          <Link to="/products">
            <Button variant="secondary">Back to Catalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const categoryName = categories.find((c) => c.id === product.categoryId)?.name || 'Unassigned';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button link */}
      <div className="flex items-center justify-between">
        <Link to="/products" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
        
        <div className="flex items-center gap-2">
          <Link to={`/products/${product.id}/edit`}>
            <Button variant="secondary" size="sm" className="inline-flex items-center gap-1.5 font-bold py-2 text-xs">
              <Edit className="w-4 h-4" /> Edit Details
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={handleDuplicate} className="inline-flex items-center gap-1.5 font-bold py-2 text-xs text-sky-700">
            <Copy className="w-4 h-4" /> Duplicate
          </Button>
          <Button variant="secondary" size="sm" onClick={handleArchive} className="inline-flex items-center gap-1.5 font-bold py-2 text-xs text-rose-700">
            <Trash2 className="w-4 h-4" /> Delete Product
          </Button>
        </div>
      </div>

      {/* Product profile details overview banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-6 flex-col sm:flex-row text-center sm:text-left">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-24 h-24 object-cover border-2 border-slate-200 rounded-2xl shrink-0"
            />
          ) : (
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center text-slate-400 text-xs shrink-0 font-bold uppercase">
              No Photo
            </div>
          )}
          
          <div>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-1.5">
              <Badge variant="info">{categoryName}</Badge>
              {product.isFavourite && (
                <Badge variant="warning" className="bg-amber-50 text-amber-700 font-extrabold flex items-center gap-0.5 border-amber-250">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> FAVOURITE
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{product.name}</h1>
            {product.kannadaName && (
              <span className="block text-base font-extrabold text-slate-500 mt-0.5">{product.kannadaName}</span>
            )}
            
            <p className="text-xs text-slate-400 font-medium mt-2">
              Code: <span className="font-extrabold text-slate-650">{product.code || 'Uncoded'}</span> | Created: {new Date(product.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Dynamic rates widget */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/20 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl shrink-0 w-full md:w-auto shadow-inner">
          <div className="text-center border-r border-slate-200 dark:border-slate-800 pr-4">
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Selling Rate</span>
            <span className="block text-2xl font-black text-market-700 dark:text-market-400 mt-1">{formatCurrency(product.defaultRate)}</span>
            <span className="block text-[10px] text-slate-400 font-bold mt-0.5">Per {product.unitType}</span>
          </div>
          <div className="text-center pl-2">
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Floor Rate Limit</span>
            <span className="block text-2xl font-black text-amber-600 mt-1">{formatCurrency(product.minRate)}</span>
            <span className="block text-[10px] text-slate-400 font-bold mt-0.5">Per {product.unitType}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item Descriptions/Notes card */}
        <div className="space-y-6">
          <Card title="Product Specifications">
            <div className="space-y-4 text-sm font-bold text-slate-700 dark:text-slate-350">
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-slate-400 text-xs font-semibold uppercase">Internal Notes</span>
                  <span className="block text-slate-900 dark:text-white mt-1 leading-relaxed">
                    {product.notes || 'No description notes.'}
                  </span>
                </div>
              </div>

              {product.description && (
                <div className="flex items-start gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-850">
                  <MessageSquare className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-slate-400 text-xs font-semibold uppercase">Category description</span>
                    <span className="block text-slate-900 dark:text-white mt-1 leading-relaxed">
                      {product.description}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Price history logs card */}
        <div className="lg:col-span-2">
          <Card title="Historical Price Variances" subtitle="Track all modifications logged to default selling rate.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3">Effective Date</th>
                    <th className="py-3 px-3 text-right">Old Price</th>
                    <th className="py-3 px-3 text-right">New Price</th>
                    <th className="py-3 px-3 text-right">Change (₹)</th>
                    <th className="py-3 px-3">Reason / Remarks</th>
                    <th className="py-3 px-3">Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm font-semibold text-slate-400">
                        No price updates logged.
                      </td>
                    </tr>
                  ) : (
                    history.map((log, index) => {
                      const nextLog = history[index + 1];
                      const oldPrice = nextLog ? nextLog.ratePerUnit : null;
                      const diff = oldPrice !== null ? log.ratePerUnit - oldPrice : 0;
                      
                      return (
                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-850 text-sm font-semibold">
                          <td className="py-3.5 px-3 text-slate-650 flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {new Date(log.effectiveDate).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-400">
                            {oldPrice !== null ? formatCurrency(oldPrice) : 'Base Rate'}
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-slate-900 dark:text-white">
                            {formatCurrency(log.ratePerUnit)}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            {oldPrice !== null ? (
                              diff > 0 ? (
                                <span className="text-red-500 font-extrabold">+{formatCurrency(diff)} 🔺</span>
                              ) : diff < 0 ? (
                                <span className="text-emerald-500 font-extrabold">{formatCurrency(diff)} 🔻</span>
                              ) : (
                                <span className="text-slate-400 font-bold">Unchanged</span>
                              )
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 italic">
                            {log.remarks || 'Standard update'}
                          </td>
                          <td className="py-3.5 px-3 font-bold text-market-700">
                            {log.createdByName}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
