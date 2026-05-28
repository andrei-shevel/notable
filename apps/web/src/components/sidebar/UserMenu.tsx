import { useCallback, useState } from 'react';
import { useLocation } from 'wouter';
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react';

import { Menu } from '@notable/ui';

import { useCurrentUser } from '@/hooks/data/useCurrentUser';
import { useSignOut } from '@/hooks/services/useSignOut';

import styles from './UserMenu.module.scss';

export function UserMenu() {
  const [isPending, setIsPending] = useState(false);
  const [, setLocation] = useLocation();

  const user = useCurrentUser();
  const logout = useSignOut();

  const handleLogout = useCallback(async () => {
    setIsPending(true);
    await logout();
    setIsPending(false);
  }, [logout]);

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button type="button" className={styles.trigger} aria-label="Account menu">
          <div className={styles.meta}>
            <span className={styles.email}>{user.email}</span>
          </div>
          <ChevronsUpDown size={14} className={styles.chevron} aria-hidden />
        </button>
      </Menu.Trigger>
      <Menu.Content align="start" side="top" sideOffset={8} className={styles.menu}>
        <Menu.Item onSelect={() => setLocation('/settings')}>
          <Settings size={14} aria-hidden />
          Settings
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item danger disabled={isPending} onSelect={handleLogout}>
          <LogOut size={14} aria-hidden />
          Sign out
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}
