import { useCallback } from 'react';

import type { Note, UpdateNoteRequest } from '@notable/shared';

import { useWorkspaceNav } from '@/hooks/useWorkspaceNav';
import { notesApi } from '@/lib/api/notes';
import type { WorkspaceScope } from '@/lib/scopes';
import { useNotesStore } from '@/stores/notes';

// Mirrors the API view filter so a patched note that no longer matches the
// current scope is dropped from the local list (e.g. unstar while in
// "starred", restore while in "trash").
function noteMatchesScope(note: Note, scope: WorkspaceScope): boolean {
  switch (scope.id) {
    case 'all':
      return note.trashedAt === null;
    case 'starred':
      return note.trashedAt === null && note.starred;
    case 'trash':
      return note.trashedAt !== null;
  }
}

export function useUpdateNote() {
  const { scope } = useWorkspaceNav();

  return useCallback(
    async (id: string, patch: UpdateNoteRequest): Promise<Note | null> => {
      const state = useNotesStore.getState();
      const prev = state.byId[id];
      if (!prev) return null;
      const prevIndex = state.ids.indexOf(id);

      state.patchNote(id, patch);
      state.bumpNoteToTop(id);

      try {
        const next = await notesApi.update(id, patch).json();
        const s = useNotesStore.getState();
        s.setNote(next);
        if (!noteMatchesScope(next, scope)) s.removeNote(id);
        return next;
      } catch {
        const s = useNotesStore.getState();
        s.setNote(prev);
        if (prevIndex !== -1) s.moveNoteToIndex(id, prevIndex);
        throw new Error("Couldn't save changes.");
      }
    },
    [scope],
  );
}
