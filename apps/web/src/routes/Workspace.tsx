import { Sidebar } from '../components/Sidebar';
import { NoteList } from '../components/NoteList';
import { EditorPane } from '../components/EditorPane';
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
