import Paragraph from '@tiptap/extension-paragraph';

// Empty paragraphs collapse to zero height when serialized as `<p></p>`.
// Overriding renderHTML on the node keeps the blank line the user typed.
export const NonCollapsingParagraph = Paragraph.extend({
  renderHTML({ node, HTMLAttributes }) {
    if (node.content.size === 0) {
      return ['p', HTMLAttributes, ' '];
    }
    return ['p', HTMLAttributes, 0];
  },
});
