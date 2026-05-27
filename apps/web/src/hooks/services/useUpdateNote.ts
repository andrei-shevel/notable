import { useCallback } from 'react';

import type { Note, UpdateNoteRequest } from '@notable/shared';

import { notesApi } from '@/lib/api/notes';
import { useNotesStore } from '@/stores/notes';

// Patches a note: applies an optimistic store update immediately, fires the
// PATCH, then replaces the local entry with the server response on success
// (picks up the canonical `updatedAt`) or rolls back to the prior snapshot on
// failure. Concurrent calls are last-write-wins — fine for a single user
// across devices, see PLAN.md step 13.
export function useUpdateNote() {
  return useCallback(async (id: string, patch: UpdateNoteRequest): Promise<Note | null> => {
    const prev = useNotesStore.getState().byId[id];
    if (!prev) return null;

    useNotesStore.getState().patchNote(id, patch);

    try {
      const next = await notesApi.update(id, patch).json();
      useNotesStore.getState().setNote(next);
      return next;
    } catch {
      useNotesStore.getState().setNote(prev);
      throw new Error("Couldn't save changes.");
    }
  }, []);
}
