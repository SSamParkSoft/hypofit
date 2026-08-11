# Tailwind UI Implementation Plan

Status: completed

Last updated: 2026-05-19

Related documents:

- `docs/completed/high-fidelity-uiux-reference-responsive-plan.md`
- `docs/completed/mobile-first-responsive-uiux-plan.md`
- `docs/completed/web-desktop-uiux-enhancement-plan.md`
- `docs/completed/product-design-redesign-plan.md`
- `docs/architecture.md`
- `docs/repository-structure.md`

Current implementation reference:

```text
apps/web/package.json
apps/web/vite.config.ts
apps/web/tsconfig.json
apps/web/src/main.tsx
apps/web/src/app/App.tsx
apps/web/src/features/auth/AuthPanel.tsx
apps/web/src/styles.css
apps/web/src/shared/api/types.ts
apps/web/src/shared/supabase/profileImages.ts
apps/web/src/shared/ui/confirm-action.tsx
apps/web/src/features/interview-posts/components/postCreationValidation.ts
apps/web/src/features/applications/components/applicationValidation.ts
apps/web/src/features/sessions/components/sessionCreationValidation.ts
```

Primary migration targets:

```text
1. apps/web/src/app/App.tsx
2. apps/web/src/features/auth/AuthPanel.tsx
3. apps/web/src/styles.css
```

Supporting logic that should remain stable during the first pass:

```text
apps/web/src/features/auth/AuthProvider.tsx
apps/web/src/features/interview-posts/useInterviewPosts.ts
apps/web/src/shared/api/*
apps/web/src/shared/supabase/*
```

## Purpose

This document defines the concrete implementation plan for rebuilding Hypofit's PWA UI with Tailwind CSS.

The product design direction is already defined in the high-fidelity UI/UX plan. This document answers the implementation question:

```text
How do we move from the current global CSS dashboard scaffold
to a Tailwind-first, responsive, product-specific PWA UI?
```

## Non-Negotiable Decision

Tailwind CSS is the primary UI styling layer for Hypofit frontend implementation.

Rules:

- New product UI must be implemented with Tailwind utilities and Tailwind-backed component variants.
- New page-level CSS classes should not be added to `apps/web/src/styles.css`.
- Existing global CSS is temporary migration debt.
- CSS files may remain only for Tailwind import, font-face declarations, theme variables, base styles, and rare technical escape hatches.
- Reusable product UI must live as React components, not as global CSS class conventions.

Allowed CSS:

```text
@import "tailwindcss";
@font-face
@theme
:root variables that are not meant to become Tailwind utilities
html/body base styles
rare technical selectors that are difficult or harmful to express inline
```

Disallowed CSS:

```text
.app-shell
.sidebar
.panel
.post-row
.primary-button
.secondary-button
.auth-panel
.auth-form
new page-specific layout classes
new repeated component classes
```

The disallowed examples are current migration targets, not permanent accepted patterns.

## Current State

### Stack

Current `apps/web/package.json` includes:

```text
React 18
Vite 5
TypeScript
TanStack Query
Supabase JS
lucide-react
Vitest
Tailwind CSS v4
@tailwindcss/vite
clsx
tailwind-merge
class-variance-authority
@radix-ui/react-dialog
```

It does not yet include:

```text
shadcn/ui generated components
other Radix primitives such as tabs, popover, select, tooltip
```

### Vite

Current `apps/web/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

Required direction:

```text
Add the Tailwind Vite plugin.
Keep React plugin.
Add path alias only if we choose shadcn/ui or want cleaner imports.
```

### TypeScript

Current `apps/web/tsconfig.json` has no path alias.

This is acceptable for ordinary relative imports. If shadcn/ui is initialized, add:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

If alias is added, `vite.config.ts` also needs the matching `resolve.alias`.

### UI Implementation

Current UI is concentrated in:

```text
apps/web/src/app/App.tsx
apps/web/src/features/auth/AuthPanel.tsx
apps/web/src/styles.css
```

Current issues:

- `App.tsx` mixes shell, navigation, demo data, query data, product rows, metrics, and workflow panel.
- `AuthPanel.tsx` mixes authentication flow, profile image upload, logged-in state, logged-out form, and styling class assumptions.
- `styles.css` owns the visual system through global class names.
- Breakpoints are CSS media-query driven rather than component-level responsive behavior.
- The current screen still reads as a founder-centric dashboard.
- Buttons, cards, rows, status labels, and auth surfaces do not exist as reusable UI primitives.

Current PWA note:

```text
apps/web/public/service-worker.js currently provides a shallow shell-cache fallback.
This should be improved later, but it is not part of the first Tailwind migration slice.
Do not mix service worker/offline-cache refactors into the UI foundation change.
```

## Tailwind Version Strategy

Use the current Tailwind v4 Vite integration.

Official Tailwind v4 Vite setup uses:

```text
tailwindcss
@tailwindcss/vite
@import "tailwindcss";
```

Reason:

- The Vite plugin is the current direct integration path.
- Tailwind v4 uses CSS-first theme variables through `@theme`.
- It reduces the need for a separate `tailwind.config.js` unless the project needs legacy plugin configuration or highly specific build behavior.

Do not start from Tailwind v3 setup patterns such as a mandatory `tailwind.config.js`, `postcss.config.js`, and `content` array unless a dependency specifically requires that.

## Dependency Plan

### Required Immediately

Install:

```bash
cd apps/web
pnpm add tailwindcss @tailwindcss/vite
pnpm add clsx tailwind-merge class-variance-authority
```

Purpose:

- `tailwindcss`: utility framework and theme system.
- `@tailwindcss/vite`: Vite plugin.
- `clsx`: conditional class composition.
- `tailwind-merge`: conflict-safe utility merging.
- `class-variance-authority`: component variant definitions for buttons, badges, inputs, and navigation items.

### Add Later, Component By Component

Add Radix primitives only when the screen needs their behavior:

```bash
cd apps/web
pnpm add @radix-ui/react-dialog
pnpm add @radix-ui/react-tabs
pnpm add @radix-ui/react-popover
pnpm add @radix-ui/react-select
pnpm add @radix-ui/react-tooltip
```

Preferred timing:

- Dialog: destructive confirmation and completion/no-show confirmation.
- Tabs: profile sections or application status groups.
- Popover: desktop sort/filter controls.
- Select: post creation form.
- Tooltip: icon-only buttons.

Do not install every Radix primitive upfront.

### shadcn/ui Decision

shadcn/ui can be used selectively, but it is not the design language.

Recommended approach:

```text
Use shadcn/ui only to scaffold accessible source components.
Immediately restyle and rename composition around Hypofit product primitives.
Do not copy shadcn sample layouts into product screens.
```

Acceptable shadcn components:

- Button.
- Input.
- Textarea.
- Label.
- Dialog.
- Sheet.
- Tabs.
- Select.
- Tooltip.
- Badge.
- Avatar.
- Separator.

Avoid initially:

- Data Table block.
- Sidebar block.
- Dashboard blocks.
- Chart components.
- Large prebuilt application blocks.

Reason:

Those blocks can make the product look like a generic AI-generated SaaS dashboard, which is exactly what the redesign is trying to avoid.

## CSS Entry Plan

Current entry:

```ts
import "./styles.css";
```

Keep the import path initially to avoid unnecessary churn, but change the role of the file.

Target `apps/web/src/styles.css` shape:

```css
@import "tailwindcss";

@font-face {
  font-family: "Gumi Dotum";
  src: url("/fonts/GumiDotum-Regular.woff2") format("woff2");
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

@theme {
  /* Hypofit tokens go here */
}

:root {
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

html {
  min-width: 320px;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
```

Temporary compatibility section:

```css
/* @deprecated Tailwind migration compatibility. Remove as components migrate. */
```

This section may contain old classes only while a component still depends on them.

Deletion rule:

```text
When a component is migrated to Tailwind, remove its old CSS class block in the same change.
Do not leave dead CSS behind.
```

## Theme Token Plan

Tailwind should encode Hypofit's design tokens through `@theme`.

### Color Tokens

Use semantic token names rather than raw brand-only names.

Recommended token set:

```css
@theme {
  --color-hypo-bg: #f7f5ef;
  --color-hypo-surface: #ffffff;
  --color-hypo-surface-muted: #f1eee6;
  --color-hypo-border: #dedbd2;

  --color-hypo-text: #1d2522;
  --color-hypo-text-muted: #66706b;
  --color-hypo-text-soft: #8a918c;

  --color-hypo-brand: #176b5d;
  --color-hypo-brand-strong: #0f4f44;
  --color-hypo-brand-soft: #e7f1ee;

  --color-hypo-info: #2563eb;
  --color-hypo-info-soft: #eff6ff;

  --color-hypo-reward: #b7791f;
  --color-hypo-reward-soft: #fff7ed;

  --color-hypo-success: #15803d;
  --color-hypo-success-soft: #f0fdf4;

  --color-hypo-warning: #b45309;
  --color-hypo-warning-soft: #fffbeb;

  --color-hypo-danger: #b91c1c;
  --color-hypo-danger-soft: #fef2f2;
}
```

Implementation note:

- The exact palette can change after visual QA.
- Do not overuse brand green.
- Reward, online mode, pending state, completion, and no-show should have distinct semantic colors.

### Typography Tokens

Preferred production UI font:

```text
Pretendard or Noto Sans KR for dense app UI.
Inter/system-ui fallback for Latin.
Gumi Dotum as optional brand accent only.
```

If only existing local font files are available at first, keep `Gumi Dotum` temporarily but structure the token so the font can be swapped cleanly later.

Example:

```css
@theme {
  --font-sans:
    "Pretendard", "Noto Sans KR", Inter, ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-brand: "Gumi Dotum", var(--font-sans);
}
```

Number formatting:

```text
Use `tabular-nums` for reward, duration, counts, and schedule columns.
```

### Radius Tokens

Recommended:

```css
@theme {
  --radius-hypo-sm: 4px;
  --radius-hypo-md: 6px;
  --radius-hypo-lg: 8px;
  --radius-hypo-pill: 999px;
}
```

Rules:

- Product cards should generally use `rounded-hypo-lg`.
- Inputs and buttons use `rounded-hypo-md` or `rounded-hypo-lg`.
- Pills are for compact metadata only.
- Avoid large rounded cards.

### Shadow Tokens

Use shadows sparingly.

Recommended:

```css
@theme {
  --shadow-hypo-focus: 0 0 0 3px rgb(23 107 93 / 0.18);
  --shadow-hypo-panel: 0 1px 2px rgb(29 37 34 / 0.06);
  --shadow-hypo-floating: 0 12px 32px rgb(29 37 34 / 0.12);
}
```

Rules:

- Default panels should mostly use border, not shadow.
- Floating sheets/popovers can use stronger shadows.
- Focus states must be visible.

### Breakpoint Policy

Use Tailwind default breakpoints first:

```text
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

Hypofit layout interpretation:

```text
unprefixed:
  mobile first, 320px+ support

sm:
  larger mobile, wider cards

md:
  tablet and larger phone landscape

lg:
  desktop shell begins

xl:
  comfortable list/detail workspace

2xl:
  persistent inspector and wider tables
```

Do not create custom breakpoints until visual QA proves the default breakpoints are insufficient.

## Component Architecture

Create a product-specific UI layer.

Recommended structure:

```text
apps/web/src/shared/ui/
  cn.ts
  button.tsx
  icon-button.tsx
  badge.tsx
  status-badge.tsx
  field.tsx
  text-input.tsx
  select-field.tsx
  avatar.tsx
  empty-state.tsx
  loading-state.tsx
  error-state.tsx

apps/web/src/shared/ui/navigation/
  AppShell.tsx
  MobileBottomNav.tsx
  DesktopRail.tsx
  PageHeader.tsx

apps/web/src/features/interview-posts/components/
  OpportunityCard.tsx
  OpportunityRow.tsx
  OpportunityDetailPanel.tsx
  RewardMeta.tsx
  ModeMeta.tsx
  TargetFitSummary.tsx

apps/web/src/features/applications/components/
  ApplicationStatusBadge.tsx
  ApplicationCard.tsx
  ApplicantRow.tsx
  ApplicantInspector.tsx

apps/web/src/features/sessions/components/
  SessionStatusBadge.tsx
  ScheduleAgendaItem.tsx
  SessionResultPanel.tsx

apps/web/src/features/profiles/components/
  ProfileAvatarUploader.tsx
  ProfileCompleteness.tsx
```

### `cn` Utility

Add:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Use `cn` for:

- Variant components.
- Conditional state classes.
- Call-site class overrides.

Do not use `cn` to hide highly complex styling decisions inside page components.

### Button

Button variants:

```text
primary
secondary
ghost
danger
quiet
```

Button sizes:

```text
sm
md
lg
icon
```

Rules:

- Minimum mobile touch target should be 44px for important actions.
- Icon-only buttons require `aria-label`.
- Loading state should prevent double submit.
- Destructive actions use danger variant plus confirmation for irreversible flows.

### Badge

Badge should support semantic intent:

```text
neutral
brand
info
reward
success
warning
danger
```

Do not create a different badge style per screen.

### Status Badges

Create explicit status mapping:

```text
interview post:
  draft
  open
  completed
  closed

application:
  applied
  reviewing
  selected
  rejected
  withdrawn later

session:
  pending
  scheduled
  completed
  no_show
  canceled
```

Rules:

- Status label is never color-only.
- Badge color maps to semantic consequence.
- Status copy should use Korean product language, not raw API enum labels.

### Form Fields

Form field components:

```text
Field
TextInput
Textarea
SelectField
RadioCards
CheckboxGroup
AmountInput later
ScheduleOptionInput later
```

Rules:

- Labels are permanent.
- Placeholder is example text only.
- Error text is adjacent to the field.
- Required fields are visible.
- Field groups use semantic headings.

### App Shell

Target shell:

```text
Mobile:
  top bar
  content
  bottom navigation
  safe-area padding

Desktop:
  compact rail/sidebar
  page workspace
  optional right inspector
```

Navigation destinations:

```text
찾기
내 신청
내 모집
일정
프로필
```

Implementation rule:

```text
The same route/page model powers mobile and desktop.
Only the layout surface changes by breakpoint.
```

## Migration Sequence

### Phase 0. Freeze CSS Growth

Action:

- Mark old class blocks in `styles.css` as migration-only.
- Do not add new product classes to `styles.css`.
- Add this active plan to related docs.

Done when:

- Team/agent rule is clear: new UI means Tailwind.

### Phase 1. Install Tailwind Foundation

Actions:

1. Install required packages.
2. Update `vite.config.ts` to include `tailwindcss()`.
3. Keep `import "./styles.css"` in `main.tsx`.
4. Add `@import "tailwindcss";` to the top of `styles.css`.
5. Add `@theme` tokens.
6. Add `shared/ui/cn.ts`.
7. Run build.

Expected `vite.config.ts`:

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

If shadcn alias is adopted later:

```ts
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Done when:

```bash
cd apps/web
pnpm run build
```

passes and at least one simple Tailwind utility visibly applies.

### Phase 2. Build UI Primitives

Actions:

- Create `Button`.
- Create `IconButton`.
- Create `Badge`.
- Create `StatusBadge`.
- Create `Avatar`.
- Create `Field`.
- Create `EmptyState`, `LoadingState`, `ErrorState`.

Do not migrate whole pages yet.

Done when:

- Components compile.
- Components are used in one low-risk place.
- Old CSS button classes are no longer used by the migrated place.

### Phase 3. Split `App.tsx`

Current `App.tsx` is too broad.

Target split:

```text
App.tsx
  -> AppShell
  -> current page state/routing placeholder

pages/ExplorePage.tsx
pages/ApplicationsPage.tsx
pages/FounderPostsPage.tsx
pages/SchedulePage.tsx
pages/ProfilePage.tsx
```

MVP can use local state before adding a router:

```ts
type AppDestination = "explore" | "applications" | "founder-posts" | "schedule" | "profile";
```

Router can be added later if URL-level navigation becomes necessary.

Done when:

- `App.tsx` is mostly composition.
- Navigation destination is explicit.
- Each page can be migrated independently.

### Phase 4. Migrate App Shell

Actions:

- Build `AppShell`.
- Build `MobileBottomNav`.
- Build `DesktopRail`.
- Build `PageHeader`.
- Replace current sidebar CSS classes.
- Remove `.app-shell`, `.sidebar`, `.brand`, `.nav-list`, `.nav-item`, `.workspace`, `.topbar` CSS after migration.

Mobile behavior:

```text
fixed bottom nav
safe-area inset
content padding-bottom enough for nav
top bar with page title and one action
```

Desktop behavior:

```text
lg:grid
left rail 232-260px or compact 88px depending design
main content minmax(0, 1fr)
optional inspector on xl+
```

Done when:

- Navigation works at 320px, 390px, 768px, 1024px, 1440px.
- Sidebar no longer looks like a generic dashboard.
- Mobile does not show desktop sidebar.

### Phase 5. Migrate Auth/Profile UI

Reason:

Auth and profile image upload are already functional, but visually tied to old CSS.

Actions:

- Extract `ProfileAvatarUploader` from `AuthPanel`.
- Split logged-in and logged-out views.
- Replace `.auth-*` CSS classes with Tailwind.
- Use shared `Button`, `Field`, `Avatar`, `Badge`.
- Keep upload behavior unchanged.

Target files:

```text
apps/web/src/features/auth/AuthPanel.tsx
apps/web/src/features/profiles/components/ProfileAvatarUploader.tsx
apps/web/src/shared/supabase/profileImages.ts
```

Done when:

- Login form works.
- Signup form works.
- Logout works.
- Profile image upload works.
- No `.auth-*` CSS remains.

### Phase 6. Migrate Explore

Actions:

- Create `ExplorePage`.
- Create `OpportunityCard`.
- Create `OpportunityRow`.
- Create `OpportunityDetailPanel`.
- Replace fallback dashboard metrics with opportunity discovery.
- Preserve real API call through `useInterviewPosts`.
- Replace fake fallback posts with explicit empty/demo strategy.

Rules:

- Mobile uses cards.
- Desktop uses list/detail.
- Reward, mode, duration, location, target fit appear in list items.
- `상세 보기` must update selected detail or open detail view, not remain inert.

Done when:

- Respondent discovery is the first clear product experience.
- List item has enough decision information.
- Empty, loading, and error states exist.

### Phase 7. Migrate Founder Flow

Actions:

- Create `FounderPostsPage`.
- Create `ApplicantRow`.
- Create `ApplicantInspector`.
- Create founder status summary based on real or placeholder states.
- Prepare table/list responsive behavior.

Rules:

- Desktop founder review can be dense.
- Mobile founder review must remain one-task-at-a-time.
- Do not show fake AI scores.
- Use explicit fit evidence.

Done when:

- Founder can see posts and review applicants conceptually.
- The UI no longer depends on metrics cards as primary content.

### Phase 8. Migrate Applications And Schedule

Actions:

- Create `ApplicationsPage`.
- Create `SchedulePage`.
- Create `ApplicationStatusBadge`.
- Create `SessionStatusBadge`.
- Create `ScheduleAgendaItem`.

Rules:

- Group by next action.
- Put scheduled and pending items above history.
- Make completion/no-show states explicit.

Done when:

- Status tracking is visible for both roles.
- Session actions have clear affordances.

### Phase 9. Remove Old CSS

Actions:

- Search for old class names.
- Remove corresponding CSS blocks.
- Keep only Tailwind import, font-face, theme, and base styles.

Commands:

```bash
cd apps/web
rg "className=\"(app-shell|sidebar|brand|nav-item|workspace|topbar|panel|post-row|metric|auth-)"
```

Done when:

- No old global product class is referenced.
- `styles.css` is small and token/base-focused.

## Responsive Implementation Rules

### Mobile First

Use unprefixed classes for mobile.

Example:

```tsx
<main className="min-h-dvh bg-hypo-bg pb-24 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:pb-0">
```

Rules:

- Do not use `sm:` to mean mobile.
- Start with 320px-safe layout.
- Add `md:`, `lg:`, `xl:` progressively.

### Safe Areas

Mobile bottom nav and sticky CTAs need safe-area support.

Use Tailwind arbitrary values where needed:

```text
pb-[calc(env(safe-area-inset-bottom)+0.75rem)]
bottom-[env(safe-area-inset-bottom)]
```

Rules:

- Fixed bottom nav must not cover content.
- Detail pages with sticky CTA need extra bottom padding.

### Desktop Split Views

Use explicit min widths.

Example:

```text
lg:grid-cols-[minmax(360px,0.9fr)_minmax(420px,1.1fr)]
xl:grid-cols-[320px_minmax(520px,1fr)_360px]
```

Rules:

- Do not show three columns before content can breathe.
- Inspector panel can be hidden below `xl`.
- Tables should not crush long Korean text.

### Text Overflow

Rules:

- Use `min-w-0` on flex/grid children.
- Use `truncate` only when the full text is available elsewhere.
- Prefer `line-clamp-2` for card titles if line-clamp utility is available.
- Long Korean copy should wrap naturally in detail views.

## Product UI Quality Rules

### Avoid Generic Tailwind SaaS Look

Do not overuse:

- `shadow-xl`.
- Purple/blue gradients.
- Huge hero typography.
- Repeated `Card` components.
- Default shadcn demo composition.
- Symmetric three-column marketing sections.

Prefer:

- Border-first panels.
- Small radius.
- Dense metadata.
- Product-specific component names.
- Explicit status copy.
- Calm semantic colors.

### Naming Rule

Prefer product-specific components:

```text
OpportunityCard
ApplicantRow
SessionAgendaItem
TargetFitSummary
RewardMeta
ProfileAvatarUploader
```

Avoid overusing generic components:

```text
Card
Panel
Box
Item
Block
```

Generic primitives are allowed in `shared/ui`, but feature code should read like the product domain.

### Data Rule

Do not use fake metrics as primary UI.

Allowed placeholder:

```text
empty state
loading skeleton
demo data only if clearly marked for local development
```

Disallowed:

```text
fake KPI cards
fake AI fit scores
fake trust ratings
fake payment automation
```

## shadcn/Radix Integration Plan

### When To Use shadcn

Use shadcn when:

- The component has non-trivial accessibility behavior.
- The generated source saves time.
- The component can be restyled into Hypofit tokens.
- The component does not force a dashboard look.

Good candidates:

```text
button
dialog
sheet
tabs
select
tooltip
avatar
separator
textarea
label
```

### When To Use Radix Directly

Use Radix directly when:

- shadcn output is too visually opinionated.
- The component must be deeply customized.
- We only need a small primitive.

Good candidates:

```text
Dialog
Tabs
Popover
Select
Tooltip
VisuallyHidden
Slot
```

### When Not To Use Either

Use native HTML when:

- A native form element is sufficient.
- A button, link, list, table, or fieldset can solve the problem.
- The component does not need custom focus management or portal behavior.

## Accessibility Plan

Required:

- Use native buttons for actions.
- Use anchors only for navigation.
- Use labels for every input.
- Use fieldsets for grouped radio/checkbox options.
- Use table semantics only for real tables.
- Use `aria-label` for icon-only buttons.
- Use visible focus states.
- Use accessible dialog/sheet primitives.
- Do not communicate status by color alone.

Specific checks:

```text
Mobile bottom nav:
  aria-label on nav
  active item has aria-current="page"

Profile image upload:
  file input has clear label
  upload progress message is announced or visible

Applicant review:
  select/reject actions are buttons
  destructive actions require confirmation

Status badges:
  text label included
```

## PWA-Specific Plan

Tailwind implementation must respect installed PWA behavior.

Rules:

- Use `min-h-dvh` instead of only `min-h-screen` where mobile browser chrome matters.
- Add safe-area padding to fixed bottom nav.
- Ensure offline/error state is visible and not only console-based.
- Avoid layout shift during auth/session loading.
- Keep first screen usable on mobile without horizontal scroll.

PWA visual QA:

```text
Safari iOS viewport behavior later
Chrome Android viewport behavior later
installed PWA safe-area behavior later
desktop browser responsive modes now
```

## File-By-File Migration Map

### `apps/web/package.json`

Add dependencies:

```text
tailwindcss
@tailwindcss/vite
clsx
tailwind-merge
class-variance-authority
```

Add Radix/shadcn dependencies only when used.

### `apps/web/vite.config.ts`

Add Tailwind plugin.

Add alias only when needed.

### `apps/web/tsconfig.json`

No change required for Tailwind.

Add path alias only if using `@/*`.

### `apps/web/src/styles.css`

Transform from global component stylesheet into Tailwind entry and token file.

Migration target:

```text
keep:
  @import "tailwindcss"
  @font-face
  @theme
  base html/body

remove over time:
  all product component classes
```

### `apps/web/src/main.tsx`

Keep:

```ts
import "./styles.css";
```

No immediate change unless file is renamed to `app.css`.

Recommendation:

Keep `styles.css` for now to minimize churn. Rename later only if useful.

### `apps/web/src/app/App.tsx`

Split into shell and pages.

Remove:

- Inline fallback dashboard logic from root composition.
- Old class names.
- Metrics grid as primary surface.

Keep:

- Query provider remains in `main.tsx`.
- Auth provider remains in `main.tsx`.
- `App` owns current destination until router exists.

### `apps/web/src/features/auth/AuthPanel.tsx`

Split logged-in and logged-out UI.

Possible structure:

```text
AuthPanel.tsx
SignedInUserMenu.tsx
AuthForm.tsx
ProfileAvatarUploader.tsx
```

Keep:

- Existing auth behavior.
- Existing image upload behavior.
- Existing `syncCurrentUser` call.

Replace:

- `auth-*` class names.
- `primary-button` and `secondary-button` class names.

## Validation Plan

### After Tailwind Install

Run:

```bash
cd apps/web
pnpm run build
```

Equivalent root command:

```bash
pnpm build:web
```

Expected:

- TypeScript passes.
- Vite build passes.
- Tailwind utilities are generated.

### After Each Migration Phase

Run:

```bash
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
```

Equivalent root commands:

```bash
pnpm lint:web
pnpm test:web
pnpm build:web
```

Current note:

`lint` is currently TypeScript no-emit according to `package.json`, not ESLint execution.

### Visual QA

Use screenshot checks at:

```text
mobile:
  320 x 700
  360 x 800
  390 x 844
  430 x 932

tablet:
  768 x 1024
  1024 x 768

desktop:
  1280 x 900
  1440 x 1000
  1536 x 1000
```

Check:

- No horizontal scroll on mobile.
- Bottom nav does not cover content.
- Text does not overflow buttons.
- Long Korean titles wrap cleanly.
- Profile image upload remains usable.
- Desktop list/detail panes do not collapse.
- Focus ring is visible.

## Risk Management

### Risk: Tailwind Classes Become Too Long

Mitigation:

- Use shared primitives for repeated patterns.
- Use `class-variance-authority` for variants.
- Keep page-specific layout inline but repeated controls as components.

### Risk: shadcn Makes The App Look Generic

Mitigation:

- Do not import blocks.
- Restyle tokens immediately.
- Prefer product-specific composition.
- Avoid sample dashboard layouts.

### Risk: Existing CSS Fights Tailwind

Mitigation:

- Add Tailwind import first.
- Migrate one area at a time.
- Remove old class blocks immediately after migration.
- Avoid old global selectors like `button {}` if they alter shared components unexpectedly.

### Risk: Auth/Profile Upload Breaks During UI Split

Mitigation:

- Extract behavior after tests/build pass.
- Keep upload helper unchanged.
- Preserve accepted MIME types and 3MB file rule.
- Verify upload manually after migration.

### Risk: Mobile Bottom Nav Covers Content

Mitigation:

- Use explicit content bottom padding.
- Use safe-area env values.
- Test at 320px and 390px widths.

### Risk: Desktop Workspace Becomes Too Dense

Mitigation:

- Start with two panes at `lg`.
- Add third inspector only at `xl` or `2xl`.
- Keep minimum pane widths.

## Rollback Strategy

Do not perform a full rewrite in one change.

Rollback unit should be phase-based:

```text
Phase 1:
  Tailwind install/config can be reverted independently.

Phase 2:
  UI primitives can be reverted without changing page logic.

Phase 3:
  App split can be reverted before screen migration if needed.

Phase 4+:
  Each page migration should be independently reviewable.
```

Do not delete the entire old CSS until the migrated component no longer references it and build/visual checks pass.

## Implementation Order Summary

Recommended order:

```text
1. Add Tailwind v4 Vite setup.
2. Add theme tokens in styles.css.
3. Add `cn` and UI primitives.
4. Build Tailwind AppShell.
5. Build mobile bottom nav and desktop rail.
6. Split App.tsx into pages.
7. Migrate AuthPanel/ProfileAvatarUploader.
8. Migrate Explore page.
9. Migrate Founder workspace.
10. Migrate Applications and Schedule.
11. Remove old CSS blocks.
12. Run build/test and responsive visual QA.
```

## Immediate Next Task

The first implementation task should be:

```text
Tailwind foundation + shell skeleton
```

Scope:

- Install Tailwind dependencies.
- Add Vite Tailwind plugin.
- Add `@import "tailwindcss";`.
- Add initial Hypofit theme tokens.
- Add `cn`.
- Add `Button`, `Badge`, and `StatusBadge`.
- Add `AppShell`, `MobileBottomNav`, `DesktopRail`.
- Keep current data flow intact.
- Do not migrate every page yet.

Acceptance:

```text
apps/web builds successfully.
The app shell is rendered with Tailwind.
Mobile bottom nav exists.
Desktop rail exists.
No new page-level CSS is introduced.
```

## Implementation Log

### 2026-05-19 Tailwind Foundation And Shell Slice

Completed:

- Added Tailwind v4 Vite integration.
- Added Tailwind theme tokens in `apps/web/src/styles.css`.
- Converted `styles.css` from page-level global CSS into Tailwind entry, font, token, and base-style file.
- Added shared UI primitives:
  - `cn`
  - `Button`
  - `Badge`
  - `InterviewPostStatusBadge`
  - `Avatar`
  - `Field`
  - `TextInput`
  - `SelectInput`
  - `EmptyState`
  - `LoadingState`
  - `ErrorState`
- Added responsive shell components:
  - `AppShell`
  - desktop rail
  - mobile bottom navigation
- Split the root app into destination-based pages:
  - `ExplorePage`
  - `PlaceholderPage` for upcoming destinations
- Added interview post product components:
  - `OpportunityCard`
  - `OpportunityDetailPanel`
  - `interviewPostMeta`
- Extracted profile image upload UI into:
  - `ProfileAvatarUploader`
- Refactored `AuthPanel` to Tailwind and shared UI primitives.
- Made Supabase browser configuration fail gracefully in local UI rendering instead of crashing the app at import time.
- Added initial Vitest coverage for interview post metadata helpers.

Validation:

```bash
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
```

Result:

```text
lint: passed
test: passed, 1 file / 2 tests
build: passed
```

Visual verification:

```text
desktop screenshot: 1440 x 1000
mobile screenshot: 390 x 844
```

Current local behavior:

- App shell renders with Tailwind.
- Desktop rail renders at desktop width.
- Mobile bottom navigation renders at mobile width.
- Missing Supabase browser env shows a visible auth error instead of a blank screen.
- Missing local API shows a visible interview-list error state instead of hiding the page.

Remaining next slice:

- Replace placeholder pages with real Tailwind implementations for:
  - My Applications
  - Founder Posts
  - Schedule
  - Profile
- Add real post creation flow.
- Add application/session API wiring to the new pages.
- Improve PWA offline/cache behavior separately from the UI foundation slice.

### 2026-05-19 Applications, Founder Posts, Schedule, Profile Slice

Completed:

- Added frontend API clients:
  - `apps/web/src/shared/api/applications.ts`
  - `apps/web/src/shared/api/sessions.ts`
- Added TanStack Query hooks:
  - `useApplications`
  - `useSessions`
- Replaced placeholder destinations with real Tailwind pages:
  - `ApplicationsPage`
  - `FounderPostsPage`
  - `SchedulePage`
  - `ProfilePage`
- Added product components:
  - `ApplicationCard`
  - `FounderPostCard`
  - `ScheduleAgendaItem`
  - shared `PageFrame`
  - shared `PageHeader`
- Extended status badges:
  - application status
  - session status
- Removed `PlaceholderPage`.
- Connected navigation destinations to real pages in `App.tsx`.

Validation:

```bash
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
```

Result:

```text
lint: passed
test: passed, 1 file / 2 tests
build: passed
```

Visual verification:

```text
desktop screenshot: 1440 x 1000
mobile screenshot: 390 x 844
```

Current limitations:

- At this slice, application and session list screens used the then-current API response shape, which did not yet include joined interview post, applicant profile, or founder profile data.
- Founder applicant review is still list-summary level, not a full table/inspector workflow.
- At this slice, completion/no-show buttons were visible as workflow affordances but mutation wiring was not yet connected in the UI.
- At this slice, post creation and respondent application submission flows were not yet implemented.
- Profile page shows account state and role/profile sections, but respondent/founder profile edit forms are not implemented yet.

Remaining next slice:

- Build post creation form and call `POST /api/v1/interview-posts/`.
- Build respondent application form and call `POST /api/v1/applications/`.
- Wire founder selection/rejection actions to `PATCH /api/v1/applications/{id}/status`.
- Wire session completion/no-show actions to session endpoints.
- Add richer API response contracts or frontend composition for post/application/session joins.

### 2026-05-19 MVP Action Mutation Slice

Completed:

- Added mutation hooks:
  - `useCreateInterviewPost`
  - `useCreateApplication`
  - `useUpdateApplicationStatus`
  - `useCompleteSession`
  - `useMarkNoShow`
- Added post creation form:
  - `PostCreationForm`
  - calls `POST /api/v1/interview-posts/`
  - invalidates interview post queries after success
- Added respondent application form inside `OpportunityDetailPanel`:
  - collects relevant experience
  - collects available times
  - calls `POST /api/v1/applications/`
  - invalidates application queries after success
- Added founder applicant review actions:
  - `ApplicantReviewCard`
  - selection calls `PATCH /api/v1/applications/{id}/status` with `selected`
  - rejection calls `PATCH /api/v1/applications/{id}/status` with `rejected`
- Wired session agenda actions:
  - completion calls `POST /api/v1/sessions/{id}/complete`
  - no-show calls `POST /api/v1/sessions/{id}/no-show`
- Added shared `TextareaInput` for form sections.

Validation:

```bash
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
```

Result:

```text
lint: passed
test: passed, 1 file / 2 tests
build: passed
```

Visual verification:

```text
desktop screenshot: 1440 x 1000
mobile screenshot: 390 x 844
```

Current limitations:

- Mutations are wired to existing endpoints, but full end-to-end behavior still depends on running FastAPI, Supabase auth, and valid production/local env values.
- Application/session pages still lack joined display data such as post title, applicant name, founder profile, and session participant role.
- Session creation from a selected application is not yet exposed in the UI.
- Destructive/important actions currently execute directly; confirmation dialogs should be added before production use.
- Post creation is functional but not yet a full multi-step preview workflow.

Remaining next slice:

- Add session creation flow from selected applications.
- Add backend/frontend response joins or client-side composition so applications and sessions show human-readable post and profile data.
- Add confirmation dialogs for rejection, completion, and no-show.
- Add form validation messages beyond native required fields.

### 2026-05-19 Session Creation And Readability Slice

Completed:

- Added session creation mutation:
  - `useCreateSession`
  - calls `POST /api/v1/sessions/`
  - invalidates session queries after success
- Added `SessionCreationForm` for selected applicants.
- Updated founder applicant review so selected applications can create an interview session directly.
- Improved application cards with frontend composition:
  - shows interview post title when the post can be matched locally
  - shows target description instead of only raw IDs when available
  - shows linked session status when available
- Improved schedule agenda items with frontend composition:
  - shows interview post title when available
  - shows respondent/application IDs as secondary metadata
- Kept the implementation compatible with the current API response shape, which still does not provide joined application/post/session records.

Validation:

```bash
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
```

Result:

```text
lint: passed
test: passed, 1 file / 2 tests
build: passed
```

Current limitations:

- Joined display is client-side composition only. Backend should eventually expose richer read models for founder review and respondent status views.
- Session creation has native required-field validation but does not yet have product-specific validation messages.
- Rejection, completion, and no-show still need confirmation dialogs before production use.
- Meeting URL/place are accepted as optional according to the current API contract.

Remaining next slice:

- Add confirmation dialogs for destructive or trust-sensitive actions.
- Add stronger form validation and inline error messages.
- Add backend or frontend read models for applicant names, profile images, post titles, and session participant roles.
- Add UI tests for key interaction flows.

### 2026-05-19 Confirmation And Validation Slice

Completed:

- Added shared `ConfirmActionButton` with Radix Dialog and Tailwind dialog styling.
- Added confirmation dialogs for:
  - applicant selection
  - applicant rejection
  - session completion
  - no-show marking
- Added product-specific validation helpers for:
  - post creation form
  - respondent application form
  - session creation form
- Added URL validation for optional online meeting links.
- Added unit tests for post creation, application, and session validation/input normalization.
- Kept form components focused on local state and submit wiring while API input shaping lives in pure helpers.

Validation:

```bash
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
```

Result:

```text
lint: passed
test: passed, 4 files / 12 tests
build: passed, with Vite chunk-size warning for a 514.94 kB JS asset
```

Current limitations:

- UI tests for dialog open/confirm/cancel flows are not yet implemented.
- Validation is frontend-only; backend should still enforce business constraints.
- The initial app bundle now crosses Vite's default 500 kB warning threshold. This is acceptable for the MVP slice, but route-level lazy loading or manual chunks should be considered before wider release.

Remaining next slice:

- Add UI tests for confirmation flows.
- Add richer read models for applicant/profile/session display.
- Add route/page-level lazy loading if bundle size continues to grow.

### 2026-05-19 Read Model And Bundle Slice

Completed:

- Added frontend workflow read model helpers:
  - `buildApplicationReadModels`
  - `buildSessionReadModels`
  - `formatAnswerLabel`
  - `formatSessionTime`
  - `shortId`
- Updated My Applications to render from an application read model instead of repeated inline `find` calls.
- Updated Schedule to render from a session read model instead of repeated inline `find` calls.
- Improved visible labels:
  - application cards now show Korean session status badges and scheduled time labels
  - applicant review answers now show product labels such as `관련 경험` instead of raw answer keys
  - schedule items now use a single composed title/respondent/application label model
- Added unit tests for workflow read model composition.
- Added route/page-level lazy loading with `React.lazy` and `Suspense` in `App.tsx`.
- Reduced the initial JS bundle enough to remove the Vite 500 kB chunk-size warning.

Validation:

```bash
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
```

Result:

```text
lint: passed
test: passed, 5 files / 15 tests
build: passed
initial JS asset: 425.79 kB gzip 122.61 kB
previous warning asset: 514.94 kB gzip 149.25 kB
```

Visual QA:

```text
/tmp/hypofit-readmodels-lazy-desktop.png
/tmp/hypofit-readmodels-lazy-mobile.png
```

Current limitations:

- Read models are still frontend composition over separate API responses. The backend should eventually expose richer joined read endpoints for application review and schedule views.
- At this slice, profile names/images for applicants were not yet available in application/session API responses, so the UI fell back to short respondent IDs.
- At this slice, UI tests for confirmation dialogs were not yet implemented.

Remaining next slice:

- Add applicant/profile data to backend read responses or add a profile lookup endpoint. Completed in a later slice.
- Add UI tests for confirmation dialog open/cancel/confirm behavior. Completed in a later slice.
- Continue mobile and desktop visual QA on non-empty application and schedule states.

### 2026-05-19 Profile Read Response Slice

Completed:

- Added backend user summary schema for nested participant display:
  - `UserSummary`
  - `id`
  - `name`
  - `role`
  - `profile_image_url`
- Extended application read responses with:
  - `respondent`
- Extended session read responses with:
  - `application`
  - nested `application.respondent`
- Added SQLAlchemy read queries that join:
  - applications -> app users
  - interview sessions -> applications -> app users
- Kept existing response fields stable so current frontend callers remain compatible.
- Updated frontend API types for optional nested profile/application data.
- Updated frontend read models to prefer real respondent names over short IDs when present.
- Updated application and applicant review cards to show respondent avatar/name when API data is available.

Validation:

```bash
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
python3 -m compileall apps/api/app
```

Result:

```text
web lint: passed
web test: passed, 5 files / 15 tests
web build: passed
api compileall: passed
api pytest: not run, local python3 does not have pytest installed
```

Visual QA:

```text
/tmp/hypofit-profile-readmodel-desktop.png
/tmp/hypofit-profile-readmodel-mobile.png
```

Current limitations:

- Backend authorization is still too permissive for application status and session actions.
- Session create/update responses still return entity shape without nested data; list responses now provide richer read data.
- UI confirmation dialog behavior still lacks DOM-level tests.

Remaining next slice:

- Add backend authorization checks for founder/respondent ownership before status/session mutations.
- Add UI tests for confirmation dialog open/cancel/confirm behavior.
- Add API tests once the local API test environment has pytest dependencies installed.

### 2026-05-19 Backend Authorization Slice

Completed:

- Protected application list reads with Supabase bearer authentication.
- Scoped application list reads to records where the current user is:
  - the respondent who applied, or
  - the founder who owns the related interview post.
- Protected session list reads with Supabase bearer authentication.
- Scoped session list reads to records where the current user is:
  - the respondent attached to the application, or
  - the founder who owns the related interview post.
- Restricted application status updates to the founder who owns the related interview post.
- Restricted session creation to the founder who owns the related interview post.
- Added a server-side rule that only `selected` applications can be scheduled.
- Restricted session completion/no-show actions to:
  - the founder who owns the related interview post, or
  - the respondent attached to the application.
- Restricted interview post close action to the founder who owns the post.
- Updated frontend application/session API clients to send bearer tokens for protected reads and mutations.
- Updated application/session hooks and pages to pass the current Supabase access token.

Validation:

```bash
python3 -m compileall apps/api/app
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
```

Result:

```text
api compileall: passed
web lint: passed
web test: passed, 5 files / 15 tests
web build: passed
api pytest: not run, local python3 does not have pytest installed
```

Current limitations:

- API authorization behavior still needs automated API tests.
- Application/session list endpoints now require auth; anonymous users should not call them.
- Backend still trusts the Supabase token subject as the app user id and does not yet enforce role profile completeness for founder/respondent actions.

Remaining next slice:

- Install/use API test dependencies and add route-level authorization tests.
- Add UI tests for confirmation dialog open/cancel/confirm behavior.
- Consider role/profile completeness checks before allowing founder-only and respondent-only actions.

### 2026-05-19 API Authorization Test Slice

Completed:

- Created a local API test virtual environment:
  - `apps/api/.venv`
  - ignored by `.gitignore`
- Installed `apps/api[dev]` into that environment.
- Added route-level authorization tests in `apps/api/tests/test_authorization.py`.
- Covered:
  - application list requires auth
  - application list passes current user scope to service layer
  - non-owner cannot update application status
  - founder can create a session for a selected application
  - unselected application cannot be scheduled
  - application respondent can complete a session
  - non-owner cannot close an interview post
- Kept tests DB-free by overriding FastAPI dependencies and monkeypatching service calls.

Validation:

```bash
apps/api/.venv/bin/python -m ruff check apps/api/app apps/api/tests
apps/api/.venv/bin/python -m pytest apps/api/tests
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
python3 -m compileall apps/api/app
```

Result:

```text
api ruff: passed
api pytest: passed, 8 tests
api compileall: passed
web lint: passed
web test: passed, 5 files / 15 tests
web build: passed
```

Current limitations:

- Tests cover route-level authorization branches with monkeypatched service dependencies, not a real database transaction.
- Role/profile completeness checks are still not enforced.
- Confirmation dialog UI tests were not implemented in this slice.

Remaining next slice:

- Add UI tests for confirmation dialog open/cancel/confirm behavior. Completed in the next slice.
- Consider lightweight integration tests around repository query scoping when a local test DB strategy exists.
- Add role/profile completeness checks before founder-only and respondent-only actions if the MVP onboarding flow needs it.

### 2026-05-19 Confirmation Dialog UI Test Slice

Completed:

- Added DOM testing dependencies to the web app:
  - `@testing-library/react`
  - `@testing-library/user-event`
  - `@testing-library/jest-dom`
  - `jsdom`
- Configured Vitest to run component tests in `jsdom`.
- Added shared test setup:
  - `apps/web/src/test/setup.ts`
- Added `ConfirmActionButton` UI tests:
  - opens the Radix Dialog from the trigger
  - closes via Escape after opening
  - closes without confirming when cancel is clicked
  - calls `onConfirm` once and closes when confirm is clicked
  - does not open when the trigger is disabled

Validation:

```bash
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
apps/api/.venv/bin/python -m ruff check apps/api/app apps/api/tests
apps/api/.venv/bin/python -m pytest apps/api/tests
```

Result:

```text
web lint: passed
web test: passed, 6 files / 19 tests
web build: passed
api ruff: passed
api pytest: passed, 8 tests
```

Current limitations:

- Confirmation tests cover the shared dialog primitive, not full founder/schedule page flows.
- Role/profile completeness checks were still not enforced in this slice.
- Repository query scoping still lacks DB-backed integration tests.

Remaining next slice:

- Consider role/profile completeness checks before founder-only and respondent-only actions. Completed in the next slice.
- Add DB-backed repository/query tests when a local Postgres test strategy is available.
- Continue mobile and desktop visual QA on populated application/schedule states.

### 2026-05-19 Role And Profile Gate Slice

Completed:

- Added `CurrentAppUser` dependency that requires a synced Hypofit app profile in `app_users`.
- Added role guards:
  - `ensure_founder_role`
  - `ensure_respondent_role`
- Enforced founder role for:
  - interview post creation
  - interview post close
  - application status updates
  - session creation
  - founder-side session completion/no-show
- Enforced respondent role for:
  - application creation
  - respondent-side session completion/no-show
- Updated protected application/session list endpoints to require a synced app profile, not only a valid Supabase token.
- Expanded API authorization tests to cover:
  - missing synced Hypofit profile
  - founder role required for interview post creation
  - respondent role required for application creation
  - founder role required for session creation
  - respondent role required when the respondent completes a session

Validation:

```bash
apps/api/.venv/bin/python -m ruff check apps/api/app apps/api/tests
apps/api/.venv/bin/python -m pytest apps/api/tests
python3 -m compileall apps/api/app
cd apps/web
pnpm run lint
pnpm run test
pnpm run build
```

Result:

```text
api ruff: passed
api pytest: passed, 13 tests
api compileall: passed
web lint: passed
web test: passed, 6 files / 19 tests
web build: passed
```

Current limitations:

- Role checks use `app_users.role`; detailed founder/respondent profile tables are still not required because profile edit flows are not implemented yet.

Remaining next slice:

- Add profile table completeness requirements after founder/respondent profile edit flows exist.
- Continue mobile and desktop visual QA on populated application/schedule states.

### 2026-05-19 Repository Integration Test Slice

Completed:

- Added DB-backed integration tests for repository query scoping in `apps/api/tests/test_repository_scoping.py`.
- Tests use local Postgres through `TEST_DATABASE_URL` and are skipped by default when no test database is configured.
- Covered application list scoping for:
  - founder-owned interview posts
  - respondent-owned applications
  - nested respondent profile summaries
- Covered session list scoping for:
  - founder-owned interview posts
  - nested application and respondent data
- Covered context query joins used by service authorization:
  - application -> interview post
  - session -> application -> interview post
- Added `make test-api-integration` for local Docker Compose Postgres validation.
- Documented the integration test command in `README.md`.

Validation:

```bash
docker compose -f infra/docker-compose.yml up -d
TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/hypofit apps/api/.venv/bin/python -m pytest apps/api/tests/test_repository_scoping.py -q
```

Result:

```text
repository integration pytest: passed, 4 tests
```

Current limitations:

- Integration tests reset tables with SQLAlchemy metadata in the local test database. Do not point `TEST_DATABASE_URL` at Supabase production or any shared database.
- Role checks use `app_users.role`; detailed founder/respondent profile tables are still not required because profile edit flows are not implemented yet.

Remaining next slice:

- Add profile table completeness requirements after founder/respondent profile edit flows exist.
- Continue mobile and desktop visual QA on populated application/schedule states.

## Source References

- Tailwind CSS Vite installation: https://tailwindcss.com/docs/installation/using-vite
- Tailwind theme variables: https://tailwindcss.com/docs/theme
- Tailwind responsive design: https://tailwindcss.com/docs/responsive-design
- Tailwind adding custom styles: https://tailwindcss.com/docs/adding-custom-styles
- shadcn/ui Vite installation: https://ui.shadcn.com/docs/installation/vite
- Radix Primitives introduction: https://www.radix-ui.com/primitives/docs/overview/introduction
