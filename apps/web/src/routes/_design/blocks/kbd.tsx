import { Kbd } from '@notable/ui';
import { PageHeader, SectionTitle } from '@/routes/_design/_layout';
import { Specimen } from '@/routes/_design/_specimen';

export function KbdPage() {
  return (
    <>
      <PageHeader
        title="Kbd"
        description="Keyboard hint chips. Use sparingly — in tooltips, command palettes, and the search input's ⌘K hint."
      />

      <SectionTitle>Common chords</SectionTitle>
      <Specimen label="Search palette">
        <Kbd keys={['⌘', 'K']} />
      </Specimen>
      <Specimen label="New note">
        <Kbd keys={['⌘', 'N']} />
      </Specimen>
      <Specimen label="Bold">
        <Kbd keys={['⌘', 'B']} />
      </Specimen>
      <Specimen label="Three-key chord">
        <Kbd keys={['⌘', '⇧', 'P']} />
      </Specimen>
    </>
  );
}
