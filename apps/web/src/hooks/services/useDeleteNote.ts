import { useCallback } from 'react';
import { useSearchParams } from 'wouter';

import { notesApi } from '@/lib/api/notes';
import { useNotesStore } from '@/stores/notes';

export function useDeleteNote() {
  const [searchParams, setSearchParams] = useSearchParams();

  return useCallback(
    async (id: string): Promise<void> => {
      try {
        await notesApi.delete(id);
      } catch {
        throw new Error("Couldn't delete the note. Try again.");
      }
      useNotesStore.getState().removeNote(id);

      if (searchParams.get('n') === id) {
        searchParams.delete('n');
        setSearchParams(searchParams);
      }
    },
    [searchParams, setSearchParams],
  );
}
