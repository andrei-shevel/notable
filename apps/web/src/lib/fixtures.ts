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

export type FixtureNote = {
  id: string;
  title: string;
  preview: string;
  /** Display string for the list pane (e.g. "10:42", "Yesterday", "May 14"). */
  timeLabel: string;
  /** Tag ids referenced from FIXTURE_TAGS. */
  tagIds: string[];
};

export const FIXTURE_USER = {
  name: 'Shevvy K.',
  email: 'sendtoshevvy@gmail.com',
} as const;

export const FIXTURE_TAGS: FixtureTag[] = [
  { id: 'work', name: 'Work', color: 'blue', count: 34 },
  { id: 'personal', name: 'Personal', color: 'green', count: 21 },
  { id: 'ideas', name: 'Ideas', color: 'pink', count: 17 },
  { id: 'reading', name: 'Reading', color: 'violet', count: 9 },
];

// Planning tag isn't in the sidebar but appears on the first note card and
// the editor meta strip, so keep it discoverable by name.
export const FIXTURE_TAG_PLANNING: FixtureTag = {
  id: 'planning',
  name: 'Planning',
  color: 'neutral',
  count: 0,
};

export const FIXTURE_NAV_COUNTS = {
  all: 128,
  starred: 12,
} as const;

export const FIXTURE_NOTES: FixtureNote[] = [
  {
    id: 'q3-roadmap',
    title: 'Q3 product roadmap — first draft',
    preview:
      'Three pillars for the quarter: reliability, onboarding velocity, and the new collaboration surface. Each pillar maps to a single owning team and one north-star metric…',
    timeLabel: '10:42',
    tagIds: ['work', 'planning'],
  },
  {
    id: 'coffee-maya',
    title: 'Notes from coffee with Maya',
    preview:
      "She's leaving the platform team in June to start something in the dev-tools space. Wants to chat about whether the offline-first sync work we did would be open-sourceable…",
    timeLabel: 'Yesterday',
    tagIds: ['personal'],
  },
  {
    id: 'summer-books',
    title: 'Books to read this summer',
    preview:
      'A Pattern Language · Christopher Alexander. The Beginning of Infinity · David Deutsch. Several Short Sentences About Writing · Verlyn Klinkenborg…',
    timeLabel: 'Tue',
    tagIds: ['reading'],
  },
  {
    id: 'apartment-search',
    title: 'Apartment search shortlist',
    preview:
      'Three places worth a second visit. The Mission loft has the best light but no laundry; the Hayes Valley one-bed is overpriced but the layout is unbeatable…',
    timeLabel: 'Mon',
    tagIds: ['personal'],
  },
  {
    id: 'weekly-digest',
    title: 'Idea: weekly digest of small wins',
    preview:
      'What if the team had a Friday ritual where each person shares one small thing that worked? Not retrospective heavy — just a low-friction signal of momentum…',
    timeLabel: 'May 14',
    tagIds: ['ideas', 'work'],
  },
  {
    id: 'migration-runbook',
    title: 'Migration runbook — staging',
    preview:
      'Step 1: snapshot the primary. Step 2: cut writes by failing health checks for 30s. Step 3: run the schema diff against the read replica first to confirm shape…',
    timeLabel: 'May 12',
    tagIds: ['work'],
  },
  {
    id: 'quotes',
    title: 'Quotes worth keeping',
    preview:
      '"The work is the thing that produces the work." — Austin Kleon. "Specificity is the soul of narrative." — John Hodgman. "You can\'t think your way into right action…"',
    timeLabel: 'May 9',
    tagIds: ['reading'],
  },
  {
    id: 'trust-talk',
    title: 'Talk outline: building for trust',
    preview:
      'Open with the cold-start problem — why product teams under-invest in trust early and pay for it later. Three case studies, ending with the recovery playbook…',
    timeLabel: 'May 3',
    tagIds: ['work', 'ideas'],
  },
];

export const FIXTURE_ACTIVE_NOTE_ID: string = FIXTURE_NOTES[0]!.id;

// Tag lookup that also resolves the implicit Planning tag used by the active
// note. Keeps callers terse.
export function findFixtureTag(id: string): FixtureTag | undefined {
  if (id === FIXTURE_TAG_PLANNING.id) return FIXTURE_TAG_PLANNING;
  return FIXTURE_TAGS.find((t) => t.id === id);
}
