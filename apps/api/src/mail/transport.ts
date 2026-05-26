import { createTransport } from 'nodemailer';
import { config } from '../config';

// nodemailer accepts SMTP URLs directly. In dev this points at the mailpit
// container (smtp://mailpit:1025, no auth); in prod it's a real provider
// (e.g. smtps://user:pass@smtp.resend.com:465).
export const mailer = createTransport(config.SMTP_URL);
