import { Tag } from '@notable/ui';
import type { TagColor } from '@notable/ui';
import { PageHeader, SectionTitle } from '@/routes/_design/_layout';
import { Specimen } from '@/routes/_design/_specimen';

const COLORS: TagColor[] = ['blue', 'green', 'pink', 'violet', 'neutral'];

export function TagPage() {
  return (
    <>
      <PageHeader
        title="Tag"
        description="Pill chip with a coloured dot. Used in note cards and the sidebar tag list."
      />

      <SectionTitle>Colors</SectionTitle>
      <Specimen label="color prop">
        {COLORS.map((color) => (
          <Tag key={color} label={color[0]!.toUpperCase() + color.slice(1)} color={color} />
        ))}
      </Specimen>

      <SectionTitle>Sizes</SectionTitle>
      <Specimen label="size=sm">
        <Tag label="Small" color="blue" size="sm" />
        <Tag label="Small" color="green" size="sm" />
      </Specimen>
      <Specimen label="size=md (default)">
        <Tag label="Medium" color="blue" />
        <Tag label="Medium" color="green" />
      </Specimen>

      <SectionTitle>Translucent (for accent-tinted parents)</SectionTitle>
      <Specimen label="active note card">
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            padding: 'var(--space-3)',
            background: 'var(--accent-soft)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
        >
          <Tag label="Work" color="blue" translucent />
          <Tag label="Planning" color="violet" translucent />
        </div>
      </Specimen>
    </>
  );
}
