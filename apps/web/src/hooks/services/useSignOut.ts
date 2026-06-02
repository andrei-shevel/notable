import { useCallback } from 'react';

import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api/auth';

export function useSignOut() {
  const setUser = useAuthStore((state) => state.setUser);

  return useCallback(async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch {
      // TODO introduce some logger
    }
  }, [setUser]);
}
