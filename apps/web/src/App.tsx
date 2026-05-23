import { lazy, Suspense } from 'react';
import { Route, Router, Switch } from 'wouter';
import { Tooltip } from '@notable/ui';
import { Workspace } from './routes/Workspace';

const DesignSystem = import.meta.env.DEV ? lazy(() => import('./routes/_design')) : null;

// SPA mounts under /app — Caddy serves the marketing landing at the apex.
// Strip the trailing slash from Vite's BASE_URL so wouter's matchers work.
const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
  return (
    <Router base={ROUTER_BASE}>
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
            <Workspace />
          </Route>
        </Switch>
      </Tooltip.Provider>
    </Router>
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
