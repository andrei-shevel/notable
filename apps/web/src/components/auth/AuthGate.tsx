import { useEffect, type PropsWithChildren } from 'react';
import { useLocation } from 'wouter';

import { FullPageSpinner } from '@/components/common/FullPageSpinner';

import { useAuth } from '@/hooks/data/useAuth';

type AuthGateProps = PropsWithChildren<{
  isGuest?: boolean;
}>;

export function AuthGate({ children, isGuest }: AuthGateProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (user && isGuest) {
        return setLocation('/', { replace: true });
      }
      if (!user && !isGuest) {
        return setLocation('/login', { replace: true });
      }
    }
  }, [isLoading, user, setLocation]);

  if (isLoading || (user && isGuest) || (!user && !isGuest)) {
    return <FullPageSpinner label="Loading…" />;
  }

  return <>{children}</>;
}
