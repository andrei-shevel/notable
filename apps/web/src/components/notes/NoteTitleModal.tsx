import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button, Dialog, Input } from '@notable/ui';

import styles from './NoteTitleModal.module.scss';

export type NoteTitleModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogTitle: string;
  dialogDescription?: string;
  submitLabel: string;
  placeholder?: string;
  initialTitle?: string;
  onSubmit: (title: string) => Promise<void>;
};

const titleFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(500, 'Title is too long'),
});
type FormValues = z.infer<typeof titleFormSchema>;

export function NoteTitleModal({
  open,
  onOpenChange,
  dialogTitle,
  dialogDescription,
  submitLabel,
  placeholder = 'e.g. Q4 product roadmap',
  initialTitle = '',
  onSubmit,
}: NoteTitleModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { title: initialTitle },
    resolver: zodResolver(titleFormSchema),
    mode: 'onChange',
  });

  // Re-seed the form each time the modal opens so the field reflects the
  // current note's title (rename flow) or resets to blank (create flow).
  useEffect(() => {
    if (open) reset({ title: initialTitle });
  }, [open, initialTitle, reset]);

  const submit = handleSubmit(async ({ title }) => {
    try {
      await onSubmit(title);
      onOpenChange(false);
    } catch (err) {
      setError('root', { message: (err as Error).message });
    }
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="md">
        <Dialog.Title>{dialogTitle}</Dialog.Title>
        {dialogDescription ? <Dialog.Description>{dialogDescription}</Dialog.Description> : null}

        <form className={styles.form} onSubmit={submit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="note-title-modal-input">
              Title
            </label>
            <Input
              id="note-title-modal-input"
              autoFocus
              placeholder={placeholder}
              error={Boolean(errors.title)}
              disabled={isSubmitting}
              {...register('title')}
            />
            {errors.title ? <span className={styles.error}>{errors.title.message}</span> : null}
          </div>

          {errors.root ? <div className={styles.error}>{errors.root.message}</div> : null}

          <div className={styles.footer}>
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={isSubmitting}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" variant="solid" disabled={!isValid} loading={isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
