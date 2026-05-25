import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Icon, Input } from '@notable/ui';
import { Search } from 'lucide-react';
import { PageHeader, SectionTitle } from '@/routes/_design/_layout';
import { Specimen } from '@/routes/_design/_specimen';
import styles from './icon.module.scss';

// Build a sorted list of icon names from lucide-react's exports. lucide-react
// exports each icon as both `Star` and `StarIcon`; we keep the plain name.
function listIcons(): Array<{ name: string; component: Lucide.LucideIcon }> {
  const entries = Object.entries(Lucide) as Array<[string, Lucide.LucideIcon | unknown]>;
  const out: Array<{ name: string; component: Lucide.LucideIcon }> = [];
  for (const [name, value] of entries) {
    if (name.endsWith('Icon')) continue;
    if (name === 'createLucideIcon' || name === 'Icon') continue;
    if (typeof value !== 'object' || value === null) continue;
    // Lucide icons are forwardRef components — they're objects with $$typeof.
    if (!('$$typeof' in (value as object))) continue;
    out.push({ name, component: value as Lucide.LucideIcon });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

const FEATURED = [
  'File',
  'Star',
  'Clock',
  'Trash2',
  'Plus',
  'Search',
  'Share2',
  'MoreHorizontal',
  'Tag',
  'Folder',
  'Hash',
  'Calendar',
] as const;

export function IconPage() {
  const all = useMemo(() => listIcons(), []);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [all, query]);

  return (
    <>
      <PageHeader
        title="Icon"
        description="Thin wrapper around lucide-react. Pass the icon component, not a name string — that keeps the bundle tree-shakeable."
      />

      <SectionTitle>Featured</SectionTitle>
      <Specimen label="The icons used in the prototype">
        {FEATURED.map((name) => {
          const C = (Lucide as unknown as Record<string, Lucide.LucideIcon>)[name];
          return C ? (
            <div
              key={name}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-1)',
                color: 'var(--text)',
              }}
            >
              <Icon icon={C} size={20} />
              <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                {name}
              </code>
            </div>
          ) : null;
        })}
      </Specimen>

      <SectionTitle>Sizes</SectionTitle>
      <Specimen label="size prop">
        {[12, 14, 16, 20, 24, 32].map((size) => (
          <div
            key={size}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon icon={Lucide.Star} size={size} />
            <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              {size}
            </code>
          </div>
        ))}
      </Specimen>

      <SectionTitle>All icons ({all.length})</SectionTitle>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Input
          placeholder="Filter…"
          variant="inline"
          leftIcon={<Icon icon={Search} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className={styles.grid}>
        {filtered.slice(0, 240).map(({ name, component }) => (
          <div key={name} className={styles.cell}>
            <Icon icon={component} size={20} />
            <span className={styles['cell-name']}>{name}</span>
          </div>
        ))}
      </div>
      {filtered.length > 240 ? (
        <p
          style={{
            marginTop: 'var(--space-4)',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          Showing first 240 of {filtered.length}. Refine the search to see more.
        </p>
      ) : null}
    </>
  );
}
