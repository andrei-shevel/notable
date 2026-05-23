import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import styles from './_layout.module.scss';

type NavLink = { href: string; label: string };
type NavGroup = { label: string; links: NavLink[] };

// hrefs are relative to /_design (the nested router base set in App.tsx).
const NAV: NavGroup[] = [
  {
    label: 'Tokens',
    links: [
      { href: '/tokens/colors', label: 'Colors' },
      { href: '/tokens/typography', label: 'Typography' },
      { href: '/tokens/spacing', label: 'Spacing' },
      { href: '/tokens/radius', label: 'Radius' },
      { href: '/tokens/shadows', label: 'Shadows' },
      { href: '/tokens/motion', label: 'Motion' },
    ],
  },
  {
    label: 'Primitives',
    links: [
      { href: '/primitives/button', label: 'Button' },
      { href: '/primitives/input', label: 'Input' },
      { href: '/primitives/dialog', label: 'Dialog' },
      { href: '/primitives/menu', label: 'Menu' },
      { href: '/primitives/popover', label: 'Popover' },
      { href: '/primitives/tooltip', label: 'Tooltip' },
    ],
  },
  {
    label: 'Blocks',
    links: [
      { href: '/blocks/icon', label: 'Icon' },
      { href: '/blocks/tag', label: 'Tag' },
      { href: '/blocks/avatar', label: 'Avatar' },
      { href: '/blocks/kbd', label: 'Kbd' },
      { href: '/blocks/spinner', label: 'Spinner' },
    ],
  },
];

export function DesignLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.header}>
          <Link href="/" className={styles.brand}>
            Notable Design System
            <small>v0 — internal</small>
          </Link>
          <ThemeSwitcher />
        </div>
        {NAV.map((group) => (
          <div className={styles.group} key={group.label}>
            <div className={styles['group-label']}>{group.label}</div>
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[styles.link, location === link.href ? styles.active : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <h1 className={styles['page-title']}>{title}</h1>
      {description ? <p className={styles['page-description']}>{description}</p> : null}
    </>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={styles['section-title']}>{children}</h2>;
}
