import { useCallback } from 'react';
import { useLocation } from 'wouter';

import type { CreateNoteRequest } from '@notable/shared';

import { useWorkspaceNav } from '@/hooks/useWorkspaceNav';
import { notesApi } from '@/lib/api/notes';
import { useNotesStore } from '@/stores/notes';

export function useCreateNote() {
  const { linkTo } = useWorkspaceNav();
  const [, setLocation] = useLocation();

  return useCallback(
    async (input: CreateNoteRequest): Promise<void> => {
      try {
        const note = await notesApi.create(input).json();
        useNotesStore.getState().prependNotes([note]);
        setLocation(linkTo({ noteId: note.id }));
      } catch (err) {
        throw new Error("Couldn't create the note. Try again.");
      }
    },
    [linkTo, setLocation],
  );
}
