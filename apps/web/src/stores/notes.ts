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
    set({
      byId: Object.fromEntries(notes.map((n) => [n.id, n])),
      ids: notes.map((n) => n.id),
    }),
  appendNotes: (notes) =>
    set((state) => {
      const byId = { ...state.byId };
      const ids = [...state.ids];
      for (const n of notes) {
        if (!(n.id in byId)) ids.push(n.id);
        byId[n.id] = n;
      }
      return { byId, ids };
    }),
}));
