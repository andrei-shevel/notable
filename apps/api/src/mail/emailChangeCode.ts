import { config } from '@/config';
import { mailer } from './transport';

export async function sendEmailChangeCode(newEmail: string, code: string) {
  await mailer.sendMail({
    from: config.MAIL_FROM,
    to: newEmail,
    subject: `${code} is your Notable email-change code`,
    text: [
      `Use this code to confirm your new email on Notable: ${code}`,
      '',
      'It expires in 10 minutes.',
      '',
      "If you didn't request this, you can safely ignore this email — your account hasn't changed.",
    ].join('\n'),
    html: `<p>Use this code to confirm your new email on Notable:</p>
<p style="font-size:24px;font-weight:600;letter-spacing:4px;font-family:monospace">${code}</p>
<p>It expires in 10 minutes.</p>
<p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email — your account hasn't changed.</p>`,
  });
}
