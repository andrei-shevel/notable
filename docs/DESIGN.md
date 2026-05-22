# Notable — Design Specification

A professional notes web app prototype. This document captures the visual language, layout, and component decisions made in `index.html` so they can be referenced, reviewed, or ported to a framework (React, Vue, etc.).

---

## 1. Product framing

- **Name:** Notable
- **Mark:** rounded-square "N" with amber-to-orange gradient
- **Voice:** calm, focused, professional. No emoji in UI. Sample content reads like real notes, not lorem ipsum.
- **Audience:** knowledge workers who want a fast, keyboard-friendly notes tool with a single-column reading experience.

---

## 2. Layout

Three-pane grid, fixed left-to-right:

| Pane    | Width  | Role                                              |
| ------- | ------ | ------------------------------------------------- |
| Sidebar | 240px  | Brand, navigation, tags, user                     |
| List    | 320px  | Search + scrollable note cards                    |
| Editor  | 1fr    | Toolbar + centered reading column (max 720px)     |

CSS: `grid-template-columns: 240px 320px 1fr;` on `.app`, full viewport height, `overflow: hidden` on body.

### Responsive breakpoints

- **≤ 960px** — sidebar hides, list + editor remain.
- **≤ 720px** — list hides, editor only. (In a real build, navigation between panes becomes a stack with back buttons.)

---

## 3. Design tokens

All tokens are declared as CSS custom properties on `:root`, with a dark variant gated on `prefers-color-scheme: dark`.

### Color — light

| Token              | Value     | Use                                  |
| ------------------ | --------- | ------------------------------------ |
| `--bg`             | `#fafaf9` | App background (warm off-white)      |
| `--surface`        | `#ffffff` | Cards, list, editor toolbar          |
| `--surface-2`      | `#f5f5f4` | Sidebar, input fields, hover states  |
| `--border`         | `#e7e5e4` | Default dividers and borders         |
| `--border-strong`  | `#d6d3d1` | Focus and scrollbar thumb            |
| `--text`           | `#1c1917` | Primary text                         |
| `--text-muted`     | `#78716c` | Secondary text, nav items            |
| `--text-faint`     | `#a8a29e` | Timestamps, counts, placeholder      |
| `--accent`         | `#f59e0b` | Amber — selection, blockquote rule   |
| `--accent-soft`    | `#fef3c7` | Selection background, focus ring     |
| `--danger`         | `#dc2626` | Destructive actions (reserved)       |

### Color — dark

Same token names, inverted lightness. Notable: `--bg: #0c0a09`, `--surface: #1c1917`, `--accent: #fbbf24` (slightly brighter amber for contrast), `--accent-soft: #422006`.

### Shape and elevation

| Token         | Value                            |
| ------------- | -------------------------------- |
| `--radius`    | `8px`                            |
| `--radius-sm` | `6px`                            |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)`     |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.06)`    |

---

## 4. Typography

- **UI font:** Inter — weights 400 / 500 / 600 / 700.
- **Mono font:** JetBrains Mono — weights 400 / 500. Used for `code`, `pre`, and tabular blocks.
- **Smoothing:** `-webkit-font-smoothing: antialiased`.
- **Base size:** 14px / 1.6 line-height for chrome.

### Type scale

| Element          | Size  | Weight | Letter-spacing | Notes                           |
| ---------------- | ----- | ------ | -------------- | ------------------------------- |
| Editor H1        | 36px  | 700    | -0.02em        | Title; line-height 1.15         |
| Editor H2        | 22px  | 600    | -0.01em        | Section                         |
| Editor H3        | 16px  | 600    | normal         | Subsection                      |
| Editor body      | 15px  | 400    | normal         | Line-height 1.75                |
| List title       | 14px  | 600    | -0.005em       | Truncated with ellipsis         |
| Brand name       | 14px  | 600    | -0.01em        |                                 |
| Nav item         | 14px  | 500    | normal         |                                 |
| Tag chip         | 11px  | 500    | normal         |                                 |
| Nav section head | 11px  | 600    | 0.06em (caps)  | Uppercase                       |
| Code / pre       | 13px  | 400    | normal         | JetBrains Mono                  |
| Timestamp        | 11px  | 400    | normal         | `font-variant-numeric: tabular` |

---

## 5. Components

### 5.1 Sidebar

- Background `--surface-2`, 1px right border.
- Brand row: 28×28 gradient mark + name.
- Section pattern: small-caps title → list of nav items.
- Nav item: 7×8 padding, 6px radius, icon + label + optional count or dot.
  - Default: muted text, transparent background.
  - Hover: `--surface` background, primary text.
  - Active: `--surface` background + `--shadow-sm`, primary text.
- Tag dots: 8px circles, four reserved hues (blue `#3b82f6`, green `#10b981`, pink `#ec4899`, violet `#8b5cf6`).
- Footer: avatar (28px gradient circle) + name/email, separated by 1px top border, pinned with `margin-top: auto`.

### 5.2 Note list

- Header row: H2 title + `+` icon button (30×30, hover fills with `--surface-2` and a border).
- Search input: 32px left padding for inline icon, `--surface-2` background, amber focus ring (`0 0 0 3px var(--accent-soft)`).
- Note card:
  - 12×14 padding, 8px radius, 2px vertical gap between cards.
  - Title row: title (ellipsis) + right-aligned timestamp (tabular nums).
  - Excerpt: 2-line clamp via `-webkit-line-clamp: 2`.
  - Tag chips: 11px, pill (999px radius), `--surface-2` background.
  - Hover: `--surface-2` background.
  - Active: `--accent-soft` background, amber 25%-opacity border, chips swap to translucent white (or translucent black in dark mode).

### 5.3 Editor

#### Toolbar (sticky-feeling top bar)

- `--surface` background, 1px bottom border, 12×32 padding.
- Left: breadcrumb (folder icon · tag · `/` · **bold note title**).
- Right cluster:
  - "Saved" pill — green status dot, pill chip, `--surface-2` background.
  - Three icon buttons: share, star, more (3-dot).

#### Body

- Centered column: `max-width: 720px`, `padding: 56px 48px 120px` (generous bottom for editor comfort).
- H1 title → meta row (date · tag chips) → content.
- Paragraphs: 15px / 1.75.
- Blockquote: 3px left amber rule, italic, `--surface` background, right-side soft corners.
- Inline code: `--surface-2` background, 1px border, 4px radius.
- Code block: `--surface` background, 1px border, 8px radius, 16px padding.
- Checklist: list-style none, 14px amber-accented checkboxes (`accent-color: var(--accent)`); completed items get strikethrough + faint color via `.done` class.

### 5.4 Scrollbars (WebKit)

10px wide, thumb `--border-strong` with a 2px `--bg`-colored border to inset it visually, 999px radius, transparent track.

---

## 6. Interaction

- **Note selection:** clicking any `.note-card` removes `.active` from siblings and applies it to the clicked card. The editor itself is static in the prototype — in a real build this would swap editor content.
- **Checklist:** each `input[type=checkbox]` toggles a `.done` class on its parent `<li>` for strikethrough.
- **Hover transitions:** 120ms on background, color, and border-color. Nothing longer — the app should feel instant.
- **Focus:** input fields get a 3px `--accent-soft` ring (no default browser outline).

---

## 7. Iconography

Lucide-style 16px SVG icons, `stroke-width: 2`, `stroke-linecap: round`, `stroke-linejoin: round`, color inherits from parent. Used inline as raw `<svg>` to avoid a runtime icon dependency.

Icons currently used: file, star, clock, trash, plus, search, share (3-node graph), more (3-dot).

---

## 8. Sample content guidelines

The prototype intentionally uses realistic notes, not placeholder text. When adding new sample cards, follow these rules:

- Titles should sound like things a real person would write to themselves — specific, sentence-cased, occasionally with an em dash.
- Excerpts should start mid-thought, as if the reader is glancing at the top of a real note.
- Mix work and personal content so the layout demonstrates tag variety.
- Use a small, finite set of tag names: Work, Personal, Ideas, Reading, Planning.

---

## 9. Known limitations of the prototype

- No persistence — refresh resets state.
- No real editor — `.editor-body` is `contenteditable="false"`.
- No search filtering — input is decorative.
- No keyboard shortcuts.
- No empty/loading/error states.
- Only one note's content is rendered; switching cards doesn't swap the body.

---

## 10. Suggested next steps (if promoting to a real build)

1. **Framework:** React + Vite, or Next.js if SSR/auth matter.
2. **State:** start with local component state + `localStorage`, move to a real backend only when multi-device sync is required.
3. **Editor:** TipTap (ProseMirror-based) or Lexical — both support the rich-text features shown.
4. **Search:** client-side fuzzy (Fuse.js) until corpus exceeds a few thousand notes.
5. **Keyboard:** `⌘K` for quick switcher, `⌘N` for new note, `⌘F` for in-note find, `⌘/` for command palette.
6. **Sync model:** offline-first with CRDT (Yjs/Automerge) if collaboration ships; otherwise a simple last-write-wins API is fine for v1.
