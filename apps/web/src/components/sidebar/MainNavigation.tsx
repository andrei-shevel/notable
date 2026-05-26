import { Brand } from '@/components/common/Brand';
import { NavItem } from '@/components/sidebar/NavItem';
import { UserMenu } from '@/components/sidebar/UserMenu';

import { FIXTURE_NAV_COUNTS, FIXTURE_TAGS } from '@/lib/fixtures';
import { LIBRARY_SCOPES, type LibraryScopeId } from '@/lib/scopes';

import styles from './MainNavigation.module.scss';

const SCOPE_COUNTS: Partial<Record<LibraryScopeId, number>> = {
  all: FIXTURE_NAV_COUNTS.all,
  starred: FIXTURE_NAV_COUNTS.starred,
};

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
            count={SCOPE_COUNTS[scope.id]}
          />
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles['section-title']}>Tags</div>
        {FIXTURE_TAGS.map((tag) => (
          <NavItem
            key={tag.id}
            scope={{ kind: 'tag', id: tag.id }}
            dotColor={tag.color}
            label={tag.name}
            count={tag.count}
          />
        ))}
      </div>

      <UserMenu />
    </aside>
  );
}
