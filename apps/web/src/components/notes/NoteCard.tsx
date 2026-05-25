import type { ButtonHTMLAttributes } from 'react';
import { FileText } from 'lucide-react';
import cx from 'clsx';

import type { FixtureNote } from '@/lib/fixtures';

import styles from './NoteCard.module.scss';

export type NoteCardProps = {
  note: FixtureNote;
  active?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export function NoteCard({ note, active, className, type, ...rest }: NoteCardProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cx(styles.card, active && styles.active, className)}
      aria-pressed={active ?? undefined}
      {...rest}
    >
      <div className={styles.row}>
        <h3 className={styles.title}>
          <FileText size={14} />
          <span>{note.title}</span>
        </h3>
        <time className={styles.time}>{note.timeLabel}</time>
      </div>
    </button>
  );
}
