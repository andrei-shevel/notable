import { useCallback } from 'react';

import type { Note, UpdateNoteRequest } from '@notable/shared';

import { notesApi } from '@/lib/api/notes';
import { useNotesStore } from '@/stores/notes';

export function useUpdateNote() {
  return useCallback(async (id: string, patch: UpdateNoteRequest): Promise<Note | null> => {
    const state = useNotesStore.getState();
    const prev = state.byId[id];
    if (!prev) return null;
    const prevIndex = state.ids.indexOf(id);

    state.patchNote(id, patch);
    state.bumpNoteToTop(id);

    try {
      const next = await notesApi.update(id, patch).json();
      useNotesStore.getState().setNote(next);
      return next;
    } catch {
      const s = useNotesStore.getState();
      s.setNote(prev);
      if (prevIndex !== -1) s.moveNoteToIndex(id, prevIndex);
      throw new Error("Couldn't save changes.");
    }
  }, []);
}
