// Hard-coded data ported from docs/index.html so step 3 can render the
// workspace before the API exists. Shapes are designed to swap cleanly for
// TanStack Query results in step 9 — keep field names aligned with the
// Drizzle schema in docs/PLAN.md.

import type { TagColor } from '@notable/ui';

export type FixtureTag = {
  id: string;
  name: string;
  color: TagColor;
  count: number;
};

export const FIXTURE_TAGS: FixtureTag[] = [
  { id: 'work', name: 'Work', color: 'blue', count: 34 },
  { id: 'personal', name: 'Personal', color: 'green', count: 21 },
  { id: 'ideas', name: 'Ideas', color: 'pink', count: 17 },
  { id: 'reading', name: 'Reading', color: 'violet', count: 9 },
];

export const FIXTURE_NAV_COUNTS = {
  all: 128,
  starred: 12,
} as const;
