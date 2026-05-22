import { Plus, Search } from 'lucide-react';
import { Button, Icon, Input, Tooltip } from '@notable/ui';
import { NoteCard } from './NoteCard';
import { FIXTURE_NOTES, type FixtureNote } from '../lib/fixtures';
import styles from './NoteList.module.scss';

export type NoteListProps = {
  notes?: FixtureNote[];
  activeNoteId?: string;
  onSelectNote?: (id: string) => void;
};

export function NoteList({
  notes = FIXTURE_NOTES,
  activeNoteId,
  onSelectNote,
}: NoteListProps) {
  return (
    <section className={styles.list}>
      <div className={styles.head}>
        <h2 className={styles.title}>All Notes</h2>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button iconOnly variant="ghost" aria-label="New note">
              <Icon icon={Plus} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>New note</Tooltip.Content>
        </Tooltip.Root>
      </div>

      <div className={styles.search}>
        <Input
          variant="inline"
          size="sm"
          placeholder="Search notes…"
          aria-label="Search notes"
          leftIcon={<Icon icon={Search} size={14} />}
        />
      </div>

      <div className={styles.notes}>
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            active={note.id === activeNoteId}
            onClick={() => onSelectNote?.(note.id)}
          />
        ))}
      </div>
    </section>
  );
}
