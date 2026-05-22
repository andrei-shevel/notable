import styles from './Tag.module.scss';

export type TagColor = 'blue' | 'green' | 'pink' | 'violet' | 'neutral';
export type TagSize = 'sm' | 'md';

export type TagProps = {
  label: string;
  color?: TagColor;
  size?: TagSize;
  translucent?: boolean;
  className?: string;
};

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Tag({
  label,
  color = 'neutral',
  size = 'md',
  translucent = false,
  className,
}: TagProps) {
  return (
    <span
      className={cx(
        styles.tag,
        styles[`size-${size}`],
        styles[`color-${color}`],
        translucent && styles.translucent,
        className,
      )}
    >
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  );
}
