import { useCallback } from 'react';

import { useAuthStore } from '../../stores/auth';
import { authApi } from '../../lib/api/auth';

export function useLoadUser() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  return useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const user = await authApi.me(signal).json();
      setUser(user);
    } catch (err) {
      if (signal?.aborted) {
        return;
      }
      setUser(null);
    }
    setLoading(false);
  }, []);
}
