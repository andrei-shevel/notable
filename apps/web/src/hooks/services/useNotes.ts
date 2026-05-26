import { useEffect, useState } from 'react';

import type { Note, NoteListQuery } from '@notable/shared';

import { useWorkspaceNav } from '@/hooks/useWorkspaceNav';
import { notesApi } from '@/lib/api/notes';
import type { WorkspaceScope } from '@/lib/scopes';

const SEARCH_DEBOUNCE_MS = 250;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

type ScopeParams = Pick<NoteListQuery, 'orderBy' | 'orderDir' | 'view'>;

function scopeToParams(scope: WorkspaceScope): ScopeParams {
  // Tag filtering isn't wired through the API yet — fall through to the
  // recent view so the panel shows something sensible.
  if (scope.kind === 'tag') return { orderBy: 'updatedAt', orderDir: 'desc' };
  switch (scope.id) {
    case 'all':
      return { orderBy: 'title', orderDir: 'asc' };
    case 'starred':
      return { orderBy: 'updatedAt', orderDir: 'desc', view: 'starred' };
    case 'trash':
      return { orderBy: 'updatedAt', orderDir: 'desc', view: 'trash' };
    case 'recent':
      return { orderBy: 'updatedAt', orderDir: 'desc' };
  }
}

export function useNotes() {
  const { scope, query } = useWorkspaceNav();
  const debouncedQuery = useDebounced(query.trim(), SEARCH_DEBOUNCE_MS);

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const params: NoteListQuery = {
      ...scopeToParams(scope),
      ...(debouncedQuery ? { q: debouncedQuery } : {}),
    };

    notesApi
      .list(params, controller.signal)
      .json()
      .then((res) => {
        setNotes(res.items);
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError("Couldn't load notes.");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [scope.kind, scope.id, debouncedQuery]);

  return { notes, isLoading, error };
}
