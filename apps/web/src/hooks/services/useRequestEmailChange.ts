import { useCallback } from 'react';
import { HTTPError } from 'ky';

import { RequestEmailChangeRequestSchema } from '@notable/shared';

import { authApi } from '@/lib/api/auth';

export function useRequestEmailChange() {
  return useCallback(async (email: string) => {
    const parsed = RequestEmailChangeRequestSchema.safeParse({ email });
    if (!parsed.success) {
      throw new Error('Enter a valid email address.');
    }

    try {
      await authApi.requestEmailChange(parsed.data);
    } catch (err) {
      if (err instanceof HTTPError) {
        if (err.response.status === 409) {
          throw new Error('That email is already in use.');
        }
        if (err.response.status === 400) {
          throw new Error('That is already your email.');
        }
        if (err.response.status === 429) {
          throw new Error('Too many attempts. Try again in a few minutes.');
        }
      }
      throw new Error("Couldn't send the code. Try again.");
    }
  }, []);
}
