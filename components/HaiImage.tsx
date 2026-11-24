'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { getPhotoAsset } from '@/lib/media';
import type { PhotoKey } from '@/types/hai';

interface HaiImageProps {
  photoKey: PhotoKey;
  customUrl?: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function HaiImage({
  photoKey,
  customUrl,
  alt,
  fill = false,
  width,
  height,
  className = '',
  priority = false,
  sizes,
}: HaiImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F3F3F1] to-[#E9E9EC] dark:from-[#22242A] dark:to-[#18191D] text-[#717680] dark:text-[#9CA3AF] ${fill ? 'absolute inset-0' : ''} ${className}`}
      >
        <ImageOff className="h-6 w-6 opacity-60 mb-1.5" strokeWidth={1.75} />
        <span className="text-xs font-medium px-3 text-center line-clamp-1">{alt}</span>
      </div>
    );
  }

  if (customUrl && customUrl.startsWith('data:image/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customUrl}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${fill ? 'absolute inset-0 h-full w-full' : ''} object-cover ${className}`}
      />
    );
  }

  const asset = getPhotoAsset(photoKey);

  return (
    <Image
      src={asset}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width ?? 800}
      height={fill ? undefined : height ?? 600}
      priority={priority}
      sizes={sizes ?? (fill ? '(max-width: 768px) 100vw, 50vw' : undefined)}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
}
