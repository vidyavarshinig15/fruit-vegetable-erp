import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Page Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          The route you are looking for does not exist in the billing terminal.
        </p>
        <Link to="/dashboard">
          <Button variant="primary" fullWidth className="inline-flex items-center justify-center gap-2">
            <Home className="w-5 h-5" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
