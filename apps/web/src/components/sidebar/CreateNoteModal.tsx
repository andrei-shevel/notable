import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button, Dialog, Input } from '@notable/ui';

import { useCreateNote } from '@/hooks/services/useCreateNote';

import styles from './CreateNoteModal.module.scss';

export type CreateNoteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const createNoteFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(500, 'Title is too long'),
});

type FormValues = z.infer<typeof createNoteFormSchema>;

const DEFAULT_VALUES: FormValues = { title: '' };

export function CreateNoteModal({ open, onOpenChange }: CreateNoteModalProps) {
  const createNote = useCreateNote();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(createNoteFormSchema),
    mode: 'onChange',
  });

  const onSubmit = handleSubmit(async ({ title }) => {
    try {
      await createNote({ title });
      onOpenChange(false);
    } catch (err) {
      setError('root', { message: (err as Error).message });
    }
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="md">
        <Dialog.Title>New note</Dialog.Title>
        <Dialog.Description>
          Give it a working title. You can add details after it's created.
        </Dialog.Description>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="create-note-title">
              Title
            </label>
            <Input
              id="create-note-title"
              autoFocus
              placeholder="e.g. Q4 product roadmap"
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
              Create note
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
