import ky from 'ky';

import type {
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  DeleteAccountResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RequestEmailChangeRequest,
  RequestEmailChangeResponse,
  VerifyRequest,
  VerifyResponse,
} from '@notable/shared';

export const authApi = {
  me: (signal?: AbortSignal) => ky.get<MeResponse>('/api/auth/me', { signal }),
  login: (body: LoginRequest) => ky.post<LoginResponse>('/api/auth/login', { json: body }),
  verify: (body: VerifyRequest) => ky.post<VerifyResponse>('/api/auth/verify', { json: body }),
  logout: () => ky.post<LogoutResponse>('/api/auth/logout'),
  requestEmailChange: (body: RequestEmailChangeRequest) =>
    ky.post<RequestEmailChangeResponse>('/api/auth/me/email/request', { json: body }),
  confirmEmailChange: (body: ConfirmEmailChangeRequest) =>
    ky.post<ConfirmEmailChangeResponse>('/api/auth/me/email/confirm', { json: body }),
  deleteAccount: () => ky.delete<DeleteAccountResponse>('/api/auth/me'),
};
