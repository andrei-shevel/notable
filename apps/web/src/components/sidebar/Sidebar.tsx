import { Clock, FileText, Star, Trash2 } from 'lucide-react';

import { Brand } from '@/components/common/Brand';
import { NavItem } from '@/components/sidebar/NavItem';
import { UserMenu } from '@/components/sidebar/UserMenu';

import { FIXTURE_NAV_COUNTS, FIXTURE_TAGS } from '@/lib/fixtures';

import styles from './Sidebar.module.scss';

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <Brand />

      <div className={styles.section}>
        <div className={styles['section-title']}>Library</div>
        <NavItem icon={FileText} label="All Notes" count={FIXTURE_NAV_COUNTS.all} active />
        <NavItem icon={Star} label="Starred" count={FIXTURE_NAV_COUNTS.starred} />
        <NavItem icon={Clock} label="Recent" />
        <NavItem icon={Trash2} label="Trash" />
      </div>

      <div className={styles.section}>
        <div className={styles['section-title']}>Tags</div>
        {FIXTURE_TAGS.map((tag) => (
          <NavItem key={tag.id} dotColor={tag.color} label={tag.name} count={tag.count} />
        ))}
      </div>

      <UserMenu />
    </aside>
  );
}
