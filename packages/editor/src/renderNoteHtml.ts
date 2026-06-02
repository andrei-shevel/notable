import type { JSONContent } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';

import { htmlExtensions } from './extensions';
import { escapeHtml } from './lib/utils';

export function renderNoteHtml(note: { title: string; bodyJson: JSONContent }): string {
  const body = generateHTML(note.bodyJson, htmlExtensions);
  const safeTitle = escapeHtml(note.title.trim() || 'Untitled');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="note-body">
${body}
</div>
</body>
</html>
`;
}
