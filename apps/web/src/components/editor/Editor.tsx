import { useState } from 'react';
import { EditorContent } from '@tiptap/react';

import type { Note } from '@notable/shared';

import { EditorToolbar } from './EditorToolbar';
import { NoteTitleModal } from '@/components/notes/NoteTitleModal';
import { DeleteNoteModal } from '@/components/notes/DeleteNoteModal';
import { FormatToolbar } from '@/components/editor/FormatToolbar.tsx';

import { useUpdateNote } from '@/hooks/services/useUpdateNote';
import { useDeleteNote } from '@/hooks/services/useDeleteNote';
import { useNoteEditor } from '@/hooks/useNoteEditor';
import { savedLabel } from '@/lib/savedLabel';

import styles from './Editor.module.scss';

type EditorProps = {
  note: Note;
};

export function Editor({ note }: EditorProps) {
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const [titleOpen, setTitleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { editor, isSaving } = useNoteEditor({ note, bodyClass: styles.body });

  return (
    <>
      <EditorToolbar
        trail={[note.title || 'Untitled']}
        savedLabel={savedLabel(note.updatedAt)}
        isSaving={isSaving}
        starred={note.starred}
        trashed={note.trashedAt !== null}
        onTitleClick={() => setTitleOpen(true)}
        onToggleStar={() => {
          void updateNote(note.id, { starred: !note.starred });
        }}
        onRestore={() => {
          void updateNote(note.id, { trashedAt: null });
        }}
        onDelete={() => setDeleteOpen(true)}
      />
      <div className={styles.scroll}>
        <FormatToolbar editor={editor} />
        <EditorContent editor={editor} className={styles.host} />
      </div>
      <NoteTitleModal
        open={titleOpen}
        onOpenChange={setTitleOpen}
        dialogTitle="Edit title"
        dialogDescription="Rename this note. The change shows up everywhere it's listed."
        submitLabel="Save"
        initialTitle={note.title}
        onSubmit={async (title) => {
          await updateNote(note.id, { title });
        }}
      />
      <DeleteNoteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={note.title || 'Untitled'}
        trashed={note.trashedAt !== null}
        onConfirm={async () => deleteNote(note.id)}
      />
    </>
  );
}
