import { lazy, Suspense, useEffect } from 'react';
import { Route, Router, Switch } from 'wouter';

import { Tooltip } from '@notable/ui';
import { Workspace } from './routes/Workspace';
import { AuthGate } from './components/AuthGate';
import { Login } from './routes/Login';
import { FullPageSpinner } from './components/FullPageSpinner';

import { useLoadUser } from './hooks/services/useLoadUser';

const DesignSystem = import.meta.env.DEV ? lazy(() => import('./routes/_design')) : null;

// SPA mounts under /app — Caddy serves the marketing landing at the apex.
// Strip the trailing slash from Vite's BASE_URL so wouter's matchers work.
const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
  const loadUser = useLoadUser();

  useEffect(() => {
    const controller = new AbortController();
    void loadUser(controller.signal);
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <Router base={ROUTER_BASE}>
      <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
        <Switch>
          <Route path="/login">
            <AuthGate isGuest>
              <Login />
            </AuthGate>
          </Route>
          {DesignSystem ? (
            <Route path="/_design" nest>
              <Suspense fallback={<FullPageSpinner label="Loading design system…" />}>
                <DesignSystem />
              </Suspense>
            </Route>
          ) : null}
          <Route>
            <AuthGate>
              <Workspace />
            </AuthGate>
          </Route>
        </Switch>
      </Tooltip.Provider>
    </Router>
  );
}
