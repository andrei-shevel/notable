import { createTransport } from 'nodemailer';

// nodemailer accepts SMTP URLs directly. In dev this points at the mailpit
// container (smtp://mailpit:1025, no auth); in prod it's a real provider
// (e.g. smtps://user:pass@smtp.resend.com:465).
const url = process.env.SMTP_URL;
if (!url) {
  throw new Error('SMTP_URL is required');
}

export const mailer = createTransport(url);
