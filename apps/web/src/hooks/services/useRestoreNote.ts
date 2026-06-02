import { useCallback } from 'react';
import { useSearchParams } from 'wouter';

import { notesApi } from '@/lib/api/notes';
import { useNotesStore } from '@/stores/notes';

export function useRestoreNote() {
  const [searchParams, setSearchParams] = useSearchParams();

  return useCallback(
    async (id: string): Promise<void> => {
      const prev = useNotesStore.getState().byId[id];
      if (!prev) return;

      try {
        await notesApi.update(id, { trashedAt: null }).json();
        useNotesStore.getState().removeNote(id);
      } catch {
        throw new Error("Couldn't restore the note. Try again.");
      }

      if (searchParams.get('n') === id) {
        searchParams.delete('n');
        setSearchParams(searchParams);
      }
    },
    [searchParams, setSearchParams],
  );
}
