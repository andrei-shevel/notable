import { useCallback, useRef, useState } from 'react';

import type { JSONContent } from '@notable/editor/client';
import type { Note, UpdateNoteRequest } from '@notable/shared';

type UpdateNoteFn = (id: string, patch: UpdateNoteRequest) => Promise<Note | null>;

// TODO state should be moved to store, currently save A -> B -> A and second A doesn't know about first one
export function useAutosave(noteId: string | undefined, onUpdate: UpdateNoteFn) {
  const [isSaving, setIsSaving] = useState(false);

  const contentRef = useRef<UpdateNoteRequest | null>(null);
  const inFlightRef = useRef(false);

  const flush = useCallback(async () => {
    if (!noteId || inFlightRef.current || !contentRef.current) return;

    inFlightRef.current = true;
    setIsSaving(true);

    while (contentRef.current) {
      const contentToSave = contentRef.current;
      contentRef.current = null;
      try {
        await onUpdate(noteId, contentToSave);
      } catch {
        // TODO introduce some logger
      }
    }

    inFlightRef.current = false;
    setIsSaving(false);
  }, [noteId, onUpdate]);

  const handleUpdate = useCallback(
    (bodyJson: JSONContent, bodyText: string) => {
      if (!noteId) return;
      contentRef.current = { bodyJson, bodyText };
      void flush();
    },
    [noteId, flush],
  );

  return { isSaving, handleUpdate };
}
