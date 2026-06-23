import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  key?: any;
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-zinc-800/80',
        className
      )}
    />
  );
}

export function PostSkeleton() {
  return (
    <div className="p-4 border-b border-zinc-900 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-16 h-3" />
        </div>
      </div>
      <Skeleton className="w-full aspect-video rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-1/2 h-4" />
      </div>
    </div>
  );
}

export function StorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 px-1">
      <Skeleton className="w-16 h-16 rounded-full" />
      <Skeleton className="w-12 h-3" />
    </div>
  );
}
