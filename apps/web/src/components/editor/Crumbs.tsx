import { Fragment } from 'react';

import type { LucideIcon } from '@notable/ui/icons';

import { Pencil } from '@notable/ui/icons';
import { Icon } from '@notable/ui';

import styles from './Crumbs.module.scss';

export type CrumbsProps = {
  icon?: LucideIcon;
  /** Ordered trail; the final entry is rendered with the leaf style. */
  trail: string[];
  /**
   * If provided, the leaf becomes a clickable button (used by the editor to
   * open the title-edit modal).
   */
  onLeafClick?: () => void;
};

export function Crumbs({ icon, trail, onLeafClick }: CrumbsProps) {
  const last = trail.length - 1;
  return (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      {icon ? (
        <span className={styles.icon}>
          <Icon icon={icon} size={14} />
        </span>
      ) : null}
      {trail.map((crumb, i) => {
        const isLeaf = i === last;
        return (
          <Fragment key={`${crumb}-${i}`}>
            {i > 0 ? (
              <span className={styles.separator} aria-hidden="true">
                /
              </span>
            ) : null}
            {isLeaf && onLeafClick ? (
              <button
                type="button"
                className={styles.leafButton}
                onClick={onLeafClick}
                aria-label={`Edit title: ${crumb}`}
              >
                <span className={styles.leafText}>{crumb}</span>
                <span className={styles.leafEditIcon} aria-hidden="true">
                  <Icon icon={Pencil} size={12} />
                </span>
              </button>
            ) : (
              <span className={isLeaf ? styles.leaf : styles.crumb}>{crumb}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
