import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useShop } from '@/contexts/ShopContext';
import { api } from '@/api/client';
import { UploadCloud, ArrowLeft, AlertCircle, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

export const OrderUploadPage: React.FC = () => {
  const { activeShop } = useShop();
  const navigate = useNavigate();

  // Selection state
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);

  // Ingest upload state
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load active shop customers
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/customers');
        if (res.data?.success) {
          setCustomers((res.data.data || []).filter((c: any) => c.status === 'active'));
        }
      } catch (err) {
        console.error('Failed to retrieve customers', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, [activeShop]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const allowedExtensions = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedExtensions.includes(file.type)) {
      setErrorMsg('Invalid format: Only PDF documents and PNG/JPEG/WEBP orders are supported.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('Size limit exceeded: Order file exceeds the maximum 20MB limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setSuccessMsg(`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !selectedFile) return;

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const base64Data = await fileToBase64(selectedFile);
      
      const payload = {
        customerId,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSizeBytes: selectedFile.size,
        fileData: base64Data,
      };

      const res = await api.post('/orders', payload);
      if (res.data?.success && res.data?.data) {
        alert('File ingested successfully. Proceeding to verification page...');
        navigate(`/orders/${res.data.data.id}/verify`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Ingestion upload failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <Link to="/orders" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase">
            <ArrowLeft className="w-4 h-4" /> Back to Queue
          </Link>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2 flex items-center gap-2">
            <UploadCloud className="w-8 h-8 text-market-700 dark:text-market-400" />
            Upload Customer Order File
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Ingesting for: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-400 font-bold text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {isProcessing ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm flex flex-col justify-center items-center">
          <UploadCloud className="w-16 h-16 text-market-700 dark:text-market-400 animate-bounce" />
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">OCR Ingestion & Match Processing</h3>
          <p className="text-sm font-bold text-slate-450 max-w-[325px]">
            Reading document streams, matching items to active catalog catalog rates...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Party Selection */}
          <Card title="Billing buyer select" subtitle="Identify the customer ordering this shipment.">
            <div className="max-w-md">
              <Select
                label="Select Wholesale Customer *"
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={[
                  { value: '', label: 'Select Buyer Account' },
                  ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.name}` })),
                ]}
              />
            </div>
          </Card>

          {/* Drag & Drop Card */}
          <Card title="Order Document Dropzone" subtitle="Upload PDF or Images (PNG/JPEG/WEBP, 20MB limit)">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-4 border-dashed rounded-3xl p-12 text-center transition-all flex flex-col justify-center items-center cursor-pointer ${
                dragOver
                  ? 'border-market-700 bg-market-50/20'
                  : 'border-slate-250 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                accept="application/pdf, image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer space-y-4 flex flex-col items-center">
                <UploadCloud className="w-16 h-16 text-slate-400" />
                <div>
                  <span className="block text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Drag and Drop Order Document here
                  </span>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    or click to browse local files
                  </span>
                </div>
              </label>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-850">
            <Link to="/orders">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={!customerId || !selectedFile}
              className="inline-flex items-center gap-2 shadow-lg"
            >
              <UploadCloud className="w-4.5 h-4.5" /> Start OCR match
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
