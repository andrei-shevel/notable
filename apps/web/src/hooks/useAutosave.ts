import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';

import { useUpdateNote } from '@/hooks/services/useUpdateNote';

const AUTOSAVE_DEBOUNCE_MS = 500;

// Debounced autosave: listens for editor `update` events and, 500ms after the
// last keystroke, PATCHes the note with the current `{ bodyJson, bodyText }`.
// Switching notes loads content via `editor.commands.setContent(doc, false)`
// — the `false` flag suppresses the `update` event so we never autosave on
// load. The same flush-on-unmount semantics apply when noteId changes: the
// pending timer is cleared and an immediate save fires for the outgoing note.
export function useAutosave(editor: Editor | null, noteId: string | undefined) {
  const updateNote = useUpdateNote();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the id the current timer was scheduled for, so we save against the
  // right note even if the user switches mid-debounce.
  const pendingForRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!editor || !noteId) return;

    const flush = (id: string) => {
      if (!editor || editor.isDestroyed) return;
      void updateNote(id, {
        bodyJson: editor.getJSON(),
        bodyText: editor.getText(),
      });
    };

    const handleUpdate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingForRef.current = noteId;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        flush(noteId);
      }, AUTOSAVE_DEBOUNCE_MS);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      // If a save is pending for *this* noteId when we tear down (note change
      // or unmount), flush it synchronously so the keystrokes aren't lost.
      if (timerRef.current && pendingForRef.current === noteId) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        flush(noteId);
      }
    };
  }, [editor, noteId, updateNote]);
}
