import ky from 'ky';

import type { CreateNoteRequest, Note } from '@notable/shared';

export const notesApi = {
  create: (body: CreateNoteRequest) => ky.post<Note>('/api/notes', { json: body }),
};
