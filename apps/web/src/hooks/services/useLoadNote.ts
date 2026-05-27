import { useEffect, useState } from 'react';

import { useNote } from '@/hooks/data/useNote';
import { useWorkspaceNav } from '@/hooks/useWorkspaceNav';

export function useLoadNote() {
  const { noteId } = useWorkspaceNav();
  const note = useNote(noteId);
  const [isLoading, setIsLoading] = useState(noteId && !note);

  useEffect(() => {
    if (note || !noteId) {
      return;
    }

    setIsLoading(true);
  }, [note]);

  return { note, isLoading };
}
