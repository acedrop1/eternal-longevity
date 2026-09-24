import { cn } from '@/lib/utils';

/**
 * Skeleton primitive — a soft-pulsing block used inside loading.tsx files.
 * Sits on the white ground or a #F2F2F0 panel as a placeholder, not a real card.
 */
export function Shimmer({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse rounded-[2px] bg-black/[0.07]',
        className,
      )}
      {...rest}
    />
  );
}

/** Convenience: a rectangular bar at a given height/width. */
export function ShimmerBar({
  h = '12px',
  w = '100%',
  className,
}: {
  h?: string;
  w?: string;
  className?: string;
}) {
  return (
    <Shimmer
      style={{ height: h, width: w }}
      className={cn('rounded-full', className)}
    />
  );
}
