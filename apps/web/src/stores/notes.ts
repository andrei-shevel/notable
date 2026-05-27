import { create } from 'zustand';

import type { Note } from '@notable/shared';

type NotesState = {
  byId: Record<string, Note>;
  ids: string[];
  setNote: (notes: Note) => void;
  patchNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => void;
  setNotes: (notes: Note[]) => void;
  appendNotes: (notes: Note[]) => void;
  prependNotes: (notes: Note[]) => void;
  bumpNoteToTop: (id: string) => void;
  moveNoteToIndex: (id: string, index: number) => void;
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
  removeNote: (id) => {
    set((state) => {
      if (!state.byId[id]) return state;
      const byId = { ...state.byId };
      delete byId[id];
      return { byId, ids: state.ids.filter((n) => n !== id) };
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
  prependNotes: (notes) =>
    set((state) => {
      const byId = { ...state.byId };
      const ids = [...state.ids];
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i]!;
        ids.unshift(n.id);
        byId[n.id] = n;
      }
      return { byId, ids };
    }),
  bumpNoteToTop: (id) =>
    set((state) => {
      const idx = state.ids.indexOf(id);
      if (idx <= 0) return state;
      const ids = [...state.ids];
      ids.splice(idx, 1);
      ids.unshift(id);
      return { ids };
    }),
  moveNoteToIndex: (id, index) =>
    set((state) => {
      const current = state.ids.indexOf(id);
      if (current === -1 || current === index) return state;
      const ids = [...state.ids];
      ids.splice(current, 1);
      ids.splice(index, 0, id);
      return { ids };
    }),
}));
