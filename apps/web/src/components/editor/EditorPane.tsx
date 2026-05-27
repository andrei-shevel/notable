import { Spinner } from '@notable/ui';
import { Editor } from '@/components/editor/Editor.tsx';

import { useLoadNote } from '@/hooks/services/useLoadNote';

import styles from './EditorPane.module.scss';

export function EditorPane() {
  const { note, isLoading } = useLoadNote();

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

  return <Editor note={note} />;
}
