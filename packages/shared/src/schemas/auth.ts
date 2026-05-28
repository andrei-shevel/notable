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

// Two-step email change. Step 1 sends a 6-digit code to the new address —
// proves the user actually controls it before we swap. Same shape as the
// login flow so the verify endpoints stay easy to reason about together.
export const RequestEmailChangeRequestSchema = z.object({
  email: z.email().max(254),
});
export type RequestEmailChangeRequest = z.infer<typeof RequestEmailChangeRequestSchema>;

export const RequestEmailChangeResponseSchema = z.object({ ok: z.literal(true) });
export type RequestEmailChangeResponse = z.infer<typeof RequestEmailChangeResponseSchema>;

export const ConfirmEmailChangeRequestSchema = z.object({
  email: z.email().max(254),
  code: z.string().regex(/^\d{6}$/),
});
export type ConfirmEmailChangeRequest = z.infer<typeof ConfirmEmailChangeRequestSchema>;

export const ConfirmEmailChangeResponseSchema = MeResponseSchema;
export type ConfirmEmailChangeResponse = z.infer<typeof ConfirmEmailChangeResponseSchema>;

export const DeleteAccountResponseSchema = z.object({ ok: z.literal(true) });
export type DeleteAccountResponse = z.infer<typeof DeleteAccountResponseSchema>;
