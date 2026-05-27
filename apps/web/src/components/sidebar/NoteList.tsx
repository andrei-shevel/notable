import { useEffect, useRef, useState } from 'react';
import { Inbox, Plus, Search } from 'lucide-react';

import { Button, Icon, Input, Tooltip } from '@notable/ui';
import { NoteCard } from './NoteCard';
import { NoteListSkeleton } from './NoteListSkeleton';
import { NoteTitleModal } from '@/components/notes/NoteTitleModal';

import { useWorkspaceNav } from '@/hooks/useWorkspaceNav';
import { useLoadNotes } from '@/hooks/services/useLoadNotes';
import { useCreateNote } from '@/hooks/services/useCreateNote';
import { libraryScope, type WorkspaceScope } from '@/lib/scopes';

import styles from './NoteList.module.scss';

function scopeTitle(scope: WorkspaceScope): string {
  return libraryScope(scope.id).label;
}

export function NoteList() {
  const { notes, isLoading, isLoadingMore, hasMore, error, loadMore } = useLoadNotes();

  const { scope, query, noteId, setQuery, linkTo } = useWorkspaceNav();
  const createNote = useCreateNote();
  const [createOpen, setCreateOpen] = useState(false);

  const showSkeleton = isLoading && notes.length === 0 && !error;
  const showEmpty = !isLoading && !error && notes.length === 0;

  // Route the observer callback through a ref so the effect below only
  // re-binds when the sentinel actually needs to appear/disappear, not on
  // every loadMore identity change.
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore || isLoading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreRef.current();
        }
      },
      // Pre-fetch a viewport before the user reaches the bottom so scrolling
      // feels seamless.
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, isLoading]);

  return (
    <section className={styles.list}>
      <div className={styles.head}>
        <h2 className={styles.title}>{scopeTitle(scope)}</h2>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button
              iconOnly
              variant="ghost"
              aria-label="New note"
              onClick={() => setCreateOpen(true)}
            >
              <Icon icon={Plus} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>New note</Tooltip.Content>
        </Tooltip.Root>
        <NoteTitleModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          dialogTitle="New note"
          dialogDescription="Give it a working title. You can add details after it's created."
          submitLabel="Create note"
          onSubmit={(title) => createNote({ title })}
        />
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

      <div className={styles.notes} aria-busy={isLoading}>
        {showSkeleton ? (
          <NoteListSkeleton />
        ) : error ? (
          <div className={styles.empty} role="alert">
            <p className={styles['empty-title']}>{error}</p>
          </div>
        ) : showEmpty ? (
          <div className={styles.empty}>
            <Icon icon={Inbox} size={28} />
            <p className={styles['empty-title']}>No notes here</p>
          </div>
        ) : (
          <>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                href={linkTo({ noteId: note.id })}
                active={note.id === noteId}
              />
            ))}
            {hasMore && !isLoadingMore && (
              <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
            )}
            {isLoadingMore && <NoteListSkeleton count={2} />}
          </>
        )}
      </div>
    </section>
  );
}
