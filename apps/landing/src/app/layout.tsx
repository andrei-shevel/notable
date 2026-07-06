import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './global.scss';

export const metadata: Metadata = {
  title: 'Notable — coming soon',
  description:
    'A notes app built for writing, not arranging. Rich editor, fast search, quiet sync. Coming soon.',
  openGraph: {
    type: 'website',
    title: 'Notable — coming soon',
    description:
      'A notes app built for writing, not arranging. Rich editor, fast search, quiet sync. Coming soon.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
