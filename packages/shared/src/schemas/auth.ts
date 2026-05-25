import { z } from 'zod';

// RFC 5321 caps the local part at 64 and the full address at 254. We don't
// need to police further than that — Postgres has the unique citext index
// and the code delivery itself proves the address is reachable.
export const LoginRequestSchema = z.object({
  email: z.email().max(254),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({ ok: z.literal(true) });
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// 6-digit numeric one-time code. Server hashes sha256(userId || code) and
// matches against auth_tokens, so the email is required to locate the row.
export const VerifyRequestSchema = z.object({
  email: z.email().max(254),
  code: z.string().regex(/^\d{6}$/),
});
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

export const VerifyResponseSchema = z.object({ ok: z.literal(true) });
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

export const LogoutResponseSchema = z.object({ ok: z.literal(true) });
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

export const MeResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
