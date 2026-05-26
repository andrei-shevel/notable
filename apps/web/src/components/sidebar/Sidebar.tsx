import { MainNavigation } from '@/components/sidebar/MainNavigation';
import { NoteList } from '@/components/sidebar/NoteList';

export function Sidebar() {
  return (
    <>
      <MainNavigation />
      <NoteList />
    </>
  );
}
