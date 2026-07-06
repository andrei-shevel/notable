import { Star, Trash2, Share2, Plus } from 'natural/icons';
import { Button, Tooltip, Icon } from 'natural';
import { PageHeader, SectionTitle } from '@/routes/_design/_layout';
import { Specimen } from '@/routes/_design/_specimen';

export function TooltipPage() {
  return (
    <>
      <PageHeader
        title="Tooltip"
        description="Short hint on hover/focus. Provider mounted once in App; individual triggers don't need their own."
      />

      <SectionTitle>Icon buttons</SectionTitle>
      <Specimen label="Hover or tab onto each button">
        {[
          { icon: Star, label: 'Star' },
          { icon: Share2, label: 'Share' },
          { icon: Plus, label: 'New note' },
          { icon: Trash2, label: 'Delete' },
        ].map(({ icon, label }) => (
          <Tooltip.Root key={label}>
            <Tooltip.Trigger asChild>
              <Button iconOnly variant="ghost" aria-label={label}>
                <Icon icon={icon} />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{label}</Tooltip.Content>
          </Tooltip.Root>
        ))}
      </Specimen>

      <SectionTitle>Sides</SectionTitle>
      <Specimen label="side prop">
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <Tooltip.Root key={side}>
            <Tooltip.Trigger asChild>
              <Button variant="outline" size="sm">
                {side}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content side={side}>tip on {side}</Tooltip.Content>
          </Tooltip.Root>
        ))}
      </Specimen>
    </>
  );
}
