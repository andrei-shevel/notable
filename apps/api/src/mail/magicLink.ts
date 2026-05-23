import { mailer } from './transport.js';

const from = process.env.MAIL_FROM ?? 'Notable <noreply@notable.local>';

export async function sendMagicLink(email: string, url: string) {
  await mailer.sendMail({
    from,
    to: email,
    subject: 'Sign in to Notable',
    text: [
      'Click the link below to sign in. It expires in 15 minutes.',
      '',
      url,
      '',
      "If you didn't request this, you can safely ignore this email.",
    ].join('\n'),
    html: `<p>Click the link below to sign in. It expires in 15 minutes.</p>
<p><a href="${url}">${url}</a></p>
<p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`,
  });
}
