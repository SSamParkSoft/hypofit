# Landing Page And Store Creative Production Plan

Status: active

Last updated: 2026-08-12

Shared web history, scroll, focus, route transition, and reduced-motion
implementation history is recorded in
`docs/completed/web-navigation-motion-system-plan.md`. This plan
continues to own landing content, layout, responsive composition, and creative
assets.

The focused Brainwave-inspired public landing reconstruction is executed through
`docs/active/brainwave-inspired-landing-visual-reconstruction-plan.md`. That plan
owns the current section-by-section visual implementation; this document remains
the broader authority for public creative truth, store assets, capture systems,
SEO, performance, and release-asset QA.

## Current Implementation Progress

Updated 2026-08-18:

- Public landing draft implemented at `/`.
- Outreach-only landing variant implemented at `/landing`; it reuses the
  approved public composition without exposing web login or dashboard entry.
- Existing authenticated web product root separated to `/app`.
- Existing interview, map, chat, profile, legal, support, account-deletion, and
  auth-callback routes retained.
- Participant recruitment-and-participation message, organizer/participant audience split, conditional four-step workflow, product proof,
  trust/safety, final CTA, and legal footer implemented.
- Public positioning now includes customer validation, product/user research,
  and academic or field-research interview use cases without claiming survey
  creation, research-compliance tooling, AI matching, or payment guarantees.
- Official Apple App Store badge and live App Store listing linked.
- Mobile landing now uses Google's official localized Korean Google Play badge
  and links to the configured Play listing alongside the official App Store
  badge. Confirm public listing reachability before the production launch.
- Basic SEO, Open Graph, Smart App Banner, robots, and sitemap metadata added.
- The new Fit Node brand family is now wired into the public web surfaces:
  landing, legal, support, account-deletion, auth entry, and web app shell all
  read the current `hypofit-mark` or `hypofit-mark-inverse` assets instead of
  the older speech-bubble/checkmark mark.
- The public web icon/share layer now uses the same brand export pipeline as
  mobile:
  - `apps/web/scripts/export-brand-assets.mjs`
  - favicon SVG/PNG/ICO
  - regular and maskable PWA icons
  - Apple touch icon
  - `brand/hypofit-social-1200x630.png`
- `apps/web/index.html`, `manifest.webmanifest`, and
  `public/service-worker.js` now reference the current Fit Node asset family,
  and the service-worker shell cache namespace is `hypofit-shell-v2`.
- Landing and route-helper tests plus TypeScript validation added.
- Local and Vercel production builds passed, and the approved production
  deployment is live at `https://hypofit.bukae.co.kr` under the
  `ssamso8282@gmail.com` Vercel account.
- `/`, `/app`, privacy, account-deletion, robots, and sitemap production paths
  returned HTTP 200 after deployment.
- Mobile landing is now a separate composition under
  `apps/web/src/features/landing/MobileLanding.tsx`, while sharing product copy
  and links with desktop. It includes a compact safe-area header, shortened
  first viewport, founder/interviewer role tabs, horizontal snap product tour,
  compact vertical workflow, settings-style trust rows, mobile download CTA,
  and safe-area footer. The phone composition is selected below `768px`; from
  `768px`, the responsive web composition provides the compact/tablet fallback
  and progressively reaches the two-column desktop layout. Only the selected
  composition is rendered, so phone and web product-preview trees are not
  duplicated in the DOM.
- Mobile landing keeps app installation as its primary entry, uses a real
  `main` landmark, increases small user-facing support/legal text, and provides
  mandatory carousel snapping with accessible slide controls and progress.
- Desktop and mobile landing footers now share the confirmed corporate operator
  information for `주식회사 콘텐츠럭`, including representative, business
  registration number, business address, and support email.
- Landing tests now lock the single-tree phone/compact-web breakpoint behavior,
  login/legal links, role switching, product truth, and main landmark.

The current product visuals are code-rendered first-draft representations based
on shipped mobile screens. They are not final store screenshots. Replace them
with reviewed, privacy-safe release-build captures before final landing approval
and store asset production.

Still open:

- visual review in a connected browser across the canonical viewport matrix,
- final art direction approval,
- installed PWA/browser cache update behavior review after the new brand rollout,
- real iOS/Android source captures,
- final Android release-candidate source captures,
- Google Play source replacement and final upload review.

Store creative update, 2026-08-12:

- Added the internal HTML/CSS renderer under `tools/store-creative/`.
- Added deterministic local Chrome export through
  `corepack pnpm store:creative:export`; the script produces and validates
  three Apple `1320 x 2868` PNGs, four Play `1080 x 1920` PNGs, and one
  README `2400 x 1260` 2x PNG.
- Implemented the approved Play four-frame story: core value, discovery/map,
  chat coordination, and progress tracking. Apple retains the approved
  three-frame set.
- Replaced the logo-only README social panel with the generated product
  showcase image.
- Verified exact dimensions and no alpha channel across all seven outputs.
- Apple and README assets use the public iOS `1.0.0` App Store captures.
- Google Play composition is complete, but its current source screens are
  layout-review placeholders. Replace them with Android release-candidate
  captures before Play Console upload; do not submit iPhone status-bar imagery
  as the final Android set.

## 1. Purpose

Build Hypofit's public web landing page and a coherent set of App Store and
Google Play preview assets from one brand, message, and production system.

This plan covers executable work for:

- a public desktop/mobile landing page in `apps/web`,
- App Store iPhone screenshots,
- Google Play phone screenshots,
- the Google Play feature graphic,
- reusable HTML/CSS creative templates and Playwright export rules,
- deterministic demo data and screen-capture preparation,
- AI-assisted exploration, production, and critique,
- accessibility, performance, legal, and store-policy QA.

This plan does not cover Play Console authentication, AAB production/upload,
or console-side asset entry. Those operations remain deferred until Play
Console access is available. Asset strategy and production can proceed now.

## 2. Product Job

The public creative system must explain one product loop:

```text
organizer describes the purpose, participant conditions, and interview
  -> a matching respondent discovers and applies
  -> both sides coordinate in chat
  -> the interview is completed and recorded as a workflow outcome
```

Primary audience jobs:

- Organizer: `고객 검증, 사용자 조사 또는 연구 목적에 맞는 참여자를 찾고 인터뷰하고 싶다.`
- Participant: `내 경험과 조건에 맞는 인터뷰를 찾고 참여하고 싶다.`

The public promise must stay narrower than the implementation:

- Hypofit helps users discover, apply to, and coordinate customer interviews.
- Hypofit does not currently guarantee reward payment, escrow, settlement,
  identity verification, attendance, or interview quality.
- Do not market AI matching, payment protection, recording, transcription, or
  automated research analysis because those are not current product features.

## 3. Source Of Truth

Use these sources in this order:

1. Shipped Expo app behavior under `apps/mobile`.
2. `docs/service/01-product-philosophy.md`.
3. `docs/service/02-users-and-jobs.md`.
4. `docs/service/03-core-workflows.md`.
5. `docs/service/04-feature-map.md`.
6. `docs/service/09-design-and-copy-principles.md`.
7. `docs/service/14-design-system-and-screen-patterns.md`.
8. `docs/service/15-ai-assisted-design-workflow.md`.
9. Current store-readiness and metadata references under `docs/reference/`.

Never use an old Figma frame, historical PWA screen, generated mockup, or
stale screenshot as evidence that a feature exists.

## 4. Current Repository Findings

Current web state:

- `apps/web` is a React/Vite/TypeScript application deployed manually to
  Vercel.
- `/` is the public landing route, and `/app` is the authenticated web product
  root.
- Public routes already exist for privacy, terms, account deletion, support,
  install guidance, and auth callback handling.
- The current public brand system lives under `apps/web/public/brand` and
  `apps/web/public/icons`, with deterministic generation through
  `apps/web/scripts/export-brand-assets.mjs`.
- Open Graph now points at the generated
  `apps/web/public/brand/hypofit-social-1200x630.png` asset.
- PWA shell assets are versioned through `apps/web/public/service-worker.js`
  cache namespace `hypofit-shell-v2`.
- The React web and native mobile app now both use Spoqa Han Sans Neo. The web
  serves WOFF2 files generated from the same Regular, Medium, and Bold source
  files bundled by the mobile app.
- The web UI already has Hypofit color tokens, route separation, and a public
  landing structure, but store-creative capture and export work is still open.

Current mobile source material:

- Home, interview search/detail/application, map, chat, notifications, founder
  management, profile, support, report, and account deletion screens exist.
- Real reviewer/demo data infrastructure exists and must be preferred over
  manually painted UI.
- iOS is phone-only (`supportsTablet: false`), so iPad screenshot production is
  not part of this plan.
- Android phone assets can be designed before AAB/Play Console access, but final
  captures must be refreshed from the release candidate later.

## 5. Official Platform Constraints

Official sources checked on 2026-07-12:

- Apple screenshot upload rules:
  https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots
- Apple screenshot dimensions:
  https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- Apple App Review Guidelines, especially metadata sections 2.3.3 and 2.3.4:
  https://developer.apple.com/app-store/review/guidelines/
- Apple App Store marketing identity and badge rules:
  https://developer.apple.com/app-store/marketing/guidelines/
- Google Play preview asset requirements:
  https://support.google.com/googleplay/android-developer/answer/9866151
- Responsive image performance guidance:
  https://web.dev/articles/serve-responsive-images
- Tailwind mobile-first responsive design:
  https://tailwindcss.com/docs/responsive-design
- Playwright deterministic screenshot capture:
  https://playwright.dev/docs/screenshots
- Figma's code-first prototype-to-canvas workflow:
  https://help.figma.com/hc/en-us/articles/40219873508247-Release-notes-roundup-May-2026

### 5.1 App Store Screenshots

- Provide between 1 and 10 screenshots per supported display set.
- Use PNG, JPG, or JPEG. Prefer PNG for UI fidelity.
- Prepare the modern 6.9-inch iPhone portrait set first.
- Accepted current 6.9-inch portrait sizes include:
  - `1260 x 2736`,
  - `1290 x 2796`,
  - `1320 x 2868`.
- App Store Connect can scale the highest required resolution to smaller
  displays when the interface is the same.
- Screenshots must show the app in use. Do not submit a set made primarily of
  splash, login, title art, or generated marketing scenes.
- Text overlays are allowed, but the underlying app experience must be real and
  accurate.
- Screenshots and previews must not claim unavailable features or misleading
  terms.
- App preview videos are optional. They are deferred until the still-image set
  is complete and stable.

### 5.2 Google Play Assets

- Provide at least two screenshots to publish a store listing.
- Phone screenshots may be PNG or JPEG without alpha.
- Each screenshot dimension must be between `320 px` and `3840 px`; the longest
  side may not be more than twice the shortest side.
- Up to eight screenshots can be supplied per supported device type.
- Use a consistent portrait `9:16` master, recommended here as `1080 x 1920`,
  for the initial phone set.
- The feature graphic must be a `1024 x 500` JPEG or 24-bit PNG without alpha.
- Keep critical feature-graphic content near the center because Play may crop or
  overlay it in different placements.
- Do not put store badges, rankings, awards, prices, discounts, testimonials, or
  time-sensitive claims into the feature graphic.
- Google recommends that the feature graphic extend the brand rather than
  repeat an oversized app icon.
- Add meaningful alt text, no more than 140 characters, to each uploaded asset.

## 6. Creative Strategy

### 6.1 Core Message

Brand headline:

```text
Hypofit
```

Primary supporting message:

```text
필요한 사람과 만나 인터뷰로 답을 찾으세요
```

Organizer-specific supporting message:

```text
목적과 조건에 맞는 참여자를 찾고, 신청부터 일정까지 한곳에서 조율하세요.
```

Respondent-specific supporting message:

```text
내 경험에 맞는 인터뷰를 찾고, 조건을 확인한 뒤 간단히 신청하세요.
```

Copy rules:

- Keep one sentence to one job.
- Prefer concrete verbs: `찾기`, `신청하기`, `조율하기`, `관리하기`.
- Do not use `혁신적인`, `완벽한`, `최고의`, `AI 기반`, or unsupported
  superlatives.
- Use `사례비` only as a condition written by the interview host. Never imply
  that Hypofit holds, guarantees, pays, or refunds it.
- Use the current Toss-like Korean tone: short, calm, direct, and user-centered.

### 6.2 Visual Direction

Hypofit public creative should be:

- trustworthy rather than playful,
- contemporary without generic AI gradients,
- grounded in real app UI,
- green-accented but not monochrome,
- quiet enough that Korean copy and real app states remain legible,
- visually distinct from a SaaS dashboard or job marketplace.

Use:

- Hypofit green for action and brand recognition,
- neutral white/gray surfaces for readability,
- restrained supporting colors for reward, location, chat, and status,
- real app screenshots as the primary product evidence,
- subtle depth only where it clarifies foreground/background separation.

Avoid:

- floating decorative cards with no product meaning,
- gradient orbs and bokeh decoration,
- fake testimonials or fake download counts,
- stock photography that hides the actual product,
- AI-generated people presented as real users,
- screenshots placed in unauthorized or inaccurate Apple device renders,
- one composition copied directly from another product.

### 6.3 Typography Decision

Spoqa Han Sans Neo is the canonical Hypofit product and marketing typeface.
React web, public landing, store creative, and Expo mobile should use the same
Regular, Medium, and Bold source family. Platform-appropriate file formats are
allowed: mobile bundles TTF and web serves WOFF2.

Confirm Korean, Latin, number, punctuation, bold-weight, line-height, and
fallback behavior before approving final marketing or store compositions.

## 7. Landing Page Information Architecture

### 7.1 Route Decision

Target routing after implementation:

```text
/                         public landing page
/landing                  outreach landing without web auth entry
/app                      existing web product/auth fallback
/legal/privacy            public privacy policy
/legal/terms              public terms
/account-deletion         public account deletion
/support                  public support entry
/install                  legacy PWA/install fallback
```

Implementation must introduce an explicit public-route/product-route boundary
instead of adding more conditions to the current large path switch indefinitely.

Compatibility requirements:

- Existing legal, deletion, support, and auth callback URLs must not break.
- Existing product deep links must keep working.
- Internal web app navigation must use `/app` as its canonical root after the
  migration.
- Review and production links must be checked before Vercel deployment.
- The native app remains the primary mobile product; the landing page must not
  turn the web product into the source of truth for native UI.

### 7.2 Header

Include:

- Hypofit wordmark,
- concise anchor navigation on desktop,
- a compact mobile menu only if the anchors do not fit,
- App Store CTA,
- Google Play CTA only when its public listing is available.

Do not show a dead Google Play badge. Before Play launch, use a neutral
`Android 출시 준비 중` text state or omit the CTA entirely.

### 7.3 Hero

The first viewport must establish the product immediately:

- H1: `Hypofit`.
- Supporting value proposition below the brand name.
- Primary CTA: official App Store badge linked to the live product page.
- Secondary CTA: `서비스 살펴보기` anchor or web app entry where useful.
- Product evidence: one strong, real mobile app composition showing interview
  discovery or the founder/respondent loop.
- A hint of the next section must remain visible on common desktop and phone
  viewports.

The hero must not be a split card layout or a generic illustration. The product
screen should feel integrated into the hero background while remaining
inspectable and readable.

### 7.4 Audience Band

Use a full-width band with two clear roles, not nested cards:

- `인터뷰 모집자`: participant recruitment and applicant coordination for
  customer validation, user research, and academic or field interviews.
- `인터뷰 참여자`: relevant opportunity discovery and application.

Each side gets one job sentence and one real interface crop. This section must
make it clear that one account can use both roles without presenting Hypofit as
a two-sided employment marketplace.

### 7.5 Workflow Story

Show a compact four-step flow:

1. 조건이 분명한 인터뷰를 만들거나 찾기.
2. 경험과 가능한 시간을 바탕으로 신청하기.
3. 채팅에서 일정과 방식을 조율하기.
4. 인터뷰 진행 상태를 끝까지 확인하기.

Use real UI fragments or restrained icons. Do not use oversized process cards.

### 7.6 Product Proof Bands

Use alternating, unframed page bands:

- Interview discovery: search, filters, reward, mode, and target customer.
- Map discovery: current location, place search, markers, and nearby list.
- Chat coordination: interview context, unread state, schedule, and workflow.
- Organizer management: post state, applicants, preview/edit, and chat entry.

Every section must answer:

- What can the user do?
- Which real screen proves it?
- What happens next?

### 7.7 Trust And Safety

Include a compact trust section covering only implemented behavior:

- clear interview conditions before applying,
- report and block paths,
- support inquiry,
- account deletion and privacy policy,
- no claim of payment guarantee.

This is not a security certification section. Do not show shields, compliance
badges, or legal guarantees the service has not earned.

### 7.8 Final CTA And Footer

Final CTA:

- repeat the primary value proposition,
- use the official App Store badge,
- add Google Play only when live,
- optionally include a QR code generated from the canonical store link.

Footer:

- provider/operator information already confirmed in legal documents,
- privacy policy,
- terms,
- account deletion,
- support email/link,
- copyright line,
- no unsupported social links.

## 8. Landing Page Engineering Plan

### 8.0 Production Medium Decision

Use a code-first workflow.

Landing page:

- implement directly in the existing React/Vite application,
- use Tailwind CSS 4 and existing Hypofit web tokens,
- do not create a separate plain-HTML prototype that must later be rewritten,
- review the running page at real responsive widths.

Store creative:

- compose fixed-size assets in a small internal HTML/CSS renderer,
- inject real iOS/Android source captures as immutable images,
- use CSS variables for brand colors, typography, safe areas, and platform
  canvases,
- export deterministic PNG files through Playwright at exact viewport sizes,
- keep the HTML/CSS renderer as the reproducible source for exported assets.

Why this is the default for Hypofit:

- Codex can edit, inspect, and compare the actual markup and tokens.
- Responsive behavior can be tested rather than inferred from static frames.
- Korean copy, sequence changes, and platform size variants remain cheap.
- Playwright can reproduce exact exports after source screenshots change.
- The same approved brand variables can drive landing and store assets.

Do not interpret code-first as design-free. Direction selection, composition,
copy hierarchy, visual QA, and human approval still happen before production
exports.

### 8.1 Component Boundary

Create a public marketing module rather than placing the whole page in one
component. Expected direction:

```text
apps/web/src/pages/LandingPage.tsx
apps/web/src/features/landing/
  components/
  content.ts
  storeLinks.ts
apps/web/public/landing/
  source/
  responsive exports
```

Use shared web buttons and tokens where they fit, but do not reuse operational
app-shell navigation for the landing page.

### 8.2 Asset Handling

- Keep original lossless captures outside runtime bundles when practical.
- Export landing images as AVIF/WebP plus a PNG/JPEG fallback where needed.
- Provide responsive `srcset`/`sizes` candidates for large product imagery.
- Set intrinsic width/height or aspect ratio to prevent layout shift.
- Preload only the actual hero/LCP asset.
- Lazy-load below-the-fold imagery.
- Do not ship App Store master PNG files directly when a smaller web derivative
  is sufficient.

### 8.3 SEO And Sharing

Add and verify:

- unique landing title and meta description,
- canonical URL,
- Open Graph title, description, image, and URL,
- Twitter/X card metadata if a shared card is useful,
- `SoftwareApplication` structured data only with accurate store URLs and
  platform availability,
- `robots.txt` and sitemap behavior,
- favicon/app icon consistency,
- Korean `lang` and meaningful document outline.

Do not publish a Google Play URL or availability claim before the listing is
public.

### 8.4 Accessibility

- One H1 and a logical heading hierarchy.
- Keyboard-reachable navigation and CTA controls.
- Visible focus states.
- Sufficient text/background contrast.
- Alt text that describes product evidence, not decorative framing.
- Decorative images use empty alt text.
- Motion respects `prefers-reduced-motion`.
- Store badges retain their official accessible labels.
- QR code is never the only path to the store.

### 8.5 Performance Budget

Initial acceptance targets for the production landing route:

- No runtime dependency added only for decorative animation.
- Hero/LCP asset has responsive variants and a deliberate preload strategy.
- No autoplay video in the first implementation.
- No layout shift from missing image dimensions.
- Landing JS stays isolated from authenticated product pages where practical.
- Run a production Vite build and inspect the landing route on mobile and
  desktop before deployment.

Analytics are not part of the first implementation. Adding analytics requires
a separate data-collection decision and privacy-label/policy review.

## 9. Store Screenshot Narrative

Produce a seven-frame Korean master sequence. The first three frames must work
as a coherent story without requiring the user to swipe further.

### Frame 1: Core Value

Overlay candidate:

```text
필요한 사람과 만나 인터뷰로 답을 찾으세요
```

Use:

- home/recent interview or interview discovery screen,
- realistic interview rows,
- Hypofit identity visible without oversized logo repetition.

Purpose:

- explain the product category in one glance,
- avoid splash/login as the first asset.

### Frame 2: Find The Right Interview

Overlay candidate:

```text
조건에 맞는 인터뷰를 한눈에 찾아보세요
```

Use:

- interview search,
- search field and selected filters,
- readable target, mode, reward, and location information.

### Frame 3: Location Discovery

Overlay candidate:

```text
지도에서 가까운 인터뷰를 살펴보세요
```

Use:

- stable map state,
- current-location marker,
- interview markers,
- bottom sheet in a deliberate resting state.

Do not capture permission prompts, map errors, loading copy, or arbitrary test
coordinates.

### Frame 4: Apply With Context

Overlay candidate:

```text
경험과 가능한 시간을 간단히 전하세요
```

Use:

- interview detail plus application entry,
- founder summary and clear interview conditions,
- no keyboard covering the CTA.

### Frame 5: Coordinate In Chat

Overlay candidate:

```text
신청 이후 일정과 방식은 채팅에서 조율해요
```

Use:

- realistic two-sided chat,
- interview context,
- date/system message treatment,
- no real personal data.

### Frame 6: Organizer Workflow

Overlay candidate:

```text
모집글과 지원자를 한곳에서 관리하세요
```

Use:

- organizer post management,
- applicant list or application information,
- status and chat entry.

### Frame 7: Progress And Trust

Overlay candidate:

```text
진행 상태와 중요한 소식을 놓치지 마세요
```

Use:

- my interviews or notification center,
- several realistic states,
- calm, legible status hierarchy.

Optional compliance/support asset:

- profile/settings showing report, support, legal, and deletion paths.
- Keep this out of the first three conversion-focused frames.

## 10. Store Asset Visual System

### 10.1 Shared Template

Create one code-based creative component system with:

- platform canvas variant: Apple 6.9-inch / Google Play 9:16,
- headline region with fixed safe bounds,
- screenshot viewport/mask,
- background color variant,
- optional secondary caption,
- sequence number and internal annotation excluded from export,
- localization-ready text properties,
- export-name convention.

Expected direction:

```text
tools/store-creative/
  README.md
  src/
    content/
    components/
    styles/
    frames/
  scripts/
    export.mjs
    validate-assets.mjs
```

The renderer must not be linked from production navigation or deployed as a
public product route. It is an internal deterministic asset-production tool.

Do not scale one flattened Apple image into Google Play dimensions. Recompose
from the same master primitives so type and screenshots remain proportionate.

### 10.2 Composition Rules

- Use real full-resolution app captures.
- Keep one main message and one primary screen per asset.
- Preserve legible native UI; do not shrink the app until text becomes texture.
- Keep headline line count stable across the sequence.
- Avoid placing essential copy near rounded/cropped edges.
- Use no more than two visual depths: background and product evidence.
- Use status colors sparingly; the overall sequence should still read as one
  Hypofit family.
- Do not use fake touch indicators unless demonstrating a gesture is necessary.

### 10.3 Google Play Feature Graphic

Create three explorations, then choose one:

1. Brand-forward: Hypofit wordmark plus abstract interview connection motif.
2. Product-forward: cropped real interface fragments without obsolete device
   imagery.
3. Workflow-forward: discovery-to-chat visual progression.

Final requirements:

- `1024 x 500`,
- 24-bit PNG or JPEG,
- no alpha,
- central focal area protected,
- no store badges,
- no price, ranking, testimonial, award, or release-date language,
- no oversized duplicate app icon,
- no fake or unavailable UI.

## 11. AI-Assisted Production Workflow

AI is an accelerator, not the final design authority.

### 11.1 Allowed AI Uses

- summarize references into reusable patterns,
- generate three visual directions from the same product brief,
- propose Korean copy variants under strict claim constraints,
- generate non-product background textures or brand motifs,
- suggest crops and hierarchy alternatives,
- identify visual inconsistency across a screenshot set,
- detect likely truncation, weak contrast, repetitive layouts, or unsupported
  claims,
- draft alt text and metadata for human review.

### 11.2 Prohibited AI Uses

- generating fake app screens and presenting them as shipped UI,
- inventing user counts, reviews, ratings, outcomes, or testimonials,
- using production PII, credentials, tokens, private chat, or real user photos
  in prompts,
- copying a reference composition, icon, illustration, or brand signature,
- generating Apple/Google badges rather than using official assets,
- altering screenshots so the represented feature no longer matches the app,
- allowing AI-generated Korean copy to bypass product/legal review.

### 11.3 Prompt Contract

Every significant AI design prompt should include:

```text
Product: Hypofit, paid customer-interview discovery and coordination
Audience: founders and relevant interview respondents
Job: [one exact job]
Real features allowed: [explicit list]
Claims forbidden: payment guarantee, AI matching, identity guarantee, escrow
Brand: calm, trustworthy, practical, green accent, real UI first
Avoid: card-heavy SaaS, gradients/orbs, fake metrics, fake testimonials
Output: three clearly different directions with rationale and tradeoffs
Constraints: Korean copy, phone-first, accessible contrast, store-safe metadata
```

Store prompts must also state the target canvas, safe region, and requirement to
leave the screenshot itself unaltered.

### 11.4 Three-Pass AI Workflow

Pass 1, divergence:

- generate at least three directions,
- vary information hierarchy and composition, not just background color,
- reject any direction that hides the app or relies on generic decoration.

Pass 2, convergence:

- score directions with the rubric below,
- combine only compatible strengths,
- translate the chosen direction into the shared renderer tokens and components.

Pass 3, adversarial QA:

- ask a separate critique pass to find misleading claims, fake UI, weak
  accessibility, cropping risks, localization risks, and inconsistent branding,
- verify every critique against actual code and official platform rules,
- keep human approval before export.

### 11.5 Direction Scoring Rubric

Score each category from 1 to 5:

- product understood within five seconds,
- real app value is visible,
- founder/respondent jobs are accurate,
- brand distinctiveness,
- Korean readability,
- App Store/Google Play compliance,
- implementation and export feasibility,
- accessibility and contrast,
- visual consistency across all frames,
- originality and IP safety.

Reject any direction scoring below 4 for product truth or store compliance,
regardless of total score.

## 12. Capture And Data Pipeline

### 12.1 Deterministic Demo State

Use only reviewer/demo-scoped data:

- realistic Korean interview titles,
- several reward/mode/location combinations,
- applications in useful states,
- active chat with safe, concise content,
- notifications and founder applicant states,
- no real user names, emails, phone numbers, profile photos, or exact private
  addresses.

Create a capture manifest that records:

- account,
- route,
- expected data state,
- platform,
- device/display,
- build/version,
- capture date,
- source filename,
- intended frame.

### 12.2 Capture Rules

- Capture from the installed release candidate where possible.
- Hide debug overlays, Expo development UI, cursor indicators, and simulator
  chrome.
- Use a stable status bar time and network state across a platform set.
- Ensure no permission prompt, keyboard, loading spinner, toast, or transient
  menu appears unless the frame specifically demonstrates it.
- Preserve original captures before composition.
- Re-capture after UI changes that affect the represented screen.
- Never paint over an error or missing feature in post-production.

### 12.3 Working Directories

Expected structure:

```text
docs/store-assets/
  README.md
  capture-manifest.md
  prompts/
  apple/
    source/
    export/ko-KR/
  google-play/
    source/
    export/ko-KR/
    feature-graphic/
  landing/
    source/
    export/
```

Do not commit exports containing real personal data. Keep heavyweight source
files out of git if repository size becomes unreasonable; retain a manifest and
stable design-file link instead.

### 12.4 Naming Convention

Examples:

```text
apple-ko-01-core-value-1320x2868.png
apple-ko-02-search-1320x2868.png
play-ko-01-core-value-1080x1920.png
play-ko-feature-1024x500.png
landing-hero-product-1440.webp
```

## 14. Execution Phases

### Phase 0: Content And Asset Audit

- [x] Confirm live App Store URL.
- [x] Confirm Google Play CTA remains hidden until listing availability.
- [x] Inventory current brand marks, fonts, colors, and app screenshots.
- [x] Approve the public/store typography choice and record why it differs from
      or matches the native app font.
- [x] Audit current mobile screens for capture readiness.
- [x] Freeze forbidden claims and approved terminology.
- [ ] Define reviewer/demo capture data and privacy-safe identities.

Exit criteria:

- a signed-off message hierarchy,
- a capture-ready screen list,
- no unresolved claim about current functionality.

### Phase 1: Low-Fidelity Creative Directions

- [ ] Produce three coded landing hero/layout directions.
- [ ] Produce three coded store screenshot systems.
- [ ] Produce three coded Google Play feature-graphic directions.
- [ ] Score each with the rubric.
- [ ] Select one coherent direction across all outputs.

Exit criteria:

- selected direction has product-truth and store-compliance scores of at least
  4/5,
- desktop and phone landing structures are approved,
- first three store frames communicate a complete story.

### Phase 2: Landing Page Implementation

- [x] Introduce public/product route separation.
- [x] Implement `/` landing and migrate product root to `/app` safely.
- [x] Build header, hero, role, workflow, proof, trust, CTA, and footer bands.
- [ ] Add real product assets and responsive derivatives.
- [x] Add official store badge and canonical store link.
- [x] Add SEO/social metadata.
- [x] Verify legal/support/deletion/auth callback route preservation in source
      and focused link tests.
- [x] Implement single-tree `<768px` phone and `768px+` compact-web rendering.
- [x] Add mobile login entry, semantic main landmark, and accessible product
      carousel controls.
- [ ] Verify desktop and mobile responsive layouts.

Exit criteria:

- landing works without authentication,
- product and public deep links remain functional,
- no unsupported Google Play CTA is shown,
- production web build passes.

### Phase 3: Capture Preparation

- [ ] Seed or refresh deterministic reviewer/demo data.
- [ ] Prepare stable iOS and Android capture environments.
- [ ] Create capture manifest.
- [ ] Capture all seven screen states on each platform.
- [ ] Review captures for PII, errors, stale UI, and transient overlays.

Exit criteria:

- every source capture maps to a shipped route and recorded build,
- no real personal data appears,
- all intended UI is readable before decoration.

### Phase 4: Store Asset Production

- [x] Build the HTML/CSS creative renderer and platform variants.
- [x] Build deterministic local Chrome export and asset-validation scripts.
- [x] Compose Apple 6.9-inch Korean set.
- [x] Compose Google Play phone Korean layout and copy system.
- [ ] Replace Google Play source screens with Android release-candidate captures.
- [x] Compose Google Play feature graphic.
- [x] Draft alt text for all Google Play assets.
- [ ] Run AI adversarial critique and human review.
- [x] Export exact platform dimensions for the three-frame Apple, four-frame
      Play draft, feature graphic, and README set.

Exit criteria:

- all output files pass dimension, format, alpha, content, and sequence checks,
- screenshots accurately represent the current app,
- text remains legible at store-thumbnail size.

### Phase 5: Verification And Deployment

- [x] Run web typecheck/tests/build appropriate to changed files.
- [x] Add focused phone/compact-web responsive branch tests.
- [ ] Check landing at phone, tablet fallback, laptop, and wide desktop widths.
- [ ] Check keyboard navigation and reduced motion.
- [ ] Check image loading and layout shift.
- [x] Validate App Store and Play asset dimensions with a script.
- [ ] Review final claims against app behavior and legal copy.
- [x] Deploy Vercel only after explicit user approval.
- [x] Verify the production URL and store links.

Exit criteria:

- landing is production-ready,
- store asset package is ready for console upload,
- Play Console/AAB operations are the only intentionally deferred Android
  release tasks.

## 15. QA Matrix

### Landing Viewports

- `390 x 844` phone,
- `430 x 932` large phone,
- `768 x 1024` tablet fallback,
- `1280 x 800` laptop,
- `1440 x 900` desktop,
- `1920 x 1080` wide desktop.

Check:

- no overlap or clipped Korean text,
- next section visible below the hero,
- store badges remain subordinate to the main product message,
- real product image remains inspectable,
- no horizontal scroll,
- navigation and legal links remain reachable.

### Store Assets

For each export:

- exact dimensions,
- accepted file type,
- no unintended alpha,
- no PII,
- no debug/internal labels,
- no fake claims,
- no status bar inconsistency,
- no text outside safe region,
- readable thumbnail hierarchy,
- correct sequence number and locale,
- alt text prepared for Google Play.

## 16. Acceptance Criteria

The plan is complete only when:

- `/` is a production-quality public Hypofit landing page,
- the web product remains reachable without breaking public/review links,
- the landing page uses real product evidence and official store badges,
- Apple has a reviewed 6.9-inch Korean screenshot set,
- Google Play has a reviewed phone screenshot set and `1024 x 500` feature
  graphic,
- all assets derive from current shipped UI and privacy-safe demo data,
- export naming and source manifests are organized,
- the code renderer can reproduce exact store exports,
- AI prompts and critique outcomes are documented without secrets or PII,
- legal/store claims match actual implementation,
- automated dimension validation and manual visual QA are complete,
- Play Console authentication and AAB upload remain clearly separated as
  deferred release operations.

## 17. Completion And Document Closeout

Keep this document in `docs/active/` while landing code, capture preparation,
or store creative exports still require implementation.

Move it to `docs/completed/` only after:

- landing implementation and requested deployment are complete,
- Apple and Google Play asset packages are export-ready,
- final QA evidence is recorded,
- any remaining Play Console/AAB work is tracked as release operations rather
  than hidden inside this implementation plan.
