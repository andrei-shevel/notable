import Link from '@tiptap/extension-link';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

import { NonCollapsingParagraph } from './NonCollapsingParagraph';

export const clientExtensions = [
  StarterKit.configure({ link: false }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Link.configure({
    autolink: true,
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
  }),
  Placeholder.configure({
    placeholder: 'Start writing…',
  }),
];

// Must mirror the clientExtensions so server-side
// rendering produces the same HTML structure the user sees while editing.
export const htmlExtensions = [
  StarterKit.configure({ link: false, paragraph: false }),
  NonCollapsingParagraph,
  TaskList,
  TaskItem.configure({ nested: true }),
  Link.configure({
    autolink: true,
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
  }),
];
