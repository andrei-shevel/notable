import type { AnchorHTMLAttributes } from 'react';
import { Link } from 'wouter';
import cx from 'clsx';

import type { Note } from '@notable/shared';

import { FileText } from 'natural/icons';

import { formatRelativeShort } from '@/lib/date';

import styles from './NoteCard.module.scss';

export type NoteCardProps = {
  note: Note;
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
        <time className={styles.time} dateTime={note.updatedAt}>
          {formatRelativeShort(note.updatedAt)}
        </time>
      </div>
      <p className={styles.preview}>{note.bodyText.slice(0, 200) || 'No content'}</p>
    </Link>
  );
}
