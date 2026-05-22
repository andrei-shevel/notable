import { Avatar } from '@notable/ui';
import { PageHeader, SectionTitle } from '../_layout';
import { Specimen } from '../_specimen';

export function AvatarPage() {
  return (
    <>
      <PageHeader
        title="Avatar"
        description="Gradient circle with initials. Falls back to the provided image when src is set."
      />

      <SectionTitle>Sizes</SectionTitle>
      <Specimen label="size=sm">
        <Avatar name="Sam Shevchenko" size="sm" />
      </Specimen>
      <Specimen label="size=md (default)">
        <Avatar name="Sam Shevchenko" />
      </Specimen>
      <Specimen label="size=lg">
        <Avatar name="Sam Shevchenko" size="lg" />
      </Specimen>

      <SectionTitle>Initials</SectionTitle>
      <Specimen label="One- and two-word names">
        <Avatar name="Sam" />
        <Avatar name="Sam Shevchenko" />
        <Avatar name="Ada Lovelace" />
        <Avatar name="X" />
      </Specimen>
    </>
  );
}
