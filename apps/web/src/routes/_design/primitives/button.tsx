import { Plus, Star, Trash2 } from '@notable/ui/icons';
import { Button, Icon } from '@notable/ui';
import { PageHeader, SectionTitle } from '@/routes/_design/_layout';
import { Specimen } from '@/routes/_design/_specimen';

export function ButtonPage() {
  return (
    <>
      <PageHeader
        title="Button"
        description="Variants × sizes × states. Use Button for every clickable action — IconButton is a Button with iconOnly."
      />

      <SectionTitle>Variants</SectionTitle>
      <Specimen label="solid">
        <Button variant="solid">Save changes</Button>
      </Specimen>
      <Specimen label="ghost">
        <Button variant="ghost">Cancel</Button>
      </Specimen>
      <Specimen label="outline">
        <Button variant="outline">Discard</Button>
      </Specimen>
      <Specimen label="danger">
        <Button variant="danger">Delete forever</Button>
      </Specimen>

      <SectionTitle>Sizes</SectionTitle>
      <Specimen label="size=sm">
        <Button size="sm">Small</Button>
        <Button size="sm" variant="ghost">
          Small ghost
        </Button>
      </Specimen>
      <Specimen label="size=md (default)">
        <Button size="md">Medium</Button>
        <Button size="md" variant="ghost">
          Medium ghost
        </Button>
      </Specimen>

      <SectionTitle>With icons</SectionTitle>
      <Specimen label="leftIcon">
        <Button leftIcon={<Icon icon={Plus} />}>New note</Button>
        <Button variant="ghost" leftIcon={<Icon icon={Star} />}>
          Star
        </Button>
      </Specimen>
      <Specimen label="rightIcon">
        <Button rightIcon={<Icon icon={Plus} />}>Add tag</Button>
      </Specimen>
      <Specimen label="iconOnly">
        <Button iconOnly variant="ghost" aria-label="Star note">
          <Icon icon={Star} />
        </Button>
        <Button iconOnly variant="outline" aria-label="Delete">
          <Icon icon={Trash2} />
        </Button>
        <Button iconOnly variant="solid" aria-label="New">
          <Icon icon={Plus} />
        </Button>
      </Specimen>

      <SectionTitle>States</SectionTitle>
      <Specimen label="disabled">
        <Button disabled>Disabled</Button>
        <Button variant="ghost" disabled>
          Disabled ghost
        </Button>
      </Specimen>
      <Specimen label="loading">
        <Button loading>Saving…</Button>
        <Button variant="outline" loading leftIcon={<Icon icon={Plus} />}>
          New note
        </Button>
      </Specimen>

      <SectionTitle>asChild (polymorphism)</SectionTitle>
      <Specimen label="render as <a>" code='asChild + <a href="…">'>
        <Button asChild variant="outline">
          <a href="https://github.com" target="_blank" rel="noreferrer">
            Visit link
          </a>
        </Button>
      </Specimen>
    </>
  );
}
