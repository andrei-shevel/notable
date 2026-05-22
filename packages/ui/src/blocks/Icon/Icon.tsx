import { forwardRef } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

export type IconProps = {
  icon: LucideIcon;
  size?: number;
} & Omit<LucideProps, 'ref' | 'size'>;

// Thin wrapper around lucide-react icons. Centralises defaults
// (16px / currentColor / stroke 2) and gives every consumer a single
// import path so swapping the underlying icon set later is one change.
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { icon: IconComponent, size = 16, strokeWidth = 2, ...rest },
  ref,
) {
  return (
    <IconComponent
      ref={ref}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
});
