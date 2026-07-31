import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">401 Unauthorized</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Your authentication session has expired or is invalid. Please log in again to access the terminal.
        </p>
        <Link to="/login">
          <Button variant="primary" fullWidth className="inline-flex items-center justify-center gap-2">
            <ArrowLeft className="w-5 h-5" /> Return to Login
          </Button>
        </Link>
      </div>
    </div>
  );
};
