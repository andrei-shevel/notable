import { PageHeader, SectionTitle } from '../_layout';
import { Specimen } from '../_specimen';

const SIZES = [
  { token: 'xs', px: 11 },
  { token: 'sm', px: 12 },
  { token: 'base', px: 13 },
  { token: 'md', px: 14 },
  { token: 'lg', px: 15 },
  { token: 'xl', px: 16 },
  { token: '2xl', px: 18 },
  { token: '3xl', px: 22 },
  { token: '4xl', px: 28 },
  { token: '5xl', px: 36 },
];

const WEIGHTS = [
  { token: 'regular', value: 400 },
  { token: 'medium', value: 500 },
  { token: 'semibold', value: 600 },
  { token: 'bold', value: 700 },
];

const SEMANTIC_ROLES = [
  { role: 'display', sample: 'Notes that matter' },
  { role: 'section', sample: 'Section heading' },
  { role: 'subsection', sample: 'Subsection heading' },
  { role: 'body', sample: 'Body copy reads at fifteen pixels with loose line-height for long-form prose.' },
  { role: 'list-title', sample: 'Note list title — single line, ellipsised when long' },
  { role: 'nav', sample: 'Sidebar nav item' },
  { role: 'section-head', sample: 'Section heading' },
  { role: 'tag', sample: 'tag chip' },
  { role: 'meta', sample: 'updated 2m ago' },
];

export function TypographyPage() {
  return (
    <>
      <PageHeader
        title="Typography"
        description="Inter for UI, JetBrains Mono for code. Primitive scale and weights below; semantic roles compose them for specific UI surfaces."
      />

      <SectionTitle>Size scale</SectionTitle>
      {SIZES.map((s) => (
        <Specimen
          key={s.token}
          label={`--font-size-${s.token}`}
          code={`${s.px}px`}
        >
          <div style={{ fontSize: `var(--font-size-${s.token})` }}>
            The quick brown fox jumps over the lazy dog
          </div>
        </Specimen>
      ))}

      <SectionTitle>Weights</SectionTitle>
      {WEIGHTS.map((w) => (
        <Specimen
          key={w.token}
          label={`--font-weight-${w.token}`}
          code={String(w.value)}
        >
          <div style={{ fontWeight: w.value, fontSize: 'var(--font-size-xl)' }}>
            Inter — {w.token}
          </div>
        </Specimen>
      ))}

      <SectionTitle>Semantic roles</SectionTitle>
      {SEMANTIC_ROLES.map(({ role, sample }) => (
        <Specimen key={role} label={`--text-${role}-*`}>
          <div
            style={{
              fontSize: `var(--text-${role}-size)`,
              fontWeight: `var(--text-${role}-weight)`,
              lineHeight: `var(--text-${role}-leading)`,
              letterSpacing: `var(--text-${role}-tracking, 0)`,
              fontFamily:
                role === 'code' ? 'var(--font-mono)' : 'var(--font-sans)',
              textTransform: role === 'section-head' ? 'uppercase' : 'none',
            }}
          >
            {sample}
          </div>
        </Specimen>
      ))}

      <SectionTitle>Mono</SectionTitle>
      <Specimen label="--font-mono">
        <code style={{ fontSize: 'var(--font-size-base)' }}>
          {'const note = await db.notes.findOne({ id });'}
        </code>
      </Specimen>
    </>
  );
}
