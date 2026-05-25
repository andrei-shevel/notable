import { useShallow } from 'zustand/react/shallow';

import { useAuthStore } from '@/stores/auth';

export function useAuth() {
  return useAuthStore(useShallow((s) => ({ user: s.user, isLoading: s.isLoading })));
}
