import type { ReactNode } from 'react';
import styles from './_specimen.module.scss';

type SpecimenProps = {
  label?: string;
  code?: string;
  vertical?: boolean;
  children: ReactNode;
};

export function Specimen({ label, code, vertical, children }: SpecimenProps) {
  return (
    <div className={styles.specimen}>
      <div
        className={[styles.stage, vertical ? styles['stage-vertical'] : '']
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
      {label || code ? (
        <div className={styles.label}>
          {label ? <span className={styles['label-text']}>{label}</span> : null}
          {code ? <code>{code}</code> : null}
        </div>
      ) : null}
    </div>
  );
}

type ThemedPairProps = { children: ReactNode };

// Renders the same content twice — once light, once dark — by wrapping each
// half with [data-theme] so the semantic layer overrides the OS preference.
export function ThemedPair({ children }: ThemedPairProps) {
  return (
    <div className={styles['themed-pair']}>
      <div data-theme="light">{children}</div>
      <div data-theme="dark">{children}</div>
    </div>
  );
}
