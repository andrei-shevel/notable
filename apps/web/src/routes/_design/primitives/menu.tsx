import { useState } from 'react';
import { MoreHorizontal, Share2, Star, Trash2, Tag as TagIcon } from 'lucide-react';
import { Button, Menu, Icon } from '@notable/ui';
import { PageHeader, SectionTitle } from '@/routes/_design/_layout';
import { Specimen } from '@/routes/_design/_specimen';

export function MenuPage() {
  const [pinned, setPinned] = useState(true);
  const [sort, setSort] = useState('updated');

  return (
    <>
      <PageHeader
        title="Menu"
        description="Dropdown menu used by the editor's 'more' button and tag picker. Inherits Radix's keyboard navigation and ARIA roles."
      />

      <SectionTitle>Basic</SectionTitle>
      <Specimen label="Action menu">
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button variant="ghost" iconOnly aria-label="More actions">
              <Icon icon={MoreHorizontal} />
            </Button>
          </Menu.Trigger>
          <Menu.Content align="start">
            <Menu.Item>
              <Icon icon={Share2} /> Share note
            </Menu.Item>
            <Menu.Item>
              <Icon icon={Star} /> Star
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item danger>
              <Icon icon={Trash2} /> Delete
            </Menu.Item>
          </Menu.Content>
        </Menu.Root>
      </Specimen>

      <SectionTitle>With label, checkbox, radio</SectionTitle>
      <Specimen label="Compound menu">
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button variant="outline">Options</Button>
          </Menu.Trigger>
          <Menu.Content align="start">
            <Menu.Label>View</Menu.Label>
            <Menu.CheckboxItem checked={pinned} onCheckedChange={setPinned}>
              Show pinned first
            </Menu.CheckboxItem>
            <Menu.Separator />
            <Menu.Label>Sort by</Menu.Label>
            <Menu.RadioGroup value={sort} onValueChange={setSort}>
              <Menu.RadioItem value="updated">Last updated</Menu.RadioItem>
              <Menu.RadioItem value="created">Date created</Menu.RadioItem>
              <Menu.RadioItem value="title">Title</Menu.RadioItem>
            </Menu.RadioGroup>
          </Menu.Content>
        </Menu.Root>
      </Specimen>

      <SectionTitle>Submenu</SectionTitle>
      <Specimen label="Nested">
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button variant="outline" leftIcon={<Icon icon={TagIcon} />}>
              Tags
            </Button>
          </Menu.Trigger>
          <Menu.Content align="start">
            <Menu.Item>Work</Menu.Item>
            <Menu.Item>Personal</Menu.Item>
            <Menu.Sub>
              <Menu.SubTrigger>More categories…</Menu.SubTrigger>
              <Menu.SubContent>
                <Menu.Item>Ideas</Menu.Item>
                <Menu.Item>Reading</Menu.Item>
                <Menu.Item>Planning</Menu.Item>
              </Menu.SubContent>
            </Menu.Sub>
          </Menu.Content>
        </Menu.Root>
      </Specimen>
    </>
  );
}
