import { Sidebar } from '../components/sidebar/Sidebar';
import { NoteList } from '../components/notes/NoteList';
import { EditorPane } from '../components/editor/EditorPane';

import { FIXTURE_ACTIVE_NOTE_ID } from '../lib/fixtures';

import styles from './Workspace.module.scss';

export function Workspace() {
  return (
    <div className={styles.workspace}>
      <Sidebar />
      <NoteList activeNoteId={FIXTURE_ACTIVE_NOTE_ID} />
      <EditorPane />
    </div>
  );
}
