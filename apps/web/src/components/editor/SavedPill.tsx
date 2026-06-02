import { CheckCircle2 } from '@notable/ui/icons';
import { Button, Icon, Spinner, Tooltip } from '@notable/ui';

export type SavedPillProps = {
  label?: string;
  isSaving?: boolean;
};

export function SavedPill({ label = 'Saved 2m ago', isSaving = false }: SavedPillProps) {
  const tooltip = isSaving ? 'Saving…' : label;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button iconOnly variant="ghost" aria-label={tooltip}>
          {isSaving ? <Spinner size={16} label="Saving" /> : <Icon icon={CheckCircle2} />}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip.Root>
  );
}
