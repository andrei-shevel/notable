import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { NoteListQuery } from '@notable/shared';
import type { WorkspaceScope } from '@/lib/scopes';

import { useWorkspaceNav } from '@/hooks/useWorkspaceNav';
import { useNotes } from '@/hooks/data/useNotes';
import { useNotesStore } from '@/stores/notes';
import { notesApi } from '@/lib/api/notes';

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 30;

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
  switch (scope.id) {
    case 'all':
      return { orderBy: 'updatedAt', orderDir: 'desc' };
    case 'starred':
      return { orderBy: 'updatedAt', orderDir: 'desc', view: 'starred' };
    case 'trash':
      return { orderBy: 'updatedAt', orderDir: 'desc', view: 'trash' };
  }
}

export function useLoadNotes() {
  const { scope, query } = useWorkspaceNav();
  const debouncedQuery = useDebounced(query.trim(), SEARCH_DEBOUNCE_MS);

  const notes = useNotes();
  const { setNotes, appendNotes } = useNotesStore(
    useShallow((s) => ({
      setNotes: s.setNotes,
      appendNotes: s.appendNotes,
    })),
  );
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseParams = useMemo<NoteListQuery>(
    () => ({
      ...scopeToParams(scope),
      ...(debouncedQuery ? { q: debouncedQuery } : {}),
      limit: PAGE_SIZE,
    }),
    [scope.kind, scope.id, debouncedQuery],
  );

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    setNotes([]);
    setNextCursor(null);

    notesApi
      .list(baseParams, controller.signal)
      .json()
      .then((res) => {
        if (controller.signal.aborted) return;
        setNotes(res.items);
        setNextCursor(res.nextCursor);
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError("Couldn't load notes.");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [baseParams, setNotes]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore || isLoading) return;

    // Capture the current page set's signal. If params change mid-flight,
    // the effect aborts this controller and we drop the result.
    const signal = abortRef.current?.signal;
    setIsLoadingMore(true);
    try {
      const res = await notesApi.list({ ...baseParams, cursor: nextCursor }, signal).json();
      if (signal?.aborted) return;
      appendNotes(res.items);
      setNextCursor(res.nextCursor);
    } catch {
      if (signal?.aborted) return;
      setError("Couldn't load more notes.");
    } finally {
      if (!signal?.aborted) setIsLoadingMore(false);
    }
  }, [baseParams, nextCursor, isLoadingMore, isLoading, appendNotes]);

  return {
    notes,
    isLoading,
    isLoadingMore,
    hasMore: nextCursor !== null,
    error,
    loadMore,
  };
}
