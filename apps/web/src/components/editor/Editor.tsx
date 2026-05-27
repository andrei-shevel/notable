import { useState } from 'react';
import { EditorContent } from '@tiptap/react';

import type { Note } from '@notable/shared';

import { EditorToolbar } from './EditorToolbar';
import { NoteTitleModal } from '@/components/notes/NoteTitleModal';
import { FormatToolbar } from '@/components/editor/FormatToolbar.tsx';
import { ConfirmModal } from '@/components/notes/ConfirmModal.tsx';

import { useUpdateNote } from '@/hooks/services/useUpdateNote';
import { useDeleteNote } from '@/hooks/services/useDeleteNote';
import { useRestoreNote } from '@/hooks/services/useRestoreNote';
import { useNoteEditor } from '@/hooks/useNoteEditor';
import { savedLabel } from '@/lib/savedLabel';

import styles from './Editor.module.scss';

type EditorProps = {
  note: Note;
};

export function Editor({ note }: EditorProps) {
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const restoreNote = useRestoreNote();
  const [titleOpen, setTitleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const { editor, isSaving } = useNoteEditor({ note, bodyClass: styles.body });

  const noteTitle = note.title || 'Untitled';
  const noteTrashed = note.trashedAt !== null;

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
        onRestore={() => setRestoreOpen(true)}
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
      <ConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={noteTrashed ? 'Delete forever?' : 'Delete note?'}
        description={
          noteTrashed
            ? `“${noteTitle}” will be permanently deleted. This can't be undone.`
            : `“${noteTitle}” will be moved to Recently deleted. You can restore it from there.`
        }
        confirmButton={noteTrashed ? 'Delete forever' : 'Delete'}
        onConfirm={async () => deleteNote(note.id)}
      />
      <ConfirmModal
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title="Restore note?"
        description={`“${noteTitle}” will be restored.`}
        confirmButton="Restore"
        onConfirm={async () => restoreNote(note.id)}
      />
    </>
  );
}
