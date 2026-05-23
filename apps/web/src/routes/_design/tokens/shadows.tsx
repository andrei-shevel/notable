import { PageHeader } from '../_layout';
import { Specimen } from '../_specimen';

const SHADOWS = [
  { token: 'sm', description: 'Subtle lift (active nav item, button hover)' },
  { token: 'md', description: 'Floating panels (menus, popovers)' },
  { token: 'lg', description: 'Modals and elevated overlays' },
];

export function ShadowsPage() {
  return (
    <>
      <PageHeader
        title="Shadows"
        description="Three steps of elevation. Tokens are colour-neutral so they sit well on both themes."
      />
      {SHADOWS.map((s) => (
        <Specimen key={s.token} label={`--shadow-${s.token}`} code={s.description}>
          <div
            style={{
              width: '160px',
              height: '80px',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: `var(--shadow-${s.token})`,
            }}
          />
        </Specimen>
      ))}
    </>
  );
}
