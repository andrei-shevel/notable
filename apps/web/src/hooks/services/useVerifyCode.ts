import { useCallback } from 'react';
import { HTTPError } from 'ky';

import { VerifyRequestSchema } from '@notable/shared';
import { authApi } from '@/lib/api/auth';
import { useLoadUser } from './useLoadUser';

export function useVerifyCode() {
  const loadUser = useLoadUser();

  return useCallback(async (email: string, code: string) => {
    const parsed = VerifyRequestSchema.safeParse({ email, code });
    if (!parsed.success) {
      throw new Error('Enter the 6-digit code from your email.');
    }

    try {
      await authApi.verify(parsed.data);
    } catch (err) {
      if (err instanceof HTTPError && err.response.status === 429) {
        throw new Error('Too many attempts. Try again in a few minutes.');
      }
      throw new Error('That code is invalid or expired.');
    }

    return loadUser();
  }, []);
}
