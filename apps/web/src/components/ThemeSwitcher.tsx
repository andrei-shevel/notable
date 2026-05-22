import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button, Icon, Menu, Tooltip } from '@notable/ui';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from '../hooks/useTheme';
import styles from './ThemeSwitcher.module.scss';

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function ThemeSwitcher() {
  const { theme, setTheme, resolved } = useTheme();
  const TriggerIcon = resolved === 'dark' ? Moon : Sun;

  return (
    <Menu.Root>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Menu.Trigger asChild>
            <Button iconOnly variant="ghost" aria-label="Change theme">
              <Icon icon={TriggerIcon} />
            </Button>
          </Menu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content>Theme</Tooltip.Content>
      </Tooltip.Root>
      <Menu.Content align="end" sideOffset={8}>
        {OPTIONS.map((opt) => {
          const selected = theme === opt.value;
          return (
            <Menu.Item
              key={opt.value}
              onSelect={() => setTheme(opt.value)}
              className={styles.item}
            >
              <Icon icon={opt.icon} />
              {opt.label}
              {selected ? (
                <Icon icon={Check} className={styles.check} />
              ) : (
                <span className={styles.placeholder} aria-hidden="true" />
              )}
            </Menu.Item>
          );
        })}
      </Menu.Content>
    </Menu.Root>
  );
}
