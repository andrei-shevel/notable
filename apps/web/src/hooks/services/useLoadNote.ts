import { useEffect, useState } from 'react';

import { useNote } from '@/hooks/data/useNote';
import { useWorkspaceNav } from '@/hooks/useWorkspaceNav';
import { useNotesStore } from '@/stores/notes';
import { notesApi } from '@/lib/api/notes';

export function useLoadNote() {
  const { noteId } = useWorkspaceNav();
  const note = useNote(noteId);
  const [isLoading, setIsLoading] = useState(noteId && !note);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (note || !noteId) {
      return;
    }

    const controller = new AbortController();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    notesApi
      .get(noteId, controller.signal)
      .json()
      .then((note) => {
        if (controller.signal.aborted) return;
        useNotesStore.getState().setNote(note);
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError("Couldn't load note.");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  return { note, isLoading, error };
}
