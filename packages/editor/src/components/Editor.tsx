import { useEffect } from 'react';
import { EditorContent, type Editor as EditorType } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';

import type { Note } from '@notable/shared';

import { FormatToolbar } from './FormatToolbar';

import { useNoteEditor } from '../hooks/useNoteEditor';

import styles from './Editor.module.scss';

type EditorProps = {
  note: Note;
  onUpdate?: (bodyJson: JSONContent, bodyText: string) => void;
};

export function Editor({ note, onUpdate }: EditorProps) {
  const { editor } = useNoteEditor({ note, bodyClass: styles.body });

  useEffect(() => {
    if (!editor || editor.isDestroyed || !onUpdate) return;

    const listener = ({ editor }: { editor: EditorType }) => {
      onUpdate(editor.getJSON(), editor.getText());
    };

    editor.on('update', listener);
    return () => {
      editor.off('update', listener);
    };
  }, [editor, onUpdate]);

  return (
    <div className={styles.scroll}>
      <FormatToolbar editor={editor} />
      <EditorContent editor={editor} className={styles.host} />
    </div>
  );
}
