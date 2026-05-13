'use client';

import { cn } from '@/lib/utils';

interface LoopVideoProps {
  src: string;
  /** Optional poster image shown before video loads */
  poster?: string;
  /** Tailwind classes for the wrapping div */
  className?: string;
  /** Tailwind classes for the <video> element itself */
  videoClassName?: string;
  /** object-fit on the video (default: cover) */
  fit?: 'cover' | 'contain';
}

/**
 * Reusable looping, autoplaying, MUTED video. Always silent, always plays
 * inline (mobile-safe). Use this anywhere we want ambient motion.
 */
export function LoopVideo({
  src,
  poster,
  className,
  videoClassName,
  fit = 'cover',
}: LoopVideoProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <video
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        // disable picture-in-picture & download UI hints
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden="true"
        className={cn(
          'h-full w-full',
          fit === 'cover' ? 'object-cover' : 'object-contain',
          videoClassName
        )}
      />
    </div>
  );
}
