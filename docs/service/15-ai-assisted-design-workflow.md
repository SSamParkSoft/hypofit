# AI-Assisted Design Workflow

Status: service-source-of-truth

Last updated: 2026-07-06

This document defines how Hypofit should use AI design tools, Figma MCP, image
generation, and reference research without losing product fit, brand identity,
accessibility, or implementation quality.

AI can accelerate exploration, but it is not the source of truth. The source of
truth remains Hypofit's product loop, real app state, design tokens, native
constraints, and shipped code.

## Why This Exists

Modern design tools can generate interface drafts, rewrite copy, populate
realistic content, search design assets semantically, and connect design files to
coding agents. That is useful for Hypofit because we need to move quickly.

The risk is that AI-generated UI often becomes:

- too generic,
- too card-heavy,
- visually polished but product-weak,
- inconsistent with existing app components,
- inaccessible,
- hard to implement in React Native,
- legally or ethically too close to a reference,
- disconnected from store-review requirements.

This workflow keeps AI useful without letting it steer the product.

## Current External Signals

Use these as background guidance, not as hard product requirements:

- Figma AI positions AI as a way to overcome blank-canvas work, generate first
  drafts, rewrite text, populate realistic content, search assets semantically,
  and eventually generate UI using design systems.
- Figma's AI material also emphasizes privacy and content-training controls.
  Do not paste secrets, production PII, private keys, tokens, or sensitive user
  data into AI design tools.
- Microsoft's HAX Toolkit frames human-AI design as early product planning:
  learn guidelines, plan with the team, design patterns, then prototype failure
  and recovery behavior.
- Human-AI design research repeatedly warns that AI output is variable and
  imperfect. Good design workflows preserve human judgment, multiple options,
  error recovery, and harm review.

## Hypofit AI Design Rule

AI may produce:

- references and pattern summaries,
- rough wireframes,
- first-pass Figma frames,
- copy alternatives,
- icon/logo directions,
- state matrix checklists,
- QA critique,
- code implementation scaffolds.

AI must not be accepted as final until a human or agent verifies:

- user job fit,
- screen state coverage,
- existing component fit,
- accessibility,
- safe-area and keyboard behavior,
- store-review-sensitive paths,
- brand distinctiveness,
- implementation feasibility,
- legal/IP safety.

## Required Workflow

### 1. Anchor In Product Job

Before asking AI to design, write the job in one sentence:

```text
For [user role], this screen helps them [job] during [workflow step].
```

Examples:

```text
For respondents, the interview detail screen helps them decide whether to apply
and submit only the information the founder needs.

For founders, the applicant screen helps them understand fit and continue to
chat, select, or reject without turning the page into an admin dashboard.
```

If the job is unclear, do not generate high-fidelity UI yet.

### 2. Gather References By Pattern, Not By Surface Copy

Use web references to identify:

- navigation pattern,
- list density,
- empty-state behavior,
- form structure,
- bottom sheet behavior,
- chat interaction,
- permission rationale,
- status badge style,
- profile/settings hierarchy.

Do not copy:

- exact layout,
- exact color palette,
- exact icon composition,
- exact copy,
- brand-specific visual signatures.

Write a short reference note:

```text
Reference insight:
- Source:
- Pattern to borrow:
- What not to copy:
- Hypofit adaptation:
```

### 3. Generate Multiple Directions

Ask AI for at least three directions when the screen is important:

- conservative native app pattern,
- dense operational pattern,
- brand-forward but still practical pattern.

Reject directions that rely on:

- big decorative cards,
- vague dashboard metrics,
- generic gradient backgrounds,
- excessive rounded pills,
- fake AI assistant panels,
- copy that explains the app instead of helping the current task.

### 4. Convert To Hypofit Components

Before implementing or pushing to Figma, translate the design into current
Hypofit primitives:

- row/list surface,
- full-screen task page,
- bottom sheet,
- modal/confirmation,
- primary/secondary/destructive button,
- badge,
- text field,
- search field,
- profile/avatar,
- notification button,
- map marker and preview.

If the design requires a new primitive, document why the existing primitives are
not enough.

### 5. Cover The State Matrix

Every AI-generated screen must be checked across:

- default,
- loading,
- empty,
- error,
- offline/API unavailable where relevant,
- permission denied,
- permission not requested,
- success/submitted,
- disabled/loading action,
- long Korean text,
- long names/titles,
- no profile image,
- keyboard open,
- small phone,
- Android and iOS differences where native behavior is involved.

For review-sensitive screens, also check:

- report/block path,
- support path,
- legal link path,
- account deletion path,
- privacy/permission copy.

### 6. Validate Implementation Fit

For `apps/mobile`:

- use NativeWind for static styling,
- use runtime `style` only for native measurements, animation, map, keyboard,
  pressed state, or safe-area values,
- avoid new screen-level `StyleSheet.create` unless justified,
- keep route files thin,
- keep reusable UI in `src/shared/ui`,
- preserve Expo Router navigation conventions,
- check safe-area and keyboard ownership.

For `apps/web`:

- use the web UI primitives,
- keep desktop and mobile layouts separate where needed,
- do not import RN/mobile UI patterns directly.

## Prompt Template

Use this structure for AI design prompts:

```text
Design task:
- Product: Hypofit, paid customer interview matching for founders/respondents.
- User role:
- Screen:
- Job to be done:
- Platform: Expo React Native iPhone/Android phone OR desktop web.
- Current shell:
- Primary action:
- Secondary actions:
- Required states:
- Existing components to reuse:
- Visual tone: practical, calm, trustworthy, row/list heavy, not dashboard-like.
- Copy tone: short natural Korean, Toss-like, action-oriented.
- Constraints:
  - no nested cards
  - no marketing hero inside app
  - safe-area and keyboard aware
  - store-review paths remain reachable
  - no payment guarantee language
  - no PII/secrets
- Output:
  - layout structure
  - component list
  - state matrix
  - implementation notes
  - QA risks
```

## Reference Research Prompt

```text
Research current mobile UI patterns for [screen type].
Focus on interaction patterns, hierarchy, density, empty/error states, and
accessibility. Do not copy visual design directly. Summarize what Hypofit should
borrow, avoid, and adapt for a Korean interview coordination app.
```

## AI Critique Prompt

```text
Critique this Hypofit screen as a senior mobile product designer.
Evaluate:
- product job fit
- hierarchy
- row/card/sheet choice
- Korean copy
- touch targets
- safe area and keyboard behavior
- accessibility
- store-review-sensitive affordances
- implementation feasibility in Expo React Native + NativeWind
- whether it looks generic or AI-generated
Return concrete fixes only.
```

## Brand And Originality Guardrails

AI-generated visuals must still feel like Hypofit:

- interview coordination,
- founder/respondent trust,
- practical reward/time/location clarity,
- calm green accent,
- restrained backgrounds,
- row/list clarity,
- no overdecorated AI SaaS look.

Avoid reference plagiarism:

- Do not reproduce another app's distinctive screen composition.
- Do not copy exact icon, mascot, palette, or illustration style.
- Use references to identify conventions, then rebuild with Hypofit's content
  hierarchy and components.
- Check font and icon licensing before shipping new assets.

## Data And Privacy Guardrails

Never put these into external AI tools:

- Supabase service role key,
- database URL/password,
- Sentry token,
- Apple `.p8`,
- FCM service account JSON,
- real user email/phone/name/chat,
- production support/report contents,
- private screenshots containing user data.

Use synthetic data that matches the product shape:

- realistic Korean names only when fake,
- plausible interview titles,
- plausible reward/time/location,
- fake chat snippets,
- fake support/report examples with no real PII.

## Common AI Design Failures To Reject

- Looks polished but does not answer the user's current question.
- Uses cards for every row.
- Creates dashboard metrics where users need actions.
- Uses too much green or a one-note palette.
- Hides legal/support/report/account deletion.
- Uses English or awkward Korean.
- Ignores long Korean text wrapping.
- Uses placeholder data that breaks trust.
- Creates unreachable bottom actions under the keyboard or home indicator.
- Generates Figma frames that are not componentized or named.
- Adds a new pattern when an existing app primitive exists.

## Done Criteria

AI-assisted design work is done only when:

- the product job is written,
- reference insights are summarized,
- at least one rejected direction or tradeoff is recorded for meaningful work,
- the chosen direction maps to existing Hypofit primitives,
- required states are covered,
- accessibility and safe-area risks are checked,
- implementation path is clear,
- no secrets/PII/reference copying risks remain.
