import type { CSSProperties } from 'react';
import { Link } from 'wouter';
import cx from 'clsx';

import type { LucideIcon } from 'natural/icons';
import { Icon, type TagColor } from 'natural';

import { useWorkspaceNav } from '@/hooks/useWorkspaceNav';
import { scopesEqual, type WorkspaceScope } from '@/lib/scopes';

import styles from './NavItem.module.scss';

type Lead = { icon: LucideIcon; dotColor?: never } | { dotColor: TagColor; icon?: never };

export type NavItemProps = Lead & {
  scope: WorkspaceScope;
  label: string;
  count?: number;
  className?: string;
};

const DOT_VAR: Record<TagColor, string> = {
  blue: 'var(--tag-blue)',
  green: 'var(--tag-green)',
  pink: 'var(--tag-pink)',
  violet: 'var(--tag-violet)',
  neutral: 'var(--tag-neutral)',
};

export function NavItem({ scope, icon, dotColor, label, count, className }: NavItemProps) {
  const { scope: currentScope, linkTo } = useWorkspaceNav();
  const isActive = scopesEqual(currentScope, scope);

  const style = dotColor ? ({ '--nav-dot-color': DOT_VAR[dotColor] } as CSSProperties) : undefined;

  return (
    <Link
      href={linkTo({ scope })}
      className={cx(styles.item, isActive && styles.active, className)}
      aria-current={isActive ? 'page' : undefined}
      style={style}
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
    </Link>
  );
}
