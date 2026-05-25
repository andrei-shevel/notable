import { useState } from 'react';
import { PageHeader, SectionTitle } from '@/routes/_design/_layout';
import { Specimen } from '@/routes/_design/_specimen';
import { Button } from '@notable/ui';

const DURATIONS = [
  { token: 'fast', value: '80ms', use: 'Hover states, focus rings' },
  { token: 'base', value: '120ms', use: 'Default — backgrounds, borders, colors' },
  { token: 'slow', value: '200ms', use: 'Modal open / close, transforms' },
];

const EASINGS = [
  { token: 'standard', value: 'cubic-bezier(0.2, 0, 0, 1)', use: 'Default deceleration' },
  { token: 'emphasis', value: 'cubic-bezier(0.3, 0, 0, 1)', use: 'Entry animations, modals' },
];

function Demo({ duration, easing }: { duration: string; easing: string }) {
  const [on, setOn] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <Button variant="outline" size="sm" onClick={() => setOn((v) => !v)}>
        Toggle
      </Button>
      <div
        style={{
          width: '64px',
          height: '32px',
          backgroundColor: on ? 'var(--accent)' : 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)',
          transform: on ? 'translateX(80px)' : 'translateX(0)',
          transitionProperty: 'transform, background-color',
          transitionDuration: duration,
          transitionTimingFunction: easing,
        }}
      />
    </div>
  );
}

export function MotionPage() {
  return (
    <>
      <PageHeader
        title="Motion"
        description="Animation timing is short and curved. Anything longer than 200ms is too slow for chrome UI."
      />

      <SectionTitle>Durations</SectionTitle>
      {DURATIONS.map((d) => (
        <Specimen key={d.token} label={`--duration-${d.token}`} code={`${d.value} — ${d.use}`}>
          <Demo duration={`var(--duration-${d.token})`} easing="var(--easing-standard)" />
        </Specimen>
      ))}

      <SectionTitle>Easing</SectionTitle>
      {EASINGS.map((e) => (
        <Specimen key={e.token} label={`--easing-${e.token}`} code={`${e.value} — ${e.use}`}>
          <Demo duration="var(--duration-slow)" easing={`var(--easing-${e.token})`} />
        </Specimen>
      ))}
    </>
  );
}
