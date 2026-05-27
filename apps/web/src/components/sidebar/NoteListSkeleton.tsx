import styles from './NoteListSkeleton.module.scss';

// Stable, hand-picked widths so the skeleton title bars look like a real
// list of varying-length titles. Deterministic order avoids re-renders
// shuffling on every tick.
const WIDTHS = ['78%', '62%', '85%', '55%', '70%', '48%'];

export function NoteListSkeleton({ count = WIDTHS.length }: { count?: number } = {}) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.bar} style={{ width: WIDTHS[i % WIDTHS.length] }} />
          <div className={styles.time} />
        </div>
      ))}
    </div>
  );
}
