import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'wouter';

import { parseScope, scopeToPath, type WorkspaceScope } from '@/lib/scopes';

export type LinkTarget = {
  scope?: WorkspaceScope;
  noteId?: string;
};

type WorkspaceNav = {
  scope: WorkspaceScope;
  query: string;
  noteId: string | undefined;
  setQuery: (query: string) => void;
  /**
   * Build a href that swaps in the given scope/noteId (or keeps the
   * current ones when omitted), preserving the search query.
   */
  linkTo: (target: LinkTarget) => string;
};

export function useWorkspaceNav(): WorkspaceNav {
  const [location] = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const scope = useMemo(() => parseScope(location), [location]);
  const query = searchParams.get('q') ?? '';
  const noteId = searchParams.get('n') ?? undefined;

  const linkTo = useCallback(
    ({ scope: nextScope, noteId: nextNoteId }: LinkTarget) => {
      const next = new URLSearchParams(searchParams);
      if (nextScope) {
        next.delete('q');
        next.delete('n');
      }
      if (nextNoteId !== undefined) {
        next.set('n', nextNoteId);
      }
      const qs = next.toString();
      const path = nextScope ? scopeToPath(nextScope) : location;
      return qs ? `${path}?${qs}` : path;
    },
    [location, searchParams],
  );

  // Query typing happens per keystroke; use replace so history doesn't fill
  // up with one entry per character.
  const setQuery = useCallback(
    (next: string) => {
      if (next) {
        searchParams.set('q', next);
      } else {
        searchParams.delete('q');
      }
      setSearchParams(searchParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return { scope, query, noteId, setQuery, linkTo };
}
