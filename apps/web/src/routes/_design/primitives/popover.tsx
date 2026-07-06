import { Calendar } from 'natural/icons';
import { Button, Input, Popover, Icon } from 'natural';
import { PageHeader, SectionTitle } from '@/routes/_design/_layout';
import { Specimen } from '@/routes/_design/_specimen';

export function PopoverPage() {
  return (
    <>
      <PageHeader
        title="Popover"
        description="Anchored floating panel. Used for inline editors (tag picker, date picker, link insert)."
      />

      <SectionTitle>Basic</SectionTitle>
      <Specimen label="Simple popover">
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button variant="outline" leftIcon={<Icon icon={Calendar} />}>
              Set due date
            </Button>
          </Popover.Trigger>
          <Popover.Content withArrow>
            <div style={{ minWidth: '240px' }}>
              <p
                style={{
                  margin: '0 0 var(--space-2)',
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                Pick a date
              </p>
              <Input type="date" />
            </div>
          </Popover.Content>
        </Popover.Root>
      </Specimen>

      <SectionTitle>Side variants</SectionTitle>
      <Specimen label="side prop">
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <Popover.Root key={side}>
            <Popover.Trigger asChild>
              <Button variant="ghost" size="sm">
                {side}
              </Button>
            </Popover.Trigger>
            <Popover.Content side={side} withArrow>
              <span style={{ fontSize: 'var(--font-size-sm)' }}>Anchored {side}</span>
            </Popover.Content>
          </Popover.Root>
        ))}
      </Specimen>
    </>
  );
}
