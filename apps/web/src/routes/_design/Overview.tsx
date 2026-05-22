import { PageHeader } from './_layout';

export function Overview() {
  return (
    <>
      <PageHeader
        title="Design system"
        description="A reference for Notable's tokens, primitives, and shared blocks. Everything renderable here is what apps/web — and any future surface — composes from."
      />
      <p
        style={{
          color: 'var(--text-muted)',
          maxWidth: '640px',
          lineHeight: 'var(--line-height-relaxed)',
        }}
      >
        Pick a section from the sidebar. The Tokens pages render both light and
        dark themes side by side. The Primitives and Blocks pages enumerate
        every variant, size, and state.
      </p>
    </>
  );
}
