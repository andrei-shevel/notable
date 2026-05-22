import { PageHeader } from '../_layout';
import { Specimen } from '../_specimen';

const RADII = [
  { token: 'none', value: '0' },
  { token: 'sm', value: '6px' },
  { token: 'md', value: '8px' },
  { token: 'lg', value: '12px' },
  { token: 'full', value: '999px' },
];

export function RadiusPage() {
  return (
    <>
      <PageHeader
        title="Radius"
        description="Five steps. sm for compact controls, md for cards and inputs, lg for modals, full for pills and avatars."
      />
      {RADII.map((r) => (
        <Specimen key={r.token} label={`--radius-${r.token}`} code={r.value}>
          <div
            style={{
              width: '120px',
              height: '64px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: `var(--radius-${r.token})`,
            }}
          />
        </Specimen>
      ))}
    </>
  );
}
