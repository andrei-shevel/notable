import { useMemo } from 'react';
import { Inbox, Plus, Search } from 'lucide-react';

import { Button, Icon, Input, Tooltip } from '@notable/ui';
import { NoteCard } from './NoteCard';

import { useWorkspaceNav } from '@/hooks/useWorkspaceNav';
import { FIXTURE_NOTES, FIXTURE_TAGS, type FixtureNote } from '@/lib/fixtures';
import { libraryScope, type WorkspaceScope } from '@/lib/scopes';

import styles from './NoteList.module.scss';

function scopeTitle(scope: WorkspaceScope): string {
  if (scope.kind === 'tag') {
    const tag = FIXTURE_TAGS.find((t) => t.id === scope.id);
    return tag ? `#${tag.name}` : `#${scope.id}`;
  }
  return libraryScope(scope.id).label;
}

function notesForScope(scope: WorkspaceScope): FixtureNote[] {
  if (scope.kind === 'tag') return FIXTURE_NOTES.filter((n) => n.tagIds.includes(scope.id));
  return scope.id === 'all' ? FIXTURE_NOTES : [];
}

function matchesQuery(note: FixtureNote, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return note.title.toLowerCase().includes(needle) || note.preview.toLowerCase().includes(needle);
}

export function NoteList() {
  const { scope, query, noteId, setQuery, linkTo } = useWorkspaceNav();

  const notes = useMemo(
    () => notesForScope(scope).filter((n) => matchesQuery(n, query)),
    [scope, query],
  );

  return (
    <section className={styles.list}>
      <div className={styles.head}>
        <h2 className={styles.title}>{scopeTitle(scope)}</h2>
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={styles.notes}>
        {notes.length === 0 ? (
          <div className={styles.empty}>
            <Icon icon={Inbox} size={28} />
            <p className={styles['empty-title']}>No notes here</p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              href={linkTo({ noteId: note.id })}
              active={note.id === noteId}
            />
          ))
        )}
      </div>
    </section>
  );
}
