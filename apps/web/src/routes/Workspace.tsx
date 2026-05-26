import { Sidebar } from '@/components/sidebar/Sidebar';
import { EditorPane } from '@/components/editor/EditorPane';

import styles from './Workspace.module.scss';

export function Workspace() {
  return (
    <div className={styles.workspace}>
      <Sidebar />
      <EditorPane />
    </div>
  );
}
