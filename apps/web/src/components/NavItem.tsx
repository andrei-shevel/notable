import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import cx from 'clsx';

import { Icon, type TagColor } from '@notable/ui';

import styles from './NavItem.module.scss';

type Lead = { icon: LucideIcon; dotColor?: never } | { dotColor: TagColor; icon?: never };

export type NavItemProps = Lead & {
  label: string;
  count?: number;
  active?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

const DOT_VAR: Record<TagColor, string> = {
  blue: 'var(--tag-blue)',
  green: 'var(--tag-green)',
  pink: 'var(--tag-pink)',
  violet: 'var(--tag-violet)',
  neutral: 'var(--tag-neutral)',
};

export function NavItem({
  icon,
  dotColor,
  label,
  count,
  active,
  className,
  type,
  ...rest
}: NavItemProps) {
  const style = dotColor ? ({ '--nav-dot-color': DOT_VAR[dotColor] } as CSSProperties) : undefined;

  return (
    <button
      type={type ?? 'button'}
      className={cx(styles.item, active && styles.active, className)}
      aria-current={active ? 'page' : undefined}
      style={style}
      {...rest}
    >
      {icon ? (
        <span className={styles.icon}>
          <Icon icon={icon} />
        </span>
      ) : (
        <span className={styles.dot} aria-hidden="true" />
      )}
      <span className={styles.label}>{label}</span>
      {count !== undefined ? <span className={styles.count}>{count}</span> : null}
    </button>
  );
}
