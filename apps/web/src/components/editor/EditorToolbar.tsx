import { MoreHorizontal, Star } from 'lucide-react';
import { Button, Icon, Tooltip } from '@notable/ui';
import { Crumbs } from './Crumbs';
import { SavedPill } from './SavedPill';
import styles from './EditorToolbar.module.scss';

export type EditorToolbarProps = {
  trail: string[];
  savedLabel?: string;
  isSaving?: boolean;
  onTitleClick?: () => void;
};

export function EditorToolbar({ trail, savedLabel, isSaving, onTitleClick }: EditorToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <Crumbs trail={trail} onLeafClick={onTitleClick} />
      <div className={styles.spacer} />
      <SavedPill label={savedLabel} isSaving={isSaving} />
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button iconOnly variant="ghost" aria-label="Star note">
            <Icon icon={Star} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>Star</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button iconOnly variant="ghost" aria-label="More actions">
            <Icon icon={MoreHorizontal} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>More</Tooltip.Content>
      </Tooltip.Root>
    </div>
  );
}
