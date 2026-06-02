import { useCallback } from 'react';

import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth';

export function useDeleteAccount() {
  const setUser = useAuthStore((state) => state.setUser);

  return useCallback(async () => {
    try {
      await authApi.deleteAccount();
    } catch {
      throw new Error("Couldn't delete your account. Try again.");
    }
    // Server already cleared the session cookie; sync local state so the
    // AuthGate redirects to /login on the next render.
    setUser(null);
  }, [setUser]);
}
