import { ArchiveRestore, MoreHorizontal, Star, Trash2 } from 'natural/icons';
import { Button, Icon, Menu, Tooltip } from 'natural';
import { Crumbs } from './Crumbs';
import { SavedPill } from './SavedPill';

import styles from './EditorToolbar.module.scss';

export type EditorToolbarProps = {
  trail: string[];
  savedLabel?: string;
  isSaving?: boolean;
  starred?: boolean;
  trashed?: boolean;
  onTitleClick?: () => void;
  onToggleStar?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
};

export function EditorToolbar({
  trail,
  savedLabel,
  isSaving,
  starred,
  trashed,
  onTitleClick,
  onToggleStar,
  onRestore,
  onDelete,
}: EditorToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <Crumbs trail={trail} onLeafClick={onTitleClick} />
      <div className={styles.spacer} />
      <SavedPill label={savedLabel} isSaving={isSaving} />
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button
            iconOnly
            variant="ghost"
            aria-label={starred ? 'Unstar note' : 'Star note'}
            aria-pressed={starred}
            className={starred ? styles.starred : undefined}
            onClick={onToggleStar}
          >
            <Icon icon={Star} fill={starred ? 'currentColor' : 'none'} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{starred ? 'Unstar' : 'Star'}</Tooltip.Content>
      </Tooltip.Root>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button iconOnly variant="ghost" aria-label="More actions">
            <Icon icon={MoreHorizontal} />
          </Button>
        </Menu.Trigger>
        <Menu.Content align="end">
          {trashed ? (
            <Menu.Item onSelect={onRestore}>
              <Icon icon={ArchiveRestore} /> Restore
            </Menu.Item>
          ) : null}
          <Menu.Item danger onSelect={onDelete}>
            <Icon icon={Trash2} /> {trashed ? 'Delete forever' : 'Delete'}
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </div>
  );
}
