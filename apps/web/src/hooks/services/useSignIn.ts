import { useCallback } from 'react';
import { HTTPError } from 'ky';

import { LoginRequestSchema } from '@notable/shared';
import { authApi } from '../../lib/api/auth';

export function useSignIn() {
  return useCallback(async (email: string) => {
    const parsed = LoginRequestSchema.safeParse({ email });
    if (!parsed.success) {
      throw new Error('Enter a valid email address.');
    }

    try {
      await authApi.login(parsed.data);
    } catch (err) {
      if (err instanceof HTTPError && err.response.status === 429) {
        throw new Error('Too many attempts. Try again in a few minutes.');
      }
      throw new Error("Couldn't send the link. Try again.");
    }
  }, []);
}
