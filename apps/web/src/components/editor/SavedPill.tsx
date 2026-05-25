import styles from './SavedPill.module.scss';

export type SavedPillProps = {
  label?: string;
};

export function SavedPill({ label = 'Saved 2m ago' }: SavedPillProps) {
  return (
    <span className={styles.pill}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  );
}
