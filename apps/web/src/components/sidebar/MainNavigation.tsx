import { Brand } from '@/components/common/Brand';
import { NavItem } from '@/components/sidebar/NavItem';
import { UserMenu } from '@/components/sidebar/UserMenu';

import { LIBRARY_SCOPES } from '@/lib/scopes';

import styles from './MainNavigation.module.scss';

export function MainNavigation() {
  return (
    <aside className={styles.sidebar}>
      <Brand />

      <div className={styles.section}>
        <div className={styles['section-title']}>Library</div>
        {LIBRARY_SCOPES.map((scope) => (
          <NavItem
            key={scope.id}
            scope={{ kind: 'library', id: scope.id }}
            icon={scope.icon}
            label={scope.label}
          />
        ))}
      </div>

      <UserMenu />
    </aside>
  );
}
