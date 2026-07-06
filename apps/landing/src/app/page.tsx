'use client';

import { Button, Tag } from '@notable/ui';

import styles from './page.module.scss';

export default function ComingSoonPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>N</span>
          <span className={styles.brandName}>Notable</span>
        </div>

        <Tag label="Coming soon" />

        <h1 className={styles.title}>A calm place for the work in your head.</h1>
        <p className={styles.sub}>
          A notes app built for writing, not arranging. A rich editor that gets out of the way, fast
          search across everything you&apos;ve ever written, and quiet sync between your devices.
          We&apos;re putting on the finishing touches.
        </p>

        <div className={styles.actions}>
          <Button asChild>
            <a href="/app/">Try the beta</a>
          </Button>
        </div>
      </div>

      <footer className={styles.footer}>© {new Date().getFullYear()} Notable</footer>
    </main>
  );
}
