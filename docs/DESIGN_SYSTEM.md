# Notable — Design System Plan (supplement to `docs/PLAN.md`)

## Context

`docs/PLAN.md` treats styling as inline work inside `apps/web`: one `tokens.scss`, a flat list of app-specific components (Brand, NoteCard, etc.), and a throwaway `/_kitchen-sink` route. The visual spec in `docs/DESIGN.md` and the working prototype in `docs/index.html` are detailed and consistent, but the React app at `apps/web/src/` is still a skeleton — nothing has been ported yet.

This plan promotes the styling layer into a real, reusable design system before the rest of `PLAN.md` proceeds. The motivation:

- **Reuse beyond the notes app** — a landing page (`docs/landing.html` already exists), a future admin/marketing surface, or backend-rendered emails will want the same tokens and primitives.
- **A11y + behavior consistency** — modals, menus, tooltips, and focus rings get implemented once, correctly, instead of per-component.
- **Browsable surface** — a `/_design` route lets the design system be visually audited end-to-end, in both themes, instead of trusting that every component honors the tokens.
- **Cleaner token model** — a primitive/semantic split makes dark mode + future themes a single-file change and gives components access to the full palette (not just the 27 currently-aliased semantics).

The output of this plan replaces **step 2** of `docs/PLAN.md` ("Common components + design tokens"). Steps 1, 3+ from that plan continue unchanged afterward.

## Decisions (locked in via clarification)

- **Scope:** new workspace package `@notable/ui` at `packages/ui/`.
- **Tokens:** two layers — primitives → semantics. Dark mode reassigns the semantic layer only.
- **Primitives included:** Button, Input/Textarea, Dialog, Menu, Popover, Tooltip.
- **Showcase:** in-app `/_design` route inside `apps/web`, dev-only via `import.meta.env.DEV` + lazy import, so it tree-shakes out of prod.
- **Headless behavior lib:** Radix UI (`@radix-ui/react-*`) for Dialog/Menu/Popover/Tooltip. Best-in-class a11y, unstyled, used by shadcn/ui — well-known territory.
- **Icons:** `lucide-react`. `docs/DESIGN.md` already specifies "Lucide-style 16px SVG icons" — using the real package removes registry maintenance and is tree-shakeable.

## Package layout

```
packages/ui/
├── package.json                   # @notable/ui, type: module, exports map
├── tsconfig.json
├── src/
│   ├── index.ts                   # barrel: primitives + building blocks + Icon
│   ├── tokens/
│   │   ├── index.scss             # @forward primitives + semantics
│   │   ├── primitives.scss        # color ramps, space, type, radius, shadow, motion, z
│   │   ├── semantics.scss         # :root + dark-mode override; aliases to primitives
│   │   └── reset.scss             # box-sizing, body font, reduced-motion guard
│   ├── mixins/
│   │   └── _index.scss            # focus-ring, truncate, line-clamp, sr-only
│   ├── primitives/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.scss
│   │   │   └── index.ts
│   │   ├── Input/{Input.tsx, Input.module.scss, index.ts}
│   │   ├── Dialog/{Dialog.tsx, Dialog.module.scss, index.ts}
│   │   ├── Menu/{Menu.tsx, Menu.module.scss, index.ts}
│   │   ├── Popover/{Popover.tsx, Popover.module.scss, index.ts}
│   │   └── Tooltip/{Tooltip.tsx, Tooltip.module.scss, index.ts}
│   └── blocks/                    # reusable, non-primitive UI
│       ├── Icon/                  # <Icon name="star" size={16}/> wrapping lucide-react
│       ├── Tag/                   # 4-color pill from DESIGN.md §5.1
│       ├── Avatar/                # gradient initials circle
│       ├── Kbd/                   # ⌘K hint pills
│       └── Spinner/               # for loading states (used by Button loading mode)
```

App-specific composites stay in `apps/web/src/components/` and import from `@notable/ui`:
- `Brand`, `NavItem`, `NoteCard`, `SavedPill`, `Crumbs`, `Sidebar`, `NoteList`, `EditorToolbar`.
- `SearchInput` becomes a thin wrapper around `<Input leftIcon={<Icon name="search"/>}>`.
- `IconButton` is deleted — replaced by `<Button variant="ghost" size="sm" iconOnly>`.

`packages/ui/package.json` exports source TS/SCSS directly — no build step. Vite in `apps/web` handles compilation through workspace symlinks:

```json
{
  "name": "@notable/ui",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./tokens": "./src/tokens/index.scss",
    "./tokens/*": "./src/tokens/*.scss",
    "./mixins": "./src/mixins/_index.scss"
  },
  "peerDependencies": { "react": "^19", "react-dom": "^19" },
  "dependencies": {
    "@radix-ui/react-dialog": "^1",
    "@radix-ui/react-dropdown-menu": "^2",
    "@radix-ui/react-popover": "^1",
    "@radix-ui/react-tooltip": "^1",
    "@radix-ui/react-slot": "^1",
    "lucide-react": "^0"
  }
}
```

`apps/web` adds `"@notable/ui": "workspace:*"` and imports `@use '@notable/ui/tokens'` once from `apps/web/src/styles/global.scss`.

## Token architecture

### Layer 1 — primitives (`packages/ui/src/tokens/primitives.scss`)

Raw, theme-agnostic values. Never referenced by components directly.

- **Color ramps** (Tailwind-derived, since `docs/DESIGN.md` colors line up with stone/amber/red/blue/emerald/pink/violet):
  - `--color-stone-50..950` (neutrals — covers all bg/surface/border/text values in DESIGN.md)
  - `--color-amber-50..950` (accent ramp)
  - `--color-red-50..950` (danger ramp)
  - `--color-blue-500`, `--color-emerald-500`, `--color-pink-500`, `--color-violet-500` (tag dots — single-value, no full ramp needed)
- **Space scale** (4px base): `--space-0: 0; --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-14: 56px; --space-16: 64px; --space-20: 80px; --space-30: 120px`
- **Font size scale**: `--font-size-xs: 11px; --sm: 12px; --base: 13px; --md: 14px; --lg: 15px; --xl: 16px; --2xl: 18px; --3xl: 22px; --4xl: 28px; --5xl: 36px`
- **Font weights**: `--font-weight-regular: 400; --medium: 500; --semibold: 600; --bold: 700`
- **Line heights**: `--line-height-tight: 1.15; --snug: 1.3; --normal: 1.5; --relaxed: 1.6; --loose: 1.75`
- **Letter spacing**: `--tracking-tight: -0.02em; --tighter: -0.01em; --normal: 0; --wide: 0.06em`
- **Radius**: `--radius-none: 0; --sm: 6px; --md: 8px; --lg: 12px; --full: 999px`
- **Shadows**: `--shadow-sm: 0 1px 2px rgba(0,0,0,0.04); --md: 0 4px 12px rgba(0,0,0,0.06); --lg: 0 12px 32px rgba(0,0,0,0.08)`
- **Motion**: `--duration-fast: 80ms; --base: 120ms; --slow: 200ms; --easing-standard: cubic-bezier(0.2, 0, 0, 1); --easing-emphasis: cubic-bezier(0.3, 0, 0, 1)`
- **Z-index**: `--z-base: 0; --z-dropdown: 100; --z-modal: 200; --z-tooltip: 300`

### Layer 2 — semantics (`packages/ui/src/tokens/semantics.scss`)

Aliases primitives to roles. Components only reference these.

```scss
:root {
  // Surfaces
  --bg:             var(--color-stone-50);   // #fafaf9
  --surface:        #ffffff;
  --surface-2:      var(--color-stone-100);  // #f5f5f4
  --border:         var(--color-stone-200);  // #e7e5e4
  --border-strong:  var(--color-stone-300);  // #d6d3d1

  // Text
  --text:           var(--color-stone-900);  // #1c1917
  --text-muted:     var(--color-stone-500);  // #78716c
  --text-faint:     var(--color-stone-400);  // #a8a29e

  // Accent / status
  --accent:         var(--color-amber-500);  // #f59e0b
  --accent-soft:    var(--color-amber-100);  // #fef3c7
  --accent-strong:  var(--color-amber-600);  // hover/pressed solid buttons
  --danger:         var(--color-red-600);    // #dc2626
  --danger-soft:    var(--color-red-100);

  // Tag dot palette
  --tag-blue:   var(--color-blue-500);
  --tag-green:  var(--color-emerald-500);
  --tag-pink:   var(--color-pink-500);
  --tag-violet: var(--color-violet-500);

  // Semantic typography (used by component .module.scss directly)
  --text-display-size:    var(--font-size-5xl);
  --text-display-weight:  var(--font-weight-bold);
  --text-display-leading: var(--line-height-tight);
  --text-display-tracking: var(--tracking-tight);
  // ... section (3xl/600), subsection (xl/600), body (lg/relaxed),
  //     list-title (md/600), nav (md/500), tag (xs/500),
  //     section-head (xs/600 caps + wide), code (base/regular mono), meta (xs/400)
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg:            #0c0a09;
    --surface:       var(--color-stone-900);  // #1c1917
    --surface-2:     var(--color-stone-800);
    --border:        var(--color-stone-700);
    --border-strong: var(--color-stone-600);
    --text:          var(--color-stone-50);
    --text-muted:    var(--color-stone-400);
    --text-faint:    var(--color-stone-500);
    --accent:        var(--color-amber-400);  // brighter for contrast
    --accent-soft:   var(--color-amber-950);  // #422006-ish
    --accent-strong: var(--color-amber-300);
    --danger:        var(--color-red-400);
  }
}
```

A `[data-theme="dark"]` selector mirrors the media query so the showcase can force a theme for side-by-side comparison; the App itself follows the OS by default in v1.

### Reduced motion

`reset.scss` ends with:
```scss
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0ms !important; animation-duration: 0ms !important; }
}
```

## Primitive components

Each ships as `Foo.tsx` + `Foo.module.scss` + barrel `index.ts`. All forward refs; all variants typed via TypeScript discriminated unions (no need for CVA at this scale).

### Button (`primitives/Button/`)

- **Variants:** `solid` (accent bg, white fg), `ghost` (transparent → surface-2 hover), `outline` (border + transparent).
- **Sizes:** `sm` (28px h), `md` (32px h, default).
- **iconOnly:** boolean — forces square 30×30 (matches the prototype's existing icon-button dimensions in `docs/index.html`).
- **States:** default / hover / active / `:focus-visible` (3px `--accent-soft` ring) / `:disabled` / `loading` (renders `<Spinner>` in place of leftIcon, locks width).
- **leftIcon / rightIcon:** React node slots, sized 16px.
- **asChild:** uses `@radix-ui/react-slot` for polymorphism (e.g., render a Button as `<a>` for links without losing styles).
- All transitions: `var(--duration-base) var(--easing-standard)` on `background-color`, `color`, `border-color`, `box-shadow`.

### Input (`primitives/Input/`)

- One component accepts `as="input" | "textarea"` (default `input`).
- **Variants:** `default` (1px `--border`, `--surface` bg), `inline` (no border, `--surface-2` bg — current search-bar look).
- **Sizes:** `sm`, `md`.
- **leftIcon / rightIcon:** slots; padding shifts accordingly.
- **error:** boolean — swaps border to `--danger`, ring to `--danger-soft`.
- **Focus:** 3px `--accent-soft` (or `--danger-soft` when `error`) ring via `:focus-visible`, default outline suppressed.
- Forwarded ref points at the native element so React Hook Form etc. work.

### Dialog (`primitives/Dialog/`)

Wraps `@radix-ui/react-dialog`. Re-exports as `Dialog.Root`, `Dialog.Trigger`, `Dialog.Content`, `Dialog.Title`, `Dialog.Description`, `Dialog.Close` for shadcn-style ergonomics.

- **Content size prop:** `sm` (320px), `md` (480px, default), `lg` (640px), `full` (90vw).
- Backdrop: `rgba(12, 10, 9, 0.4)` + 4px backdrop-blur.
- Animation: `data-state="open|closed"` drives fade + 4px Y translate, durations from motion tokens.
- Inherits Radix's focus trap, Escape close, scroll lock, focus return.

### Menu (`primitives/Menu/`)

Wraps `@radix-ui/react-dropdown-menu`. Used by the editor toolbar "more" menu and the tag picker.

- Re-exports: `Root`, `Trigger`, `Content`, `Item`, `CheckboxItem`, `RadioItem`, `Separator`, `Label`, `Sub`, `SubTrigger`, `SubContent`.
- Content styled: `--surface`, `--shadow-md`, `--radius` 8px, 4px padding, items 7×12 padding, `--surface-2` hover.
- Keyboard nav and ARIA roles inherited from Radix.

### Popover (`primitives/Popover/`)

Wraps `@radix-ui/react-popover`. Generic anchored panel — TagPicker's create UI, future date pickers, etc.

- Re-exports: `Root`, `Trigger`, `Content`, `Anchor`, `Close`.
- Content size + side/align passthrough; styling matches Menu (same surface and shadow).

### Tooltip (`primitives/Tooltip/`)

Wraps `@radix-ui/react-tooltip`. A `Tooltip.Provider` is mounted once in `apps/web/src/main.tsx` so individual triggers don't need their own.

- Re-exports: `Root`, `Trigger`, `Content`.
- Single style: `--text` bg + `--surface` text (inverted), 11px, `--radius-sm`, 4×8 padding, arrow via Radix's `<Arrow>`.
- Default `delayDuration={400}`.

## Building blocks (in `@notable/ui/blocks`)

Non-primitive but cross-surface useful.

- **Icon** — `<Icon name="star" size={16}/>`. Internally `name` is a typed union built from `keyof typeof import('lucide-react')`. Wrapping centralizes default `strokeWidth=2`, `color="currentColor"`, and lets us swap libs later.
- **Tag** — props: `label`, `color` (one of `blue|green|pink|violet|neutral`), `size` (`sm|md`). The dot is `8px` with `background: var(--tag-{color})`. From DESIGN.md §5.1.
- **Avatar** — props: `name`, `size`, optional `src`. Gradient initials circle (amber-400 → amber-600). 28px default.
- **Kbd** — props: `keys: string[]`. Renders `⌘` `K` boxes with a faint border. Used by `⌘K` hint in SearchInput.
- **Spinner** — 12px / 16px / 20px, CSS-only border-rotate animation; used by Button loading state.

## Showcase route (`apps/web/src/routes/_design/`)

Mounted only when `import.meta.env.DEV` (lazy import + condition in router). Index page links to:

- **Tokens** — `/colors`, `/typography`, `/spacing`, `/radius`, `/shadows`, `/motion`. Color page shows both light and dark side-by-side (the dark column wraps in a `<div data-theme="dark">` so the semantic override fires regardless of OS).
- **Primitives** — `/button` (all variants × sizes × states × iconOnly), `/input`, `/dialog` (each size triggered by a button), `/menu`, `/popover`, `/tooltip`.
- **Blocks** — `/icon` (full lucide grid, searchable input), `/tag`, `/avatar`, `/kbd`.
- **Composites** (added later as `apps/web` builds them) — `/note-card`, `/nav-item`, `/sidebar`, `/saved-pill`.

Each page lives in `apps/web/src/routes/_design/<name>.tsx` and renders specimens with a small `<Specimen label="...">` helper that reads from a shared `apps/web/src/routes/_design/_specimen.tsx`. The whole `_design/` directory is dynamically imported via `React.lazy` from `App.tsx`, so production builds chunk it separately and it's never reached from the gated router (the route is simply not registered when `!import.meta.env.DEV`).

## Critical files

To read before/while implementing:

- `/Users/shevvy/Projects/notes/docs/index.html` — pixel reference; the prototype is the visual contract for every component.
- `/Users/shevvy/Projects/notes/docs/DESIGN.md` — token values, type scale, component anatomy.
- `/Users/shevvy/Projects/notes/docs/PLAN.md:151-220` — frontend section; the design-system plan slots in at its step 2.
- `/Users/shevvy/Projects/notes/pnpm-workspace.yaml` — `packages/*` glob is already in place.
- `/Users/shevvy/Projects/notes/apps/web/package.json` — Sass + Vite + React 19 already installed.
- `/Users/shevvy/Projects/notes/apps/web/src/App.tsx` — current placeholder; will be replaced by the router + design-route gate.

## Implementation steps

This entire plan replaces step 2 of `docs/PLAN.md`. Step 1 (scaffold the empty skeleton) is already done.

1. **Workspace plumbing.** `pnpm init` inside `packages/ui/`. Write `packages/ui/package.json` with the `exports` map above and Radix + lucide deps. Add `"@notable/ui": "workspace:*"` to `apps/web/package.json`. Run `pnpm install`. Verify symlink: `ls apps/web/node_modules/@notable/ui` points into `packages/ui/`.
2. **Token primitives.** Write `packages/ui/src/tokens/primitives.scss` with the full color ramps + space + type + radius + shadow + motion + z scales described above. Write `tokens/reset.scss` (box-sizing, body font, reduced-motion guard).
3. **Token semantics.** Write `tokens/semantics.scss` — the light `:root` block, the `@media (prefers-color-scheme: dark)` block, the `[data-theme="dark"]` mirror, the semantic typography tokens. Write `tokens/index.scss` that `@forward`s all three.
4. **Sass mixins.** Write `mixins/_index.scss` with `focus-ring`, `truncate`, `line-clamp($n)`, `sr-only`. These mirror snippets that appear repeatedly in `docs/index.html`.
5. **Wire tokens into apps/web.** Create `apps/web/src/styles/global.scss` with `@use '@notable/ui/tokens';` and import it once from `main.tsx`. Replace the placeholder `App.tsx` body color/bg to use `var(--bg)` / `var(--text)` and visually verify both themes by toggling OS appearance.
6. **Icon block.** Install `lucide-react`. Write `blocks/Icon/Icon.tsx` — typed `name` prop, default 16px / `currentColor`. Export from `@notable/ui`.
7. **Button primitive.** Implement `primitives/Button/` with all variants, sizes, states, iconOnly, asChild via `@radix-ui/react-slot`, loading via `<Spinner>`.
8. **Spinner + Kbd + Tag + Avatar blocks.** Spinner needed by Button (do it before/with Button); the rest can follow.
9. **Input primitive.** Implement `primitives/Input/` with `as="input" | "textarea"`, `default`/`inline` variants, leftIcon/rightIcon, error state.
10. **Floating primitives.** Install `@radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-tooltip @radix-ui/react-slot`. Wrap each, port the shared surface/shadow/radius styles into each `.module.scss`, expose the namespaced API (`Dialog.Root`, `Dialog.Content`, etc.).
11. **Showcase scaffolding.** Add `wouter` (this anticipates `PLAN.md` step 9 but is needed for the design route). In `apps/web/src/App.tsx`, gate `import.meta.env.DEV` to register a `/_design/*` lazy route. Write `routes/_design/index.tsx` with a link list and `_specimen.tsx` helper.
12. **Showcase pages — tokens.** Write `colors.tsx` (renders every ramp swatch + semantic mapping, light + dark side-by-side), `typography.tsx`, `spacing.tsx`, `radius.tsx`, `shadows.tsx`, `motion.tsx`.
13. **Showcase pages — primitives + blocks.** One page per component, enumerating variants × sizes × states. Include the Icon page with a search box over `lucide-react`'s export names.
14. **Hand off to `docs/PLAN.md` step 3.** From here, the workspace page can be assembled using `<Button>`, `<Input>`, `<Tag>`, etc. App-specific composites (Brand, NavItem, NoteCard, Sidebar, NoteList, EditorToolbar, SavedPill, Crumbs) are built in `apps/web/src/components/` and get specimen pages added to `/_design/composites/*` as they land.

## Verification

End-to-end smoke test once steps 1–13 are done:

- `pnpm install` at the repo root → no errors; `apps/web/node_modules/@notable/ui` is a symlink into `packages/ui/`.
- `pnpm --filter @notable/web dev` boots; visit `http://localhost:5173/_design`.
- **Tokens > Colors:** every ramp renders; semantic mapping table on the left (light) matches the right column (forced `data-theme="dark"`) with no missing values.
- **Typography:** all sizes render in the correct font + weight; mono samples use JetBrains Mono.
- **Primitives:**
  - Tab through the Button page — every variant shows the 3px amber focus ring on `:focus-visible`, none on mouse click.
  - Dialog page — Escape closes; clicking the backdrop closes; focus returns to the trigger; tab is trapped inside.
  - Menu / Popover — arrow keys navigate; Escape closes; clicking outside closes.
  - Tooltip — appears on hover and on keyboard focus (Radix default).
- **Theme:** toggle macOS appearance in System Settings → entire `/_design` route swaps without a reload; no surface keeps a stale color.
- **Reduced motion:** enable "Reduce Motion" in macOS Accessibility → Dialog open is instant; no transitions linger.
- **Production tree-shake:** `pnpm --filter @notable/web build` → confirm `/_design/*` chunks do not appear in `dist/assets/` (only the gated import path is reachable in prod).
- **Visual parity gate:** open `docs/index.html` and the React app side-by-side at 1440px. Sidebar widths, list card paddings, editor toolbar height, focus rings, scrollbar thumb — match within 1px. Discrepancies here mean a primitive missed a token; fix before moving to `PLAN.md` step 3.

## Explicitly out of scope (revisit later if needed)

- **CVA / tailwind-variants** — variant management. The 6 primitives' variant counts are small enough that typed unions + Sass classes are clearer; revisit if a primitive grows past ~4 variants × ~3 sizes.
- **Visual regression tests** (Chromatic, Playwright snapshots). Worth doing once the design system has external consumers; for v1, the showcase + manual audit is sufficient.
- **MDX docs** alongside each component. The showcase is enough for one engineer; add prose later if the team grows.
- **Token export to JSON / Style Dictionary** for Figma round-tripping. Add only when a designer actually wants it.
- **RTL layout** support, internationalized type metrics. Out of scope for an English-first product.
