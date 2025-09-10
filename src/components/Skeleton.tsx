'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
}

interface DashboardSkeletonProps {
  showCharts?: boolean;
}

export function DashboardSkeleton({ showCharts = true }: DashboardSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Portfolio Overview Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-6 w-24 mx-auto mb-2" />
              <Skeleton className="h-8 w-32 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Cash Position Editors Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Cash Position Bar Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-8 w-full" />
      </div>

      {/* Charts Skeleton */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-64 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Holdings Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <Skeleton className="h-12 w-16" />
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Skeleton);
