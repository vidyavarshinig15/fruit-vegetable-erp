import React from 'react';
import { cn } from '@/utils/cn';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
    <table className={cn('w-full text-left border-collapse text-base', className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <thead className={cn('bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider font-extrabold text-slate-700 dark:text-slate-300', className)} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <tbody className={cn('divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900', className)} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => (
  <tr className={cn('hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors', className)} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <th className={cn('px-6 py-4 font-bold text-slate-900 dark:text-slate-100', className)} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <td className={cn('px-6 py-4 text-slate-800 dark:text-slate-200 font-medium', className)} {...props}>
    {children}
  </td>
);
