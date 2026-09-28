import { cn } from '@/lib/utils';

/**
 * Skeleton primitive — a soft-pulsing block used inside loading.tsx files.
 * Sits on the white ground or a milk panel as a placeholder, not a real card.
 */
export function Shimmer({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse rounded-inner bg-ink/[0.06]',
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
