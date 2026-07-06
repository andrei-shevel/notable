import { useState } from 'react';

import { Button, Dialog } from 'natural';

import styles from './ConfirmModal.module.scss';

export type ConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmButton: string;
  onConfirm: () => Promise<void>;
};

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmButton,
  onConfirm,
}: ConfirmModalProps) {
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
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>{description}</Dialog.Description>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.footer}>
          <Dialog.Close asChild>
            <Button variant="ghost" disabled={busy}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button variant="danger" loading={busy} onClick={handleConfirm}>
            {confirmButton}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
