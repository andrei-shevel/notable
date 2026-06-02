import { useEffect } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useEditor } from '@tiptap/react';

import type { Note } from '@notable/shared';

import { clientExtensions } from '../extensions';

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] };

type Options = {
  note: Note;
  bodyClass?: string;
};

export function useNoteEditor({ note, bodyClass }: Options) {
  const editor = useEditor(
    {
      extensions: clientExtensions,
      content: note.bodyJson ?? EMPTY_DOC,
      editorProps: {
        attributes: {
          ...(bodyClass ? { class: bodyClass } : {}),
          spellcheck: 'true',
        },
      },
    },
    [],
  );

  // Swap content in place when the active note changes. `emitUpdate: false`
  // means this load is never mistaken for a user edit (which would otherwise
  // trigger autosave on every note open). `initialBody` is intentionally
  // excluded from deps — once a note is loaded we let in-editor changes win,
  // and only re-seed when the note id itself flips.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setContent(note.bodyJson ?? EMPTY_DOC, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, note.id]);

  return { editor };
}
