import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useNotesStore } from '@/stores/notes';

export function useNotes() {
  const { byId, ids } = useNotesStore(useShallow((s) => ({ byId: s.byId, ids: s.ids })));
  return useMemo(() => ids.map((id) => byId[id]!), [ids, byId]);
}
