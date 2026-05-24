import { Spinner } from '@notable/ui';

import styles from './FullPageSpinner.module.scss';

type FullPageSpinnerProps = { label: string };

export function FullPageSpinner({ label }: FullPageSpinnerProps) {
  return (
    <div className={styles.fullPage} role="status" aria-live="polite">
      <Spinner size={20} label={label} />
    </div>
  );
}
