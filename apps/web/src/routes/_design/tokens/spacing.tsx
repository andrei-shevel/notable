import { PageHeader } from '@/routes/_design/_layout';
import { Specimen } from '@/routes/_design/_specimen';

const SPACES = [
  { token: '0', px: 0 },
  { token: '1', px: 4 },
  { token: '2', px: 8 },
  { token: '3', px: 12 },
  { token: '4', px: 16 },
  { token: '5', px: 20 },
  { token: '6', px: 24 },
  { token: '8', px: 32 },
  { token: '10', px: 40 },
  { token: '12', px: 48 },
  { token: '14', px: 56 },
  { token: '16', px: 64 },
  { token: '20', px: 80 },
  { token: '30', px: 120 },
];

export function SpacingPage() {
  return (
    <>
      <PageHeader
        title="Spacing"
        description="4px-base scale. Use space tokens for padding, margin, and gap — never raw pixels."
      />
      {SPACES.map((s) => (
        <Specimen key={s.token} label={`--space-${s.token}`} code={`${s.px}px`}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              width: '100%',
            }}
          >
            <div
              style={{
                width: `${s.px}px`,
                height: '24px',
                backgroundColor: 'var(--accent)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
            <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              {s.px}px
            </code>
          </div>
        </Specimen>
      ))}
    </>
  );
}
