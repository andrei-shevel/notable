import { Spinner, Button } from '@notable/ui';
import { PageHeader, SectionTitle } from '@/routes/_design/_layout';
import { Specimen } from '@/routes/_design/_specimen';

export function SpinnerPage() {
  return (
    <>
      <PageHeader
        title="Spinner"
        description="Inherits color from its parent. Used by Button's loading state and inline for slow queries."
      />

      <SectionTitle>Sizes</SectionTitle>
      <Specimen label="size=12">
        <Spinner size={12} />
      </Specimen>
      <Specimen label="size=16 (default)">
        <Spinner />
      </Specimen>
      <Specimen label="size=20">
        <Spinner size={20} />
      </Specimen>

      <SectionTitle>In context</SectionTitle>
      <Specimen label="Inside a button">
        <Button loading>Saving…</Button>
      </Specimen>
      <Specimen label="Inline with text">
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <Spinner size={12} /> Fetching notes…
        </span>
      </Specimen>
    </>
  );
}
