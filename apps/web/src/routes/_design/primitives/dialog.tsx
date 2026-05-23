import { Button, Dialog } from '@notable/ui';
import { PageHeader, SectionTitle } from '../_layout';
import { Specimen } from '../_specimen';
import type { DialogSize } from '@notable/ui';

const SIZES: DialogSize[] = ['sm', 'md', 'lg', 'full'];

function Demo({ size }: { size: DialogSize }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="outline">Open {size}</Button>
      </Dialog.Trigger>
      <Dialog.Content size={size}>
        <Dialog.Title>Delete this note?</Dialog.Title>
        <Dialog.Description>
          This will move the note to Trash. You can restore it later, or empty Trash to remove it
          permanently.
        </Dialog.Description>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-4)',
          }}
        >
          <Dialog.Close asChild>
            <Button variant="ghost">Cancel</Button>
          </Dialog.Close>
          <Dialog.Close asChild>
            <Button variant="danger">Move to Trash</Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function DialogPage() {
  return (
    <>
      <PageHeader
        title="Dialog"
        description="Radix-powered modal with focus trap, scroll lock, and Escape to close. Backdrop blurs and click-outside dismisses."
      />

      <SectionTitle>Sizes</SectionTitle>
      {SIZES.map((s) => (
        <Specimen key={s} label={`size=${s}`}>
          <Demo size={s} />
        </Specimen>
      ))}
    </>
  );
}
