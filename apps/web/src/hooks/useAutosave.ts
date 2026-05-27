import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

import type { UpdateNoteRequest } from '@notable/shared';

import { useUpdateNote } from '@/hooks/services/useUpdateNote';

// TODO state should be moved to store, currently save A -> B -> A and second A doesn't know about first one
export function useAutosave(editor: Editor | null, noteId: string | undefined) {
  const [isSaving, setIsSaving] = useState(false);

  const updateNote = useUpdateNote();

  useEffect(() => {
    if (!editor || !noteId) return;

    let content: UpdateNoteRequest | null = null;
    let inFlight = false;
    let isMounted = true;

    const flush = async () => {
      if (inFlight || !content) {
        return;
      }

      inFlight = true;
      isMounted && setIsSaving(true);

      const contentToSave = content;
      content = null;
      try {
        await updateNote(noteId, contentToSave);
      } catch {}

      inFlight = false;
      isMounted && setIsSaving(false);

      void flush();
    };

    const handleUpdate = () => {
      content = { bodyJson: editor.getJSON(), bodyText: editor.getText() };
      void flush();
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      isMounted = false;
      setIsSaving(false);
    };
  }, [editor, noteId, updateNote]);

  return { isSaving };
}
