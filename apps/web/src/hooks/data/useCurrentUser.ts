import type { MeResponse } from '@notable/shared';

import { useAuth } from './useAuth';

export function useCurrentUser(): MeResponse {
  const { user } = useAuth();
  if (!user) {
    throw new Error('useCurrentUser must be called inside <AuthGate> — no user in context');
  }
  return user;
}
