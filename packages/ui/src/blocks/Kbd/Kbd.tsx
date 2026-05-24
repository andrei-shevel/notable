import { Fragment } from 'react';
import cx from 'clsx';

import styles from './Kbd.module.scss';

export type KbdProps = {
  keys: string[];
  className?: string;
};

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
