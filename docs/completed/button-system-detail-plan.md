# Hypofit Button System Detail Plan

Status: completed

Last updated: 2026-05-20

## Purpose

Hypofit needs button details that feel deliberate in both Figma and the Tailwind
implementation. The goal is not to make buttons decorative. The goal is to make
workflow actions instantly scannable across the MVP loop:

```text
founder creates interview post
  -> respondent applies
  -> founder reviews and selects applicant
  -> interview session is scheduled
  -> session is completed or marked no-show
```

This plan defines the practical button system to use in Figma first, then map
to `apps/web/src/shared/ui/button.tsx`.

## References Checked

### Apple Human Interface Guidelines

Source: https://developer.apple.com/design/human-interface-guidelines/buttons

Relevant takeaways:

- A button should clearly communicate style, content, and semantic role.
- Use a prominent visual style for the most likely action in a view.
- Keep prominent buttons limited, usually one or two per view.
- Use style, not inconsistent size, to distinguish primary vs secondary
  actions.
- Provide enough hit area. Apple recommends at least `44 x 44 pt`.
- Custom buttons need a visible pressed state.

### Material Design / Material Web Buttons

Source: https://material-web.dev/components/button/

Relevant takeaways:

- Button variants should express hierarchy: filled, tonal, outlined, text.
- Outlined buttons need a clear outline token, not a random gray border.
- Tonal buttons are useful as a middle-ground action between filled and
  outlined.
- Button shape, color, typography, and state should be tokenized.

### WCAG 2.2

Sources:

- https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- https://www.xrayd.io/blog/wcag-2-2-checklist

Relevant takeaways:

- Interactive targets should not be tiny. WCAG 2.2 AA adds target size
  guidance around `24 x 24 CSS px`, while mobile product practice should still
  aim higher.
- Focus indicators must be visible and should not rely on faint low-contrast
  borders.
- Non-text indicators such as borders, icons, and focus rings need enough
  contrast against adjacent colors.

### Hypofit Existing Implementation

Current button component:

- `apps/web/src/shared/ui/button.tsx`
- Variants: `primary`, `secondary`, `ghost`, `quiet`, `danger`
- Sizes: `sm`, `md`, `lg`, `icon`
- Current base: `rounded-hypo-lg`, `text-sm`, `font-bold`,
  `focus-visible:ring-[3px]`, disabled opacity.

Current tokens:

- `--radius-hypo-sm: 4px`
- `--radius-hypo-md: 6px`
- `--radius-hypo-lg: 8px`
- `--color-hypo-brand: #176b5d`
- `--color-hypo-brand-strong: #0f4f44`
- `--color-hypo-border: #dedbd2`
- `--shadow-hypo-focus: 0 0 0 3px rgb(23 107 93 / 0.18)`

## Product-Specific Button Roles

Hypofit buttons should be organized by workflow role, not only by color.

### Primary Action

Use for the one action that advances the current flow.

Examples:

- `신청서 작성`
- `모집글 게시`
- `선정`
- `일정 확정`
- `완료 처리`

Design:

- Fill: `hypo-brand`
- Text: white
- Hover: `hypo-brand-strong`
- Border: none
- Radius: `8px`
- Shadow: none by default; subtle elevation only for floating/sticky CTA.

Rule:

- One primary button per focused panel.
- In a dense table row, primary row action can appear repeatedly, but each row
  must keep the action area compact.

### Secondary Action

Use for a safe alternative action that does not commit the main workflow.

Examples:

- `상세`
- `미리보기`
- `일정 변경`
- `신청자 내보내기`

Design:

- Fill: white or surface
- Border: `hypo-border`
- Text: `hypo-text` or `hypo-brand`
- Hover: `hypo-brand-soft`
- Radius: `8px`

Rule:

- Secondary buttons can sit next to primary buttons, but should not compete
  visually.
- Use the same height as the paired primary button.

### Tonal Action

Use for contextual actions where filled primary is too strong but a plain
outlined button is too weak.

Examples:

- `가능 시간 선택`
- `신청서 보기`
- `프로필 확인`
- `조건 보기`

Design:

- Fill: semantic soft background, e.g. `brand-soft`, `info-soft`,
  `reward-soft`
- Border: transparent or same-family low-contrast border
- Text: matching semantic strong color
- Radius: `8px` or pill for filters

Rule:

- Use tonal buttons in cards and panels where action is important but not the
  single page-level commit.
- Do not use tonal style for destructive actions.

### Quiet / Ghost Action

Use for low-emphasis utility actions.

Examples:

- `취소`
- `닫기`
- `필터 초기화`
- mobile nav text actions

Design:

- Fill: transparent
- Border: none
- Text: muted or brand
- Hover: muted surface

Rule:

- Ghost buttons need enough hit area even if the visual looks minimal.
- Avoid ghost-only controls for important actions.

### Destructive Action

Use only where the action can negatively affect the workflow.

Examples:

- `반려`
- `노쇼 기록`
- `삭제`

Design:

- Fill for irreversible/high-risk: `hypo-danger`
- Text: white
- Hover: darker red
- Secondary destructive alternative: white fill, red border/text

Rule:

- Destructive actions should not sit as the visual default when paired with a
  positive action.
- Use confirm dialog for `노쇼 기록`, destructive delete, and similar trust
  signal changes.

## Button Sizes

### Mobile

Mobile PWA should prioritize easy touch.

- Primary CTA: height `44px` minimum.
- Sticky bottom CTA: height `48px`, horizontal padding `18-20px`.
- Compact card action: visual height can be `38-40px`, but touch target should
  still resolve to at least `44px` with surrounding space.
- Icon-only: `40px` visual minimum, `44px` hit target preferred.

### Desktop

Desktop can be denser but still needs clear affordance.

- Table row action: `36-40px` height.
- Panel primary: `40-44px` height.
- Toolbar button: `36-40px` height.
- Icon-only utility: `36-40px`.

### Current Code Mapping

Existing code:

```text
sm: min-h-9  = 36px
md: min-h-10 = 40px
lg: min-h-11 = 44px
icon: size-10 = 40px
```

Keep this mapping. Add usage guidance:

- Use `lg` for mobile primary CTA and sticky submit.
- Use `md` for normal panel buttons.
- Use `sm` only for dense desktop row actions.
- Use `icon` only with accessible label or visible tooltip.

## Border Rules

Borders are where many buttons start to look unpolished. Hypofit should use
border rules, not ad hoc lines.

### Default Border Width

- Standard outlined button: `1px`.
- Focus ring: `3px` outside ring.
- Selected segmented/pill control: `1px` border plus fill, not `2px` heavy
  border.
- Avoid `0.5px` because it renders inconsistently.

### Border Color

Use these rules:

- Neutral border: `hypo-border`.
- Strong neutral border for selected card-like controls: slightly darker token,
  future token candidate `hypo-border-strong: #c8c0b1`.
- Brand selected border: `hypo-brand`.
- Danger outline: `hypo-danger`.

Avoid:

- Very faint gray border on white when it is the only affordance.
- Same-color border and background on a secondary button.
- Using borders to encode too many semantic states.

### Border Radius

Use current repo tokens:

- Button: `8px`.
- Small dense icon/action button: `6px` if inside table row.
- Filter chips and status pills: full pill radius.

Do not use very large rounded rectangles for core buttons unless the control is
a chip/filter. Hypofit is an operational product, so button shape should feel
calm and work-focused.

## State Model

Every button variant must have the following states in Figma and code.

### Default

Clear shape, label, and role.

### Hover

Desktop only visual affordance:

- Primary: darken fill.
- Secondary: soft brand background.
- Ghost: muted surface.
- Danger: darken red or use danger-soft for outline danger.

### Pressed

Required for custom buttons.

Recommended:

- Slight translate-down is optional in code, but not necessary.
- Prefer color darkening and optional inner shadow in Figma.
- Do not resize the button on press.

### Focus Visible

Keyboard focus must be obvious.

Recommended:

- `3px` ring.
- Ring color: brand with alpha or future solid accessible focus token.
- Use `focus-visible`, not always-on focus.

Current implementation already uses:

```text
focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20
```

Potential improvement:

- Add `focus-visible:ring-offset-2`
- Offset color should match page/surface.

### Disabled

Disabled should communicate unavailable, not look broken.

Current implementation:

```text
disabled:pointer-events-none disabled:opacity-55
```

Refinement:

- Keep opacity, but avoid disabled primary becoming too low contrast in Figma.
- Use disabled only when reason is visible nearby.
- For business-rule-disabled states such as closed post, show an explanatory
  note.

### Loading

Needed for API mutations.

Design:

- Same width and height as default.
- Replace leading icon with spinner or show spinner before label.
- Label can become `처리 중`.
- Do not collapse text width after loading starts.

Implementation plan:

- Add optional `isLoading` prop later if repeated loading patterns increase.
- For now, keep per-callsite disabled text stable.

## Hypofit Button Inventory

### Respondent Flow

Explore:

- Card action: `상세 보기`
  - variant: secondary or tonal
  - size: sm desktop, md mobile

Detail:

- `신청서 작성`
  - variant: primary
  - size: lg mobile sticky, md desktop panel

Application:

- `가능 시간 선택`
  - variant: primary if selected state needs action
  - variant: tonal if only opens time selector

### Founder Flow

Post creation:

- `모집글 게시`
  - variant: primary
  - size: lg mobile, md desktop
- `미리보기`
  - variant: secondary

Applicant review:

- `선정`
  - variant: primary
  - size: sm in desktop row, md on mobile card
- `반려`
  - variant: secondary destructive or quiet danger
  - confirm required if final
- `상세`
  - variant: secondary

Schedule/session:

- `완료 처리`
  - variant: primary or success-tonal if success variant is added
- `노쇼 기록`
  - variant: danger
  - confirm required
- `일정 변경`
  - variant: secondary

## Figma Work Plan

### 1. Create Button Reference Block

Add a button detail board near the current high-fidelity section:

```text
HF Button System / Detail Spec
```

Include:

- Primary
- Secondary
- Tonal
- Ghost
- Danger
- Icon
- Filter chip
- Disabled
- Loading
- Focus visible

Each button should show:

- default
- hover
- pressed
- disabled
- focus

### 2. Add Border/State Notes

For each variant, annotate:

- fill
- text color
- border color
- border width
- radius
- height
- usage examples

### 3. Apply to Existing Figma Frames

Do not redesign every screen again. Apply button rules:

- Keep existing mobile frames.
- Normalize button heights.
- Make primary actions consistent.
- Reduce multiple filled buttons in the same panel.
- Make destructive actions red only when final/high-risk.
- Convert low-priority actions to secondary/ghost.

### 4. Desktop Web Console Refinement

For `HF Web Unified Workspace v3 / Research Ops Console`:

- Use primary only for `모집글 만들기`, `모집글 게시`, selected row `선정`.
- Use secondary for `상세`, `미리보기`, `일정 변경`.
- Use danger for `노쇼 기록`.
- Add focus state sample in reference board, not necessarily visible in final
  screen.

## Tailwind Implementation Plan

Current implementation should be extended conservatively.

### Keep

- `class-variance-authority`
- shared `Button`
- current variants unless a concrete screen requires more
- radius tokens
- Tailwind token-based styling

### Add Candidate Variants

Implemented in `apps/web/src/shared/ui/button.tsx`:

```text
tonal
outlineDanger
success
```

Suggested mapping:

```text
tonal:
  bg-hypo-brand-soft text-hypo-brand hover:bg-[#dbece7]

outlineDanger:
  border border-hypo-danger/35 bg-hypo-surface text-hypo-danger
  hover:bg-hypo-danger-soft

success:
  bg-hypo-success text-white hover:bg-green-800
```

### Improve Focus

Implemented:

```text
focus-visible:ring-[3px]
focus-visible:ring-hypo-brand/25
focus-visible:ring-offset-2
focus-visible:ring-offset-hypo-bg
```

For buttons on white panels, override offset color if needed.

### Improve Loading Later

Do not add a loading abstraction until at least three callsites need it.

When added:

```tsx
<Button isLoading loadingLabel="처리 중">
  선정
</Button>
```

Requirements:

- `aria-busy`
- preserve width
- disabled while loading
- spinner hidden from screen readers

## QA Checklist

Figma QA:

- One primary button per panel unless each repeated row has its own contained
  workflow.
- Button labels fit Korean text at mobile width.
- Destructive actions are not visually dominant over positive actions.
- Secondary buttons remain visible on white cards.
- Focus state exists in the spec board.
- Disabled state includes nearby reason text.

Code QA:

- `Button` variants remain token-based Tailwind.
- No hardcoded production colors inside feature files.
- Icon-only buttons have accessible names.
- Button height does not change between default, disabled, and loading states.
- Keyboard focus is visible.

Validation commands after implementation:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web lint
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web test
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build
```

## Open Decisions

- `tonal`, `outlineDanger`, and `success` are now first-class code variants.
- Final Figma font replacement remains manual because Figma MCP cannot load
  local desktop fonts reliably.
- Product callsites still need a follow-up pass to replace ad hoc variant usage
  with the new semantic variants where appropriate.

## Implementation Progress

Completed on 2026-05-20:

- Added A2Z webfont files under `apps/web/public/fonts/a2z/`.
- Updated global font tokens so `A2Z` is the first `font-sans` and
  `font-brand` family.
- Updated shared `Button` focus styling with ring offset.
- Added `tonal`, `outlineDanger`, and `success` variants.
- Added Figma board `HF Button System / Detail Spec`.
- Applied the button system to Figma mobile frames:
  - mobile button frames normalized to `44px` visual height
  - primary, secondary, tonal, success, danger, and outline danger treatment
    applied by workflow role
- Applied the button system to the Figma web console:
  - panel and toolbar actions normalized to `40px`
  - dense row actions normalized to `36px`
  - secondary web actions corrected so export, preview, schedule check, and
    schedule change do not compete with primary actions
- Fixed Figma button alignment and auto-layout issues after QA:
  - audited all `19` mobile `Button / ...` frames
  - converted remaining mobile absolute-position buttons to horizontal
    Auto Layout with `CENTER / CENTER` alignment
  - corrected mobile text centering so every audited button label reports
    center delta `dx=0`, `dy=0`
  - removed mobile requirement note overlays that were sitting inside product
    screens and causing visual collisions
  - adjusted `Mobile Explore` card spacing so the last card clears the fixed
    bottom navigation by `21px`
  - converted `19` high-fidelity web rectangle/text button pairs into real
    Auto Layout button frames
  - verified the high-fidelity web frame has `0` leftover rectangle-based
    `Button / ...` nodes and `0` centering problems
