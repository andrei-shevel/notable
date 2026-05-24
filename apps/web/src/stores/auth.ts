import { create } from 'zustand';

import type { MeResponse } from '@notable/shared';

type AuthState = {
  user: MeResponse | null;
  isLoading: boolean;
  setUser: (user: MeResponse | null) => void;
  setLoading: (isLoading: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
