import { useCallback } from 'react';
import { HTTPError } from 'ky';

import { ConfirmEmailChangeRequestSchema } from '@notable/shared';

import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth';

export function useConfirmEmailChange() {
  const setUser = useAuthStore((state) => state.setUser);

  return useCallback(
    async (email: string, code: string) => {
      const parsed = ConfirmEmailChangeRequestSchema.safeParse({ email, code });
      if (!parsed.success) {
        throw new Error('Enter the 6-digit code from your email.');
      }

      try {
        const updated = await authApi.confirmEmailChange(parsed.data).json();
        setUser(updated);
      } catch (err) {
        if (err instanceof HTTPError) {
          if (err.response.status === 409) {
            throw new Error('That email is already in use.', { cause: err });
          }
          if (err.response.status === 429) {
            throw new Error('Too many attempts. Try again in a few minutes.', { cause: err });
          }
        }
        throw new Error('That code is invalid or expired.', { cause: err });
      }
    },
    [setUser],
  );
}
