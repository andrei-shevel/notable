import ky from 'ky';

import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  VerifyRequest,
  VerifyResponse,
} from '@notable/shared';

export const authApi = {
  me: (signal?: AbortSignal) => ky.get<MeResponse>('/api/auth/me', { signal }),
  login: (body: LoginRequest) => ky.post<LoginResponse>('/api/auth/login', { json: body }),
  verify: (body: VerifyRequest) => ky.post<VerifyResponse>('/api/auth/verify', { json: body }),
  logout: () => ky.post<LogoutResponse>('/api/auth/logout'),
};
