import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">403 Access Denied</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          You do not have permission to access this shop area or administrative setting.
        </p>
        <Link to="/dashboard">
          <Button variant="primary" fullWidth className="inline-flex items-center justify-center gap-2">
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
