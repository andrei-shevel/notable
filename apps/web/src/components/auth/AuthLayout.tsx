import type { PropsWithChildren } from 'react';

import { Brand } from '../common/Brand';

import styles from './AuthLayout.module.scss';

type AuthLayoutProps = PropsWithChildren<{ title?: string }>;

export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Brand />
        </div>
        {title ? <h1 className={styles.title}>{title}</h1> : null}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
