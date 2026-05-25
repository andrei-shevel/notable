import { mailer } from './transport.js';

const from = process.env.MAIL_FROM ?? 'Notable <noreply@notable.local>';

export async function sendLoginCode(email: string, code: string) {
  await mailer.sendMail({
    from,
    to: email,
    subject: `${code} is your Notable sign-in code`,
    text: [
      `Your sign-in code is: ${code}`,
      '',
      'It expires in 10 minutes.',
      '',
      "If you didn't request this, you can safely ignore this email.",
    ].join('\n'),
    html: `<p>Your sign-in code is:</p>
<p style="font-size:24px;font-weight:600;letter-spacing:4px;font-family:monospace">${code}</p>
<p>It expires in 10 minutes.</p>
<p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`,
  });
}
