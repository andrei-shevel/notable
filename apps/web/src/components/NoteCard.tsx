import type { ButtonHTMLAttributes } from 'react';
import { findFixtureTag, type FixtureNote } from '../lib/fixtures';
import styles from './NoteCard.module.scss';

export type NoteCardProps = {
  note: FixtureNote;
  active?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function NoteCard({ note, active, className, type, ...rest }: NoteCardProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cx(styles.card, active && styles.active, className)}
      aria-pressed={active ?? undefined}
      {...rest}
    >
      <div className={styles.row}>
        <h3 className={styles.title}>{note.title}</h3>
        <time className={styles.time}>{note.timeLabel}</time>
      </div>
      <p className={styles.preview}>{note.preview}</p>
      {note.tagIds.length > 0 ? (
        <div className={styles.tags}>
          {note.tagIds.map((id) => {
            const tag = findFixtureTag(id);
            return tag ? (
              <span key={id} className={styles.chip}>
                {tag.name}
              </span>
            ) : null;
          })}
        </div>
      ) : null}
    </button>
  );
}
