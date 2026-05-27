import { create } from 'zustand';

import type { Note } from '@notable/shared';

type NotesState = {
  byId: Record<string, Note>;
  ids: string[];
  setNote: (notes: Note) => void;
  patchNote: (id: string, patch: Partial<Note>) => void;
  setNotes: (notes: Note[]) => void;
  appendNotes: (notes: Note[]) => void;
};

export const useNotesStore = create<NotesState>((set) => ({
  byId: {},
  ids: [],
  setNote: (note) => {
    set((state) => ({ byId: { ...state.byId, [note.id]: note } }));
  },
  patchNote: (id, patch) => {
    set((state) => {
      const current = state.byId[id];
      if (!current) return state;
      return { byId: { ...state.byId, [id]: { ...current, ...patch } } };
    });
  },
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
