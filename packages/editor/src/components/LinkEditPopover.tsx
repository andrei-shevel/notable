import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Editor } from '@tiptap/react';

import { Link as LinkIcon } from 'natural/icons';
import { Button, Icon, Input, Popover, Tooltip } from 'natural';

import styles from './LinkEditPopover.module.scss';

export type LinkEditPopoverProps = {
  editor: Editor;
  active: boolean;
};

// Same normaliser as the modal had: bare domains get https://, "user@host"
// becomes mailto: — matches what Notion/Linear do so users don't have to
// remember the prefix.
function normaliseHref(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.includes('@') && !trimmed.includes('/')) return `mailto:${trimmed}`;
  return `https://${trimmed}`;
}

const linkFormSchema = z.object({
  href: z
    .string()
    .trim()
    .min(1, 'URL is required')
    .max(2048, 'URL is too long')
    .refine(
      (v) => {
        try {
          new URL(normaliseHref(v));
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Enter a valid URL (e.g. https://example.com)' },
    ),
});
type FormValues = z.infer<typeof linkFormSchema>;

export function LinkEditPopover({ editor, active }: LinkEditPopoverProps) {
  const [open, setOpen] = useState(false);
  // Range captured at the moment the popover opens. Restoring it before
  // calling setLink avoids the "popover stole focus → selection collapsed"
  // class of bugs: the editor blurs the second the form input gains focus,
  // so by submit time the editor's live selection is empty.
  const [savedRange, setSavedRange] = useState<{ from: number; to: number } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    defaultValues: { href: '' },
    resolver: zodResolver(linkFormSchema),
    mode: 'onChange',
  });

  const handleOpenChange = (next: boolean) => {
    if (next) {
      const { from, to } = editor.state.selection;
      setSavedRange({ from, to });
      const prev = (editor.getAttributes('link').href as string | undefined) ?? '';
      reset({ href: prev });
    }
    setOpen(next);
  };

  const apply = handleSubmit(({ href }) => {
    if (!savedRange) return;
    editor
      .chain()
      .focus()
      .setTextSelection(savedRange)
      .extendMarkRange('link')
      .setLink({ href: normaliseHref(href) })
      .run();
    setOpen(false);
  });

  const remove = () => {
    if (!savedRange) return;
    editor.chain().focus().setTextSelection(savedRange).extendMarkRange('link').unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Popover.Trigger asChild>
            <Button
              iconOnly
              variant="ghost"
              size="sm"
              aria-label="Link"
              aria-pressed={active}
              data-active={active || undefined}
              className={styles.btn}
            >
              <Icon icon={LinkIcon} size={16} />
            </Button>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content>Link · ⌘K</Tooltip.Content>
      </Tooltip.Root>
      <Popover.Content align="start" sideOffset={6}>
        <form className={styles.content} onSubmit={apply}>
          <div className={styles.title}>{active ? 'Edit link' : 'Add link'}</div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="link-popover-url">
              URL
            </label>
            <Input
              id="link-popover-url"
              autoFocus
              type="url"
              size="sm"
              placeholder="https://example.com"
              error={Boolean(errors.href)}
              {...register('href')}
            />
            {errors.href ? <span className={styles.error}>{errors.href.message}</span> : null}
          </div>
          <div className={styles.footer}>
            {active ? (
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                Remove
              </Button>
            ) : null}
            <div className={styles.spacer} />
            <Popover.Close asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </Popover.Close>
            <Button type="submit" variant="solid" size="sm" disabled={!isValid}>
              {active ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </Popover.Content>
    </Popover.Root>
  );
}
