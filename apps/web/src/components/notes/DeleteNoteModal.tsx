import { useState } from 'react';

import { Button, Dialog } from '@notable/ui';

import styles from './DeleteNoteModal.module.scss';

export type DeleteNoteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trashed?: boolean;
  onConfirm: () => Promise<void>;
};

export function DeleteNoteModal({
  open,
  onOpenChange,
  title,
  trashed,
  onConfirm,
}: DeleteNoteModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <Dialog.Content size="sm">
        <Dialog.Title>{trashed ? 'Delete forever?' : 'Delete note?'}</Dialog.Title>
        <Dialog.Description>
          {trashed
            ? `“${title}” will be permanently deleted. This can't be undone.`
            : `“${title}” will be moved to Recently deleted. You can restore it from there.`}
        </Dialog.Description>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.footer}>
          <Dialog.Close asChild>
            <Button variant="ghost" disabled={busy}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button variant="danger" loading={busy} onClick={handleConfirm}>
            {trashed ? 'Delete forever' : 'Delete'}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
