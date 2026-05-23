import { PageHeader, SectionTitle } from '../_layout';
import { ThemedPair } from '../_specimen';
import styles from './colors.module.scss';

const STONE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const AMBER = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const RED = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const SEMANTIC_TOKENS = [
  '--bg',
  '--surface',
  '--surface-2',
  '--border',
  '--border-strong',
  '--text',
  '--text-muted',
  '--text-faint',
  '--accent',
  '--accent-soft',
  '--accent-strong',
  '--danger',
  '--danger-soft',
  '--tag-blue',
  '--tag-green',
  '--tag-pink',
  '--tag-violet',
];

function Ramp({ name, shades }: { name: string; shades: readonly number[] }) {
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <p className={styles['ramp-name']}>--color-{name}-50…950</p>
      <div className={styles['swatch-grid']}>
        {shades.map((shade) => {
          const token = `--color-${name}-${shade}`;
          return (
            <div
              key={shade}
              className={styles.swatch}
              style={{ backgroundColor: `var(${token})` }}
              title={token}
            >
              <span className={styles['swatch-label']}>{shade}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SemanticList() {
  return (
    <div className={styles['semantic-card']}>
      {SEMANTIC_TOKENS.map((token) => (
        <div key={token} className={styles['semantic-row']}>
          <span className={styles['semantic-dot']} style={{ backgroundColor: `var(${token})` }} />
          <span className={styles['semantic-name']}>{token}</span>
          <span className={styles['semantic-value']}>{token.replace(/^--/, '')}</span>
        </div>
      ))}
    </div>
  );
}

export function ColorsPage() {
  return (
    <>
      <PageHeader
        title="Colors"
        description="Primitives ship as 11-step ramps. Components only reference the semantic aliases on the right — dark mode swaps the aliases, never the ramps."
      />

      <SectionTitle>Ramps</SectionTitle>
      <Ramp name="stone" shades={STONE} />
      <Ramp name="amber" shades={AMBER} />
      <Ramp name="red" shades={RED} />

      <SectionTitle>Single hues (tag dots)</SectionTitle>
      <div className={styles['swatch-grid']} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {(['blue', 'emerald', 'pink', 'violet'] as const).map((name) => (
          <div
            key={name}
            className={styles.swatch}
            style={{ backgroundColor: `var(--color-${name}-500)` }}
            title={`--color-${name}-500`}
          >
            <span className={styles['swatch-label']}>{name}-500</span>
          </div>
        ))}
      </div>

      <SectionTitle>Semantic aliases (light vs dark)</SectionTitle>
      <ThemedPair>
        <SemanticList />
      </ThemedPair>
    </>
  );
}
