import React from 'react';
import { ToastMessage } from '@/hooks/useToast';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl border flex items-start gap-3 transition-all duration-300 transform translate-y-0 ${
              isSuccess
                ? 'bg-emerald-900 text-white border-emerald-700'
                : isError
                ? 'bg-red-900 text-white border-red-700'
                : isWarning
                ? 'bg-amber-900 text-white border-amber-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />}
            {isError && <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />}
            {isWarning && <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />}
            {!isSuccess && !isError && !isWarning && <Info className="w-6 h-6 text-sky-400 shrink-0" />}

            <div className="flex-1">
              <h4 className="font-bold text-sm">{toast.title}</h4>
              {toast.message && <p className="text-xs opacity-90 mt-1">{toast.message}</p>}
            </div>

            <button
              onClick={() => onRemove(toast.id)}
              className="opacity-70 hover:opacity-100 p-1 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
