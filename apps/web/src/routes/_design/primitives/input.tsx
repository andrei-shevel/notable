import { useState } from 'react';
import { Search, Mail } from 'lucide-react';
import { Input, Icon } from '@notable/ui';
import { PageHeader, SectionTitle } from '../_layout';
import { Specimen } from '../_specimen';

export function InputPage() {
  const [value, setValue] = useState('');

  return (
    <>
      <PageHeader
        title="Input"
        description="Default and inline variants, with optional icons and error state. Pass as='textarea' to switch to a multiline control."
      />

      <SectionTitle>Variants</SectionTitle>
      <Specimen label="default">
        <Input placeholder="Email" />
      </Specimen>
      <Specimen label="inline (search-bar look)">
        <Input variant="inline" placeholder="Search notes…" leftIcon={<Icon icon={Search} />} />
      </Specimen>

      <SectionTitle>Sizes</SectionTitle>
      <Specimen label="size=sm">
        <Input size="sm" placeholder="Small" />
      </Specimen>
      <Specimen label="size=md (default)">
        <Input size="md" placeholder="Medium" />
      </Specimen>

      <SectionTitle>With icons</SectionTitle>
      <Specimen label="leftIcon">
        <Input placeholder="you@example.com" leftIcon={<Icon icon={Mail} />} />
      </Specimen>

      <SectionTitle>States</SectionTitle>
      <Specimen label="disabled">
        <Input placeholder="Disabled" disabled />
      </Specimen>
      <Specimen label="error">
        <Input placeholder="Required" error defaultValue="not-an-email" />
      </Specimen>
      <Specimen label="controlled">
        <Input placeholder="Type here" value={value} onChange={(e) => setValue(e.target.value)} />
      </Specimen>

      <SectionTitle>Textarea</SectionTitle>
      <Specimen label="as=textarea" vertical>
        <Input as="textarea" placeholder="Note body…" rows={4} />
      </Specimen>
    </>
  );
}
