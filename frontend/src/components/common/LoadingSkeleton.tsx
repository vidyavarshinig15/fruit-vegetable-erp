import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 4 }) => {
  return (
    <div className="space-y-4 w-full animate-pulse">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
      ))}
    </div>
  );
};
