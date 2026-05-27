import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import type { LucideIcon } from 'lucide-react';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Undo2,
} from 'lucide-react';

import { Button, Icon, Tooltip } from '@notable/ui';

import { LinkEditPopover } from './LinkEditPopover';

import styles from './FormatToolbar.module.scss';

type FormatToolbarProps = { editor: Editor | null };

// Selector keeps only the booleans we render so a paragraph-to-paragraph
// transaction doesn't re-render the toolbar at all (deep-equal compare).
type ToolbarState = {
  h1: boolean;
  h2: boolean;
  h3: boolean;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  bulletList: boolean;
  orderedList: boolean;
  taskList: boolean;
  blockquote: boolean;
  codeBlock: boolean;
  link: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

export function FormatToolbar({ editor }: FormatToolbarProps) {
  const state = useEditorState<ToolbarState | null>({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      return {
        h1: e.isActive('heading', { level: 1 }),
        h2: e.isActive('heading', { level: 2 }),
        h3: e.isActive('heading', { level: 3 }),
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        strike: e.isActive('strike'),
        code: e.isActive('code'),
        bulletList: e.isActive('bulletList'),
        orderedList: e.isActive('orderedList'),
        taskList: e.isActive('taskList'),
        blockquote: e.isActive('blockquote'),
        codeBlock: e.isActive('codeBlock'),
        link: e.isActive('link'),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });

  if (!editor || !state) return null;

  return (
    <div className={styles.bar} role="toolbar" aria-label="Formatting">
      <Group>
        <ToolBtn
          icon={Heading1}
          label="Heading 1"
          shortcut="⌘⌥1"
          active={state.h1}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolBtn
          icon={Heading2}
          label="Heading 2"
          shortcut="⌘⌥2"
          active={state.h2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolBtn
          icon={Heading3}
          label="Heading 3"
          shortcut="⌘⌥3"
          active={state.h3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
      </Group>
      <div className={styles.divider} aria-hidden="true" />
      <Group>
        <ToolBtn
          icon={Bold}
          label="Bold"
          shortcut="⌘B"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolBtn
          icon={Italic}
          label="Italic"
          shortcut="⌘I"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolBtn
          icon={Strikethrough}
          label="Strikethrough"
          shortcut="⌘⇧X"
          active={state.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolBtn
          icon={Code}
          label="Inline code"
          shortcut="⌘E"
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <LinkEditPopover editor={editor} active={state.link} />
      </Group>
      <div className={styles.divider} aria-hidden="true" />
      <Group>
        <ToolBtn
          icon={List}
          label="Bullet list"
          shortcut="⌘⇧8"
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolBtn
          icon={ListOrdered}
          label="Numbered list"
          shortcut="⌘⇧7"
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolBtn
          icon={ListChecks}
          label="Task list"
          shortcut="⌘⇧9"
          active={state.taskList}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        />
      </Group>
      <div className={styles.divider} aria-hidden="true" />
      <Group>
        <ToolBtn
          icon={Quote}
          label="Blockquote"
          shortcut="⌘⇧B"
          active={state.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolBtn
          icon={SquareCode}
          label="Code block"
          shortcut="⌘⌥C"
          active={state.codeBlock}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
      </Group>
      <div className={styles.divider} aria-hidden="true" />
      <Group>
        <ToolBtn
          icon={Undo2}
          label="Undo"
          shortcut="⌘Z"
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolBtn
          icon={Redo2}
          label="Redo"
          shortcut="⌘⇧Z"
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </Group>
    </div>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <div className={styles.group}>{children}</div>;
}

type ToolBtnProps = {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolBtn({ icon, label, shortcut, active, disabled, onClick }: ToolBtnProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button
          iconOnly
          variant="ghost"
          size="sm"
          aria-label={label}
          aria-pressed={active}
          data-active={active || undefined}
          disabled={disabled}
          className={styles.btn}
          onClick={onClick}
        >
          <Icon icon={icon} size={16} />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>
        {label}
        {shortcut ? ` · ${shortcut}` : null}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
