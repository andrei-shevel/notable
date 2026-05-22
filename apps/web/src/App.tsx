import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { Tooltip } from '@notable/ui';
import { Home } from './routes/Home';

const DesignSystem = import.meta.env.DEV
  ? lazy(() => import('./routes/_design'))
  : null;

export function App() {
  return (
    <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
      <Switch>
        {DesignSystem ? (
          <Route path="/_design" nest>
            <Suspense fallback={<DesignLoading />}>
              <DesignSystem />
            </Suspense>
          </Route>
        ) : null}
        <Route>
          <Home />
        </Route>
      </Switch>
    </Tooltip.Provider>
  );
}

function DesignLoading() {
  return (
    <div
      style={{
        padding: 'var(--space-12)',
        color: 'var(--text-muted)',
      }}
    >
      Loading design system…
    </div>
  );
}
