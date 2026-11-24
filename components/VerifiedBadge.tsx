'use client';

import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  showLabel?: boolean;
  inverted?: boolean;
  size?: 'sm' | 'md';
}

export function VerifiedBadge({
  showLabel = false,
  inverted = false,
  size = 'sm',
}: VerifiedBadgeProps) {
  const iconSize = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  const colorClass = inverted
    ? 'text-[#34D399]'
    : 'text-[#21866F] dark:text-[#34D399]';

  return (
    <span
      title="Profil verificat"
      aria-label="Profil verificat"
      className={`inline-flex items-center gap-1 shrink-0 ${colorClass}`}
    >
      <BadgeCheck className={iconSize} strokeWidth={2.2} />
      {showLabel && (
        <span className="text-xs font-medium whitespace-nowrap">Verificat</span>
      )}
    </span>
  );
}
