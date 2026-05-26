import type { AnchorHTMLAttributes } from 'react';
import { FileText } from 'lucide-react';
import { Link } from 'wouter';
import cx from 'clsx';

import type { FixtureNote } from '@/lib/fixtures';

import styles from './NoteCard.module.scss';

export type NoteCardProps = {
  note: FixtureNote;
  href: string;
  active?: boolean;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'>;

export function NoteCard({ note, href, active, className, ...rest }: NoteCardProps) {
  return (
    <Link
      href={href}
      replace
      className={cx(styles.card, active && styles.active, className)}
      aria-current={active ? 'true' : undefined}
      {...rest}
    >
      <div className={styles.row}>
        <h3 className={styles.title}>
          <FileText size={14} />
          <span>{note.title}</span>
        </h3>
        <time className={styles.time}>{note.timeLabel}</time>
      </div>
    </Link>
  );
}
