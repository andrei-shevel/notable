import { Fragment } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '@notable/ui';
import styles from './Crumbs.module.scss';

export type CrumbsProps = {
  icon?: LucideIcon;
  /** Ordered trail; the final entry is rendered with the leaf style. */
  trail: string[];
};

export function Crumbs({ icon, trail }: CrumbsProps) {
  const last = trail.length - 1;
  return (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      {icon ? (
        <span className={styles.icon}>
          <Icon icon={icon} size={14} />
        </span>
      ) : null}
      {trail.map((crumb, i) => (
        <Fragment key={`${crumb}-${i}`}>
          {i > 0 ? (
            <span className={styles.separator} aria-hidden="true">
              /
            </span>
          ) : null}
          <span className={i === last ? styles.leaf : styles.crumb}>{crumb}</span>
        </Fragment>
      ))}
    </nav>
  );
}
