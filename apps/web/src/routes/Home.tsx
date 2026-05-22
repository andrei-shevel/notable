import { Link } from 'wouter';

export function Home() {
  return (
    <main
      style={{
        padding: 'var(--space-12)',
        maxWidth: '720px',
        margin: '0 auto',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--text-display-size)',
          fontWeight: 'var(--text-display-weight)',
          letterSpacing: 'var(--text-display-tracking)',
          lineHeight: 'var(--text-display-leading)',
          margin: '0 0 var(--space-4)',
        }}
      >
        Notable
      </h1>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 var(--space-6)' }}>
        Notes app — the workspace UI lands here once <code>docs/PLAN.md</code> step
        3+ is implemented.
      </p>
      {import.meta.env.DEV ? (
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Browse the design system at{' '}
          <Link
            href="/_design"
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
          >
            /_design
          </Link>
          .
        </p>
      ) : null}
    </main>
  );
}
