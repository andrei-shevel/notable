import Link from '@tiptap/extension-link';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';

import { NonCollapsingParagraph } from './NonCollapsingParagraph';

// Must mirror the extension set used by the editor in apps/web so server-side
// rendering produces the same HTML structure the user sees while editing.
export const extensions = [
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
