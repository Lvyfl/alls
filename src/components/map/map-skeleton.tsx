'use client';

interface MapSkeletonProps {
  className?: string;
}

export function MapSkeleton({ className = '' }: MapSkeletonProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="h-full w-full rounded-lg border-4 border-blue-600 bg-gray-100 animate-pulse">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded w-32 mx-auto mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-300 rounded w-24 mx-auto animate-pulse"></div>
          </div>
        </div>
        
        {/* Simulate map markers */}
        <div className="absolute top-1/4 left-1/3 w-6 h-6 bg-blue-300 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-6 h-6 bg-blue-300 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/2 w-6 h-6 bg-blue-300 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
}
