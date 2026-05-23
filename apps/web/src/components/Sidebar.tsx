import { Clock, FileText, Star, Trash2 } from 'lucide-react';
import { Avatar } from '@notable/ui';
import { Brand } from './Brand';
import { NavItem } from './NavItem';
import { FIXTURE_NAV_COUNTS, FIXTURE_TAGS, FIXTURE_USER } from '../lib/fixtures';
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

      <div className={styles.foot}>
        <Avatar name={FIXTURE_USER.name} className={styles.avatar} />
        <div className={styles['user-meta']}>
          <span className={styles['user-name']}>{FIXTURE_USER.name}</span>
          <span className={styles['user-email']}>{FIXTURE_USER.email}</span>
        </div>
      </div>
    </aside>
  );
}
