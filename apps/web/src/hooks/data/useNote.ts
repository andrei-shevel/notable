import type { Note } from '@notable/shared';

import { useNotesStore } from '@/stores/notes';

export function useNote(id: string | undefined): Note | undefined {
  return useNotesStore((s) => (id ? s.byId[id] : undefined));
}
