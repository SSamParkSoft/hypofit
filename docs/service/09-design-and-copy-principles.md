# Design And Copy Principles

Status: service-source-of-truth

Last updated: 2026-08-26

## Design Direction

Hypofit should feel like a polished, mobile-first recruitment and participation
coordination app. An interview is one posting type, not the product-wide noun.
It should be practical, dense enough for repeated use, and calm.

Avoid making it look like:

- a SaaS analytics dashboard on mobile,
- a generic card-heavy AI mockup,
- a marketing landing page,
- a decorative social app,
- a form dump.

## Mobile First

Most founders and respondents will use the interview workflow on a phone.
Optimize native mobile first for:

- thumb reach,
- safe area,
- keyboard behavior,
- bottom navigation,
- chat composer,
- map gestures,
- permission prompts,
- short copy,
- fast status recognition.

Tablet/iPad layouts are not the primary target unless explicitly requested.

## Layout Rules

- Prefer row/list surfaces for repeated operational data.
- Use cards only when a surface needs clear grouping, decision emphasis, or
  repeated independent items.
- Avoid nesting cards inside cards.
- Avoid huge dashboard-style metric cards unless the screen is genuinely a
  dashboard.
- Keep bottom navigation reserves centralized.
- Full-screen surfaces must own scroll intentionally: either the page scrolls or
  an internal list scrolls.
- Chat thread should hide bottom tab navigation and reserve space for the
  composer.
- Map surfaces should avoid competing scroll and drag gestures.

## Safe Area And Viewport

Every fixed header, footer, bottom sheet, map overlay, modal, and composer must
account for notches, dynamic island, rounded corners, and home indicator areas.

Do not add per-screen magic offsets for bottom navigation or safe areas unless
the reason is documented. Use shared app-shell helpers and existing tokens.

## Typography

Use Spoqa Han Sans Neo consistently across the React web and Expo mobile app.
The web serves WOFF2 files generated from the same Regular, Medium, and Bold
sources bundled by the mobile app. Text hierarchy should be obvious through
size, weight, and color:

- screen title: compact but clear,
- row title: strong,
- metadata: smaller and muted,
- status: badge or concise text,
- body/explanation: readable, not overlong.

Do not use hero-scale type inside compact panels.

## Color

Use Hypofit's green as the primary action/accent color, not as a one-note theme
that dominates every surface. Keep backgrounds quiet and preserve contrast.

## Brand Identity

Hypofit's current brand mark is the `Fit Node`:

```text
founder form + real customer signal + respondent form
```

The mark can also read as a restrained `H`, but the product meaning comes
first. Use the canonical runtime SVG
`apps/web/public/brand/hypofit-mark.svg` as the source of truth for exported
brand assets.

The Calm Emerald Native mobile tokens are:

- app canvas `#F6F7F8`,
- brand green `#0F7A4D`,
- stronger green `#0B5C3A`,
- brand soft `#E8F4EC`,
- accent `#B7FF5A` for tiny active indicators only.

Do not use brand color as generic decoration or status color. Preserve explicit
success, warning, and destructive semantics.

Keep `Hypofit` as live text in product headers when possible. Use the horizontal
logo asset only where a fixed brand lockup is actually needed.

Status colors should help recognition:

- positive/completed,
- pending,
- warning/problem,
- rejected/blocked.

Never rely on color alone for critical status.

## Buttons And Controls

- Use concrete labels: `신청하기`, `저장하기`, `제출하기`, `채팅 보기`.
- Prefer icons for familiar controls like back, notification, send, more.
- Keep destructive actions visually distinct and confirmed.
- Avoid vague `확인` when the action is specific.

## Korean Copy Tone

Use a Toss-like product tone:

- short,
- natural,
- user-centered,
- action-oriented,
- calm.

Prefer:

- `소중한 의견 감사합니다`
- `로그인을 완료하지 못했어요. 같은 방법으로 다시 시도해 주세요.`
- `신청이 완료됐어요`

Avoid:

- technical implementation terms,
- stiff admin wording,
- long explanations,
- excessive nouns,
- blame-oriented error copy.

## Empty, Loading, Error

Empty states should state the situation first and suggest the next useful action
only when helpful.

Loading states should not block forever. Release builds need watchdog and
diagnostics for startup/auth/API readiness failures.

Errors should preserve enough diagnostic codes for Sentry and support while
showing users calm, non-technical messages.

## Screen-Specific Guidance

### Home

Home should orient the user around the next action, then show useful posting
discovery. It should not duplicate the full posting search screen.

### Postings

The postings tab is the detailed search and browse surface. Rows should be
compact and scannable. Use the detail screen for sustained reading and applying.

### Map

The map should prioritize location discovery. Search, current location,
markers, and list/bottom sheet behavior must not fight each other.

### Chat

Chat should feel close to familiar iOS/DM patterns but expose workflow actions
only when the posting type supports them. Time, unread, status, and counterpart identity should be
visible without bloating each row.

### Profile

Profile should be settings-like, row-based, and direct. Legal, support, report,
notification, account, role, and deletion paths must be easy to find.
