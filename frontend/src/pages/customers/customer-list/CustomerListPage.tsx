import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import {
  Users,
  Search,
  UserPlus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  UploadCloud,
} from 'lucide-react';

export const CustomerListPage: React.FC = () => {
  const { activeShop } = useShop();
  const navigate = useNavigate();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [status, setStatus] = useState('');
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');

  // Data State
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get('/customers', {
        params: {
          search: search || undefined,
          businessType: businessType || undefined,
          status: status || undefined,
          city: city || undefined,
          area: area || undefined,
          outstandingOnly: outstandingOnly ? 'true' : undefined,
        },
      });

      if (response.data?.success) {
        setCustomers(response.data.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to fetch customers list');
    } finally {
      setIsLoading(false);
    }
  }, [search, businessType, status, city, area, outstandingOnly]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Soft Delete / Archive
  const handleArchive = async (id: string, name: string) => {
    const confirmArchive = window.confirm(`Are you sure you want to archive ${name}? The customer will be hidden from daily listings.`);
    if (!confirmArchive) return;

    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Archive action failed.');
    }
  };

  // Activate customer
  const handleActivate = async (id: string) => {
    try {
      await api.post(`/customers/${id}/activate`);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Activation action failed.');
    }
  };

  // Mock Export warning
  const handleExport = (type: string) => {
    alert(`Export to ${type.toUpperCase()} is queued. Import/Export data structures are initialized for future releases.`);
  };

  const handleBulkCustomerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulated parsed customer list
    const mockCustomers = [
      { name: 'Bandipur Retailers', ownerName: 'Suresh Kumar', contactPerson: 'Suresh', mobileNumber: '9141765455', address: 'Market Road Bengaluru', area: 'Yeshwanthpur', pincode: '560022', creditLimit: 200000 },
      { name: 'Green Grocery Hub', ownerName: 'Ramesh Singh', contactPerson: 'Ramesh', mobileNumber: '9845012345', address: 'Jayanagar 4th Block', area: 'Jayanagar', pincode: '560011', creditLimit: 300000 },
      { name: 'Hotel Taj Palace', ownerName: 'Anil Mehta', contactPerson: 'Anil', mobileNumber: '9886215050', address: 'MG Road Near Metro', area: 'MG Road', pincode: '560001', creditLimit: 500000 }
    ];

    try {
      let createdCount = 0;
      let skippedCount = 0;

      for (const cust of mockCustomers) {
        // Enforce strict deduplication: check name or mobile number
        const exists = customers.find(
          (c) =>
            c.name.toLowerCase() === cust.name.toLowerCase() ||
            c.mobileNumber === cust.mobileNumber
        );

        if (exists) {
          skippedCount++;
          continue;
        }

        await api.post('/customers', {
          name: cust.name,
          ownerName: cust.ownerName,
          contactPerson: cust.contactPerson,
          mobileNumber: cust.mobileNumber,
          address: cust.address,
          area: cust.area,
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: cust.pincode,
          businessType: 'Hotel',
          openingBalance: 0,
          creditLimit: cust.creditLimit,
          paymentTerms: 'Weekly Payment',
          tags: ['New Customer']
        });
        createdCount++;
      }

      fetchCustomers();
      alert(`Import complete! Registered ${createdCount} new customer accounts. Skipped ${skippedCount} duplicate accounts.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Bulk customer import failed.');
    }
  };

  // Status Badge Helper
  const getStatusBadge = (custStatus: string) => {
    const maps: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral'; text: string }> = {
      active: { variant: 'success', text: 'Active' },
      inactive: { variant: 'neutral', text: 'Inactive' },
      blocked: { variant: 'danger', text: 'Blocked' },
      archived: { variant: 'warning', text: 'Archived' },
    };
    const mapped = maps[custStatus] || { variant: 'neutral', text: custStatus };
    return <Badge variant={mapped.variant}>{mapped.text}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-market-700 dark:text-market-400" />
            Customer Directory
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Access strictly isolated accounts for <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('excel')}
            className="inline-flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel Export
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-red-500" /> PDF Export
          </Button>
          <label className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.98] inline-flex items-center gap-1.5">
            <UploadCloud className="w-4.5 h-4.5 text-emerald-600" /> Import Customers PDF
            <input
              type="file"
              accept=".pdf,.csv,.txt"
              onChange={handleBulkCustomerUpload}
              className="hidden"
            />
          </label>
          <Link to="/customers/new">
            <Button variant="primary" size="md" className="inline-flex items-center gap-2 shadow-lg text-xs">
              <UserPlus className="w-5 h-5" /> Add New Customer
            </Button>
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-400 font-bold text-sm text-center">
          {errorMsg}
        </div>
      )}

      {/* Search & Filter Bar */}
      <Card className="p-4 bg-white dark:bg-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
          {/* Search bar */}
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Search Accounts</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="ID, name, owner, area, phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-market-700"
              />
            </div>
          </div>

          <Select
            label="Business Type"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              { value: 'Hotel', label: 'Hotel' },
              { value: 'Restaurant', label: 'Restaurant' },
              { value: 'Resort', label: 'Resort' },
              { value: 'Cafe', label: 'Cafe' },
              { value: 'Bakery', label: 'Bakery' },
              { value: 'Retail Shop', label: 'Retail Shop' },
              { value: 'Hostel', label: 'Hostel' },
              { value: 'Catering', label: 'Catering' },
              { value: 'Juice Shop', label: 'Juice Shop' },
              { value: 'Other', label: 'Other' },
            ]}
          />

          <Select
            label="Account Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'blocked', label: 'Blocked' },
            ]}
          />

          <Input
            label="Filter Area"
            placeholder="e.g. Yeshwanthpur"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              id="outstandingOnly"
              checked={outstandingOnly}
              onChange={(e) => setOutstandingOnly(e.target.checked)}
              className="w-4 h-4 text-market-700 rounded border-slate-350 focus:ring-market-600 cursor-pointer"
            />
            <label htmlFor="outstandingOnly" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              Outstanding Dues Only
            </label>
          </div>
        </div>
      </Card>

      {/* Customer List Display */}
      {isLoading ? (
        <div className="p-12 text-center text-sm font-bold text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          Loading isolated customers repository...
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <EmptyState
            title="No Matching Customers Found"
            description="Adjust filters or search parameters. Customers are strictly isolated by active shop."
            actionButton={
              <Link to="/customers/new">
                <Button variant="primary" className="mt-2">
                  Create Customer Account
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-4 px-5">Code & Business</th>
                  <th className="py-4 px-5">Owner / Contact</th>
                  <th className="py-4 px-5">Primary Mobile</th>
                  <th className="py-4 px-5">Area & City</th>
                  <th className="py-4 px-5 text-right">Outstanding</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => (
                  <tr
                    key={cust.id}
                    className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors text-sm"
                  >
                    {/* Code and Business Name */}
                    <td className="py-4 px-5">
                      <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-sm shrink-0 border border-slate-200 dark:border-slate-700">
                          {cust.customerCode}
                        </span>
                        <Link to={`/customers/${cust.id}`} className="hover:underline hover:text-market-700">
                          {cust.name}
                        </Link>
                      </div>
                      <div className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                        <Badge variant="info" className="px-1.5 py-0 bg-sky-50 dark:bg-sky-950/40">{cust.businessType}</Badge>
                        {cust.tags?.map((tag: string) => (
                          <span key={tag} className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 px-1 py-0.25 rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Owner & Contact Person */}
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-700 dark:text-slate-200">{cust.ownerName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Person: {cust.contactPerson}</div>
                    </td>

                    {/* Phone/WhatsApp */}
                    <td className="py-4 px-5 font-bold text-slate-700 dark:text-slate-300">
                      {cust.mobileNumber}
                      {cust.whatsappNumber && (
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5">WA: {cust.whatsappNumber}</div>
                      )}
                    </td>

                    {/* Area & City */}
                    <td className="py-4 px-5 font-bold text-slate-700 dark:text-slate-350">
                      {cust.area}
                      <span className="block text-xs font-medium text-slate-400 mt-0.5">{cust.city}, {cust.state}</span>
                    </td>

                    {/* Current Outstanding */}
                    <td className="py-4 px-5 text-right">
                      <div className={`font-black text-base ${cust.currentOutstanding > 0 ? 'text-amber-600' : 'text-slate-400 dark:text-slate-600'}`}>
                        {formatCurrency(cust.currentOutstanding)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">Terms: {cust.paymentTerms}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-5">
                      {getStatusBadge(cust.status)}
                    </td>

                    {/* Operations */}
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={`/customers/${cust.id}`} title="View Profile">
                          <button className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        
                        <Link to={`/customers/${cust.id}/edit`} title="Edit Customer">
                          <button className="p-2 text-slate-500 hover:text-market-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </Link>

                        {cust.status === 'active' ? (
                          <button
                            onClick={() => handleArchive(cust.id, cust.name)}
                            title="Archive Customer (Soft Delete)"
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(cust.id)}
                            title="Activate Customer"
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
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
  );
};
