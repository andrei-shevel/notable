import styles from './Brand.module.scss';

export function Brand() {
  return (
    <div className={styles.brand}>
      <div className={styles.mark}>N</div>
      <div className={styles.name}>Notable</div>
    </div>
  );
}
