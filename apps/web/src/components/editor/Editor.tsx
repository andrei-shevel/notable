import { useEffect } from 'react';
import type { JSONContent } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';

import { FormatToolbar } from './FormatToolbar';

import { useAutosave } from '@/hooks/useAutosave';

import styles from './Editor.module.scss';

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] };

type EditorProps = {
  noteId: string;
  initialBody: unknown;
};

export function Editor({ noteId, initialBody }: EditorProps) {
  const editor = useEditor(
    {
      extensions: [
        // StarterKit v3 bundles Link, so disable it here to avoid double-registering
        // when we add the configured Link extension below.
        StarterKit.configure({ link: false }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Link.configure({
          autolink: true,
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        }),
        Placeholder.configure({
          placeholder: 'Start writing…',
        }),
      ],
      content: (initialBody as JSONContent) ?? EMPTY_DOC,
      editorProps: {
        attributes: {
          class: styles.body,
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
    editor.commands.setContent((initialBody as JSONContent) ?? EMPTY_DOC, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, noteId]);

  useAutosave(editor, noteId);

  return (
    <>
      <FormatToolbar editor={editor} />
      <EditorContent editor={editor} className={styles.host} />
    </>
  );
}
