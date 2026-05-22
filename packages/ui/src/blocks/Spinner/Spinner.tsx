import type { CSSProperties } from 'react';
import styles from './Spinner.module.scss';

export type SpinnerProps = {
  size?: 12 | 16 | 20;
  label?: string;
  className?: string;
};

export function Spinner({ size = 16, label = 'Loading', className }: SpinnerProps) {
  const borderWidth = size <= 12 ? 1.5 : 2;
  const style: CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderWidth: `${borderWidth}px`,
  };

  return (
    <span
      role="status"
      aria-label={label}
      className={[styles.spinner, className].filter(Boolean).join(' ')}
      style={style}
    />
  );
}
