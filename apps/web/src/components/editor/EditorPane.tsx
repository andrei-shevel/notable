import { useState } from 'react';

import { Spinner } from '@notable/ui';
import { EditorToolbar } from './EditorToolbar';

import { useLoadNote } from '@/hooks/services/useLoadNote';

import styles from './EditorPane.module.scss';

type ChecklistItem = { id: string; label: string; done: boolean };

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: 'owner', label: 'Confirm reliability owner with the platform team', done: true },
  { id: 'baseline', label: 'Get latency baseline numbers from analytics', done: true },
  {
    id: 'templates',
    label: 'Decide whether onboarding includes the new template gallery',
    done: false,
  },
  { id: 'cursor-vl', label: 'Align with design on the shared-cursor visual language', done: false },
  {
    id: 'partners',
    label: 'Identify the three design partners for the collab preview',
    done: false,
  },
];

export function EditorPane() {
  const [items, setItems] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const { note, isLoading } = useLoadNote();

  const toggle = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  if (isLoading) {
    return (
      <main className={styles.pane} aria-busy="true">
        <div className={styles.loading}>
          <Spinner size={20} label="Loading note" />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.pane}>
      <EditorToolbar trail={note ? [note.title] : []} savedLabel="Saved 2m ago" />
      <div className={styles.scroll}>
        <article className={styles.body}>
          <h1>Q3 product roadmap — first draft</h1>

          <p>
            This is a working draft. The goal is to land on three pillars by end of week so each
            owning team has time to write their own one-pager before the leadership review.
          </p>

          <h2>The three pillars</h2>
          <ol>
            <li>
              <strong>Reliability.</strong> Cut p99 latency on the read path by 30%, and bring the
              unplanned-incident count under two per month.
            </li>
            <li>
              <strong>Onboarding velocity.</strong> A new workspace should reach its "first useful
              moment" inside ten minutes, measured end-to-end from sign-up.
            </li>
            <li>
              <strong>Collaboration surface.</strong> Ship the shared-cursor MVP behind a flag for
              design partners by August.
            </li>
          </ol>

          <h3>Why these, why now</h3>
          <p>
            Reliability is non-negotiable — three of our top ten accounts cited it in renewal
            conversations. Onboarding is the lever with the most leverage on conversion right now;
            the data team's funnel work makes the bottleneck very clear. Collaboration is the one
            bet — it's not the safe choice, but it's the one that makes the rest of the product feel
            different.
          </p>

          <blockquote>
            "A roadmap is not a list of features. It's a story about what the team is going to
            learn." — internal review notes, Q1
          </blockquote>

          <h2>Open questions</h2>
          <ul className={styles.checklist}>
            {items.map((item) => (
              <li key={item.id} className={item.done ? styles.done : undefined}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggle(item.id)}
                  aria-label={item.label}
                />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>

          <h3>Measurement</h3>
          <p>
            Each pillar gets one headline metric and at most two supporting metrics. Anything else
            is a curiosity, not a goal.
          </p>
          <pre>
            <code>{`pillar          headline                         target
─────────────   ──────────────────────────────   ──────
reliability     p99 read latency                 −30%
onboarding      time-to-first-useful-moment      < 10m
collaboration   weekly active co-editors         500`}</code>
          </pre>

          <h3>What this draft is missing</h3>
          <p>
            Resourcing. I deliberately wrote the pillars without thinking about headcount first —
            once these feel right, the next pass is to check whether the math actually works given
            the team we have.
          </p>
        </article>
      </div>
    </main>
  );
}
