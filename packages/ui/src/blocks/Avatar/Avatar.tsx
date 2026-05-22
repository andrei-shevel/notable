import styles from './Avatar.module.scss';

export type AvatarSize = 'sm' | 'md' | 'lg';

export type AvatarProps = {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]![0] ?? '') + (parts[parts.length - 1]![0] ?? '')).toUpperCase();
}

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cx(styles.avatar, styles[`size-${size}`], className)}
      role="img"
      aria-label={name}
    >
      {src ? <img src={src} alt="" className={styles.image} /> : initials(name)}
    </span>
  );
}
