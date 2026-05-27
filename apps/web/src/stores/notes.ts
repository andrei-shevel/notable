import { create } from 'zustand';

import type { Note } from '@notable/shared';

type NotesState = {
  byId: Record<string, Note>;
  ids: string[];
  setNotes: (notes: Note[]) => void;
  appendNotes: (notes: Note[]) => void;
};

export const useNotesStore = create<NotesState>((set) => ({
  byId: {},
  ids: [],
  setNotes: (notes) =>
    set((state) => {
      const byId = { ...state.byId };
      const ids = [];
      for (const n of notes) {
        ids.push(n.id);
        byId[n.id] = n;
      }
      return { byId, ids };
    }),
  appendNotes: (notes) =>
    set((state) => {
      const byId = { ...state.byId };
      const ids = [...state.ids];
      for (const n of notes) {
        ids.push(n.id);
        byId[n.id] = n;
      }
      return { byId, ids };
    }),
}));
