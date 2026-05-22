import { Fragment } from 'react';
import styles from './Kbd.module.scss';

export type KbdProps = {
  keys: string[];
  className?: string;
};

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Kbd({ keys, className }: KbdProps) {
  return (
    <span className={cx(styles.kbd, className)}>
      {keys.map((k, i) => (
        <Fragment key={`${k}-${i}`}>
          <kbd className={styles.key}>{k}</kbd>
        </Fragment>
      ))}
    </span>
  );
}
