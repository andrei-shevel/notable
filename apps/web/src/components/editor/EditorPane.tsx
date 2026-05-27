import { useState } from 'react';

import { Spinner } from '@notable/ui';

import { Editor } from './Editor';
import { EditorToolbar } from './EditorToolbar';
import { NoteTitleModal } from '@/components/notes/NoteTitleModal';

import { useLoadNote } from '@/hooks/services/useLoadNote';
import { useUpdateNote } from '@/hooks/services/useUpdateNote';
import { savedLabel } from '@/lib/savedLabel';

import styles from './EditorPane.module.scss';

export function EditorPane() {
  const { note, isLoading } = useLoadNote();
  const updateNote = useUpdateNote();
  const [titleOpen, setTitleOpen] = useState(false);

  if (isLoading) {
    return (
      <main className={styles.pane} aria-busy="true">
        <div className={styles.loading}>
          <Spinner size={20} label="Loading note" />
        </div>
      </main>
    );
  }

  if (!note) {
    return (
      <main className={styles.pane}>
        <div className={styles.empty}>
          <p>Select a note to start editing.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.pane}>
      <EditorToolbar
        trail={[note.title || 'Untitled']}
        savedLabel={savedLabel(note.updatedAt)}
        onTitleClick={() => setTitleOpen(true)}
      />
      <div className={styles.scroll}>
        <Editor noteId={note.id} initialBody={note.bodyJson} />
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
    </main>
  );
}
