# Brainwave-Inspired Landing Visual Reconstruction Plan

Status: active

Last updated: 2026-08-25

## 1. Purpose

Reconstruct Hypofit's public landing page with the restrained, product-led SaaS
composition observed in the Brainwave.io mobile-app landing reference while
keeping Hypofit's product truth, brand system, React architecture, responsive
entry policy, accessibility, and store-review obligations intact.

This is a focused visual implementation plan under
`landing-page-and-store-creative-production-plan.md`. It owns the landing-page
visual reconstruction only. It does not replace the broader landing/store
creative plan, the multi-format product model, or the authenticated web UI plan.

The intended result is:

```text
Brainwave reference structure and rhythm
  + Hypofit message hierarchy
  + real Hypofit product evidence
  + Hypofit brand colors and typography
  + existing public routes and responsive policy
  = a distinctive, production-ready Hypofit landing page
```

## 2. Related Authorities

Read these together with this plan:

- `docs/active/current-mvp-execution-roadmap.md`
- `docs/active/landing-page-and-store-creative-production-plan.md`
- `docs/active/multi-format-participant-recruitment-and-web-template-adoption-plan.md`
- `docs/active/hypofit-brand-logo-icon-system-migration-plan.md`
- `docs/service/09-design-and-copy-principles.md`
- `docs/service/14-design-system-and-screen-patterns.md`
- `docs/service/15-ai-assisted-design-workflow.md`
- `docs/completed/web-navigation-motion-system-plan.md`
- `docs/completed/react-web-architecture-modularization-refactoring-plan.md`

Authority boundaries:

- This plan owns landing composition, section rhythm, mobile/desktop visual
  adaptation, landing-specific component extraction, and landing copy layout.
- The broader landing/store plan owns store screenshots, feature graphics,
  capture data, SEO, official store assets, and final release-asset production.
- The multi-format plan owns whether interview, survey, and beta-test flows are
  actually available and when public copy may claim those capabilities.
- The brand plan owns the Fit Node geometry, wordmark, favicon, app icons,
  splash assets, and generated brand exports.
- The desktop web plan owns authenticated `/app` surfaces, not this public page.

## 3. Reference And Provenance Record

### 3.1 Figma source

- Source title: `Brainwave.io - Landing Page UI Kit - SaaS Landing Page - Creative App Landing Page`
- Figma URL:
  `https://www.figma.com/design/8O8MwVVuC02evOSX9bhFLU/Brainwave.io---Landing-Page-UI-Kit---Saas-Landing-Page---Creative-App-Landing-Page--Community-?node-id=0-421&m=dev`
- File key: `8O8MwVVuC02evOSX9bhFLU`
- Inspected root frame: `0:421`, `07-Mobile App`
- In-file creator credit observed in the footer: `Seju_ui_ux`
- Intended use: visual-language and composition reference.
- Captured for planning: 2026-08-25.

The source is a Figma Community file. Before any source asset, icon, illustration,
or substantial copied layout is shipped, verify the publisher and applicable
license terms and add the required credit to `THIRD_PARTY_NOTICES.md`. Visual
inspiration alone does not authorize removing source attribution obligations.

### 3.2 Downloaded local export

The user-provided Figma-to-Vite export currently exists outside the repository:

```text
/Users/sehyeon/Desktop/07-mobile-app-vite
```

Observed export properties:

- fixed `1600 x 7040px` artboard,
- one `App.tsx` of approximately 1,851 lines and 194 KB,
- approximately 543 absolute-positioned nodes,
- React 19.2, Vite 8.2, and Tailwind CSS 4.3,
- 25 exported PNG assets under `public/images`,
- no meaningful responsive behavior,
- no production component boundaries,
- source-specific remote-team copy, pricing, testimonials, social icons, and
  app imagery.

The local export is a measurement and visual-inspection artifact only. It must
not be copied into `apps/web`, installed as a package, or treated as a reusable
application implementation.

### 3.3 Allowed and disallowed reuse

Allowed:

- section order and narrative rhythm,
- high-contrast hero treatment,
- product screenshot integrated into the hero,
- alternating bright and dark full-width bands,
- numbered workflow presentation,
- restrained feature list treatment,
- generous whitespace and clear CTA hierarchy,
- footer information grouping.

Disallowed without a separate provenance and product review:

- original remote-team copy,
- original app screenshots and testimonial portraits,
- original decorative SVG waves, dots, circles, or social icons,
- original App Store or Google Play badge files,
- original pricing copy, amounts, feature limits, and checkout behavior,
- fabricated customer counts, reviews, ratings, or endorsements,
- Gilroy typography,
- the purple/blue gradient palette,
- fixed-position export code or the single 1600px artboard implementation.

## 4. Product Job And Truth Boundary

The landing page should help a first-time visitor understand within one viewport:

```text
what Hypofit helps recruit
  -> how the workflow continues
  -> what the actual product looks like
  -> where to start or install it
```

Current landing positioning:

```text
필요한 사람을 만나, 더 빠르게 답을 확인하세요.
```

Current supporting promise:

```text
인터뷰, 설문조사, 베타테스트, 연구 실험 등 목적에 맞는 참여자를 모집하고
내 경험에 맞는 공고를 찾아 참여하세요.
```

Landing copy treats `인터뷰` as a posting type, not the product-wide object.
General product copy uses recruitment, participation, postings, and compensation
language. Selection, chat, and scheduling remain conditional workflow steps;
the landing must not imply that every posting uses them.

```text
필요한 참여자를 모집하고, 내 경험에 맞는 공고를 찾아 참여하세요.
```

Do not publish survey or beta-test availability merely because backend contracts
exist. Public copy must follow the production capability flags and released
client behavior defined in the multi-format plan.

Do not claim:

- AI matching, ranking, or automatic applicant selection,
- reward escrow or payment guarantee,
- identity verification,
- interview recording or transcription,
- research compliance certification,
- guaranteed participant quality or attendance,
- unverified customer counts or testimonials.

Pricing is in scope, but only Hypofit-owned plan names, amounts, limits, billing
periods, taxes, cancellation terms, and purchase paths may be published. The
Brainwave prices and feature limits are reference content and must not be reused.

## 5. Design Diagnosis

### 5.1 Why the reference feels polished

The reference does not rely on many decorative cards. Its quality comes from:

- one dominant visual decision per section,
- a hero where copy and product proof form one composition,
- large changes in background tone between narrative chapters,
- generous spacing around short copy,
- repeated alignment anchors,
- a small number of strong CTAs,
- product imagery larger than supporting iconography,
- predictable headline/body/metadata hierarchy,
- full-width section bands rather than floating page-section cards.

### 5.2 Current Hypofit gap

The current landing already has the correct information architecture and
responsive branch separation. The remaining visual gaps are:

- the first viewport is more copy-led than product-led,
- the product preview reads as a card placed below the hero rather than part of
  the hero scene,
- audience tabs and the product carousel add more control chrome than the
  reference,
- several sections use similar white/green treatments, weakening chapter rhythm,
- the desktop page contains large inline section implementations that should be
  extracted while preserving `app -> pages -> features -> shared`,
- code-rendered product previews remain placeholders until real release-safe
  captures are approved.

## 6. Approved Visual Direction

### 6.1 Core principle

Use the reference's structure, not its identity.

Hypofit should remain:

- calm rather than flashy,
- product-led rather than illustration-led,
- warm and trustworthy rather than purple SaaS-generic,
- compact in controls but generous in section spacing,
- truthful about current capabilities,
- visually consistent with the shipped mobile app.

### 6.2 Color translation

| Reference role                 | Hypofit implementation                                        |
| ------------------------------ | ------------------------------------------------------------- |
| Purple gradient hero           | Flat `#176B5D` or `#0F4F44` hero field; no copied gradient    |
| Dark feature band              | `#17231F` or canonical dark text tone                         |
| White content band             | `#FFFFFF` or warm white `#F7F5EF`                             |
| Light gray page                | `#F6F7F8`                                                     |
| Red CTA accent                 | Hypofit green primary action                                  |
| Green reference accents        | Hypofit green or amber only when semantically appropriate     |
| Decorative multicolor workflow | One green family plus text labels; do not rely on color alone |

The amber `#F5A623` remains a brand node accent. It is not the default success,
warning, selection, or CTA color.

### 6.3 Typography

Use Spoqa Han Sans Neo throughout. Do not import Gilroy.

Discrete responsive sizes:

| Role             | Phone   | Compact/tablet | Desktop |
| ---------------- | ------- | -------------- | ------- |
| Hero headline    | 34-38px | 48-54px        | 60-68px |
| Section headline | 26-30px | 34-40px        | 42-48px |
| Supporting body  | 15-16px | 16-18px        | 17-19px |
| Eyebrow/meta     | 11-12px | 12-13px        | 12-14px |
| Button label     | 13-15px | 14-15px        | 14-16px |

Rules:

- no viewport-width font scaling,
- letter spacing remains `0`,
- Korean body line height remains generous,
- no hero-scale text inside cards or compact panels,
- headlines should remain short enough to avoid more than three phone lines.

### 6.4 Shape and depth

- Use the existing 4/6/8px design-system radius scale.
- Keep large landing media frames at the existing approved landing radius only
  when they represent one actual product artifact.
- Do not nest cards.
- Prefer full-width bands and unframed compositions.
- Use border or low shadow, not both by default.
- Use strong shadow only for a phone/product frame that genuinely floats above
  the hero field.
- Do not reproduce gradient orbs, bokeh, or template-specific wave decorations.

### 6.5 Icons

- Keep the current approved web icon family and existing landing Lucide usage
  unless the template-adoption plan explicitly authorizes a replacement.
- Normalize icon size to 18-24px and stroke weight to the current web baseline.
- Do not export or copy source icons from the downloaded Vite project.
- Product screenshots should carry more visual weight than icons.

## 7. Target Information Architecture

### 7.1 Desktop and compact web, `768px+`

```text
Header
  -> Hero with integrated product scene and install/web CTA
  -> Two alternating product-story sections
  -> Numbered workflow
  -> Large product-proof band
  -> Capability/trust band
  -> Pricing
  -> Final install CTA
  -> Legal/business footer
```

### 7.2 Phone landing, `<768px`

```text
Safe-area header
  -> Short hero with one dominant product proof
  -> Concise audience/value switch or static paired value rows
  -> Two or three stacked product stories
  -> Compact numbered workflow
  -> Trust/support rows
  -> Compact pricing
  -> Official store CTA
  -> Safe-area legal/business footer
```

The phone branch must remain an app-acquisition surface. It must not expose the
authenticated web dashboard entry merely to mirror desktop navigation.

## 8. Section-by-Section Translation

### 8.1 Header

Reference insight:

- visually quiet navigation,
- brand at the left,
- one dominant CTA.

Hypofit adaptation:

- retain the Fit Node mark and live `Hypofit` wordmark,
- desktop navigation anchors: `활용 방법`, `이용 흐름`, `주요 기능`, `안심하고 사용하세요`,
- one primary entry based on route policy: `대시보드로 이동`, `로그인`, or
  `앱 설치하기`,
- outreach-only `/landing` must continue hiding web login/dashboard entry,
- mobile keeps only brand and install CTA,
- retain skip link, focus visibility, and safe-area handling.

### 8.2 Hero

Reference insight:

- headline and app screen form one scene,
- the product is visible before scrolling,
- store badges are supporting actions rather than decoration.

Hypofit adaptation:

- use a flat deep-green hero field or a warm-white hero with one green product
  stage; choose one direction before implementation,
- use one strong H1 and one short supporting sentence,
- integrate a real interview-discovery or home-state product capture into the
  hero instead of placing it in a separate decorative card,
- use current code-rendered `HeroProductScene` only as an interim proof,
- keep official Apple and localized Google badges unmodified,
- desktop may expose a web-entry CTA when allowed; phone prioritizes stores,
- show a hint of the next section at common phone and desktop heights.

Recommended first-pass copy:

```text
Eyebrow: 경험이 필요한 조사와 검증을 위해
H1: 필요한 사람을 만나 답을 확인하세요
Body: 참여자 모집부터 신청 확인, 채팅과 일정 조율까지 한곳에서 이어가요.
```

### 8.3 Product story 1: recruit or discover

Reference insight:

- one large visual paired with one short content block.

Hypofit adaptation:

- title: `조건에 맞는 참여자를 모집하세요`,
- organizer-side create/discovery visual,
- three concise proof points at most,
- desktop image/text split; phone visual then copy,
- no decorative card grid.

### 8.4 Product story 2: apply and coordinate

- title: `신청부터 대화까지 자연스럽게 이어져요`,
- show application and chat as a connected product scene,
- emphasize relevant experience, availability, selection, and chat,
- do not imply payment guarantee or automatic matching.

### 8.5 Numbered workflow

Translate the reference's three connected steps into the current four-step
Hypofit workflow:

1. 모집글을 만들거나 찾아요.
2. 경험과 가능한 시간을 전해요.
3. 선정 후 채팅으로 조율해요.
4. 진행 상태를 확인해요.

Desktop:

- four equal anchors on one horizontal line when space allows,
- use text labels and numbers together,
- collapse to a two-by-two layout before labels become cramped.

Phone:

- vertical sequence with one connector line,
- compact rows rather than four independent cards,
- each step gets one title and one sentence.

### 8.6 Product-proof band

Replace the reference's large video section with real product evidence.

First implementation:

- one large framed home/discovery view,
- two smaller supporting map/chat views,
- code-rendered previews are allowed temporarily,
- no autoplay video and no fake play control.

Future option:

- add a real 20-40 second product walkthrough only after a reviewed recording,
  captions, poster image, loading behavior, and performance budget exist.

### 8.7 Capability and trust band

Replace the reference's generic six-feature grid with verified Hypofit
capabilities:

- 조건과 사례비 확인,
- 신청자의 관련 경험 확인,
- 채팅으로 일정 조율,
- 상태와 알림 확인,
- 신고·차단·문의,
- 개인정보와 계정 관리.

Use a dark full-width band with restrained green icons and white text. On phone,
render this as two-column compact features or one-column rows depending on text
length. Do not place six large cards on a phone.

### 8.8 Social proof

Do not copy the reference testimonial section until real, approved evidence
exists.

Allowed initial replacement:

- product-state evidence,
- clear workflow outcomes,
- public store availability,
- factual trust and support paths.

Later, real testimonials require:

- explicit user permission,
- source and approval record,
- no sensitive interview details,
- no fabricated avatar, role, company, or quote,
- removal path when consent is withdrawn.

### 8.9 Pricing

Keep the reference's pricing chapter as a Hypofit-owned pricing section.

Visual direction:

- use two or three directly comparable plans at most,
- keep one recommended plan visually emphasized without oversized decoration,
- show price, billing unit, intended user, and four or fewer decisive limits,
- use a simple comparison row or disclosure for secondary details,
- avoid nested cards, decorative gradients, crossed-out fake discounts, and
  countdown urgency,
- stack cards on phone with the recommended plan first,
- preserve one clear CTA per plan.

Required data contract before public enablement:

```text
plan id
  -> public plan name
  -> price and currency
  -> billing period and VAT/tax treatment
  -> included recruitment or usage allowance
  -> overage or limit behavior
  -> cancellation/refund summary
  -> purchase/contact destination
  -> availability state
```

Implementation rules:

- build the section from typed Hypofit content data rather than hardcoded card
  markup,
- exact plan names, prices, limits, and billing terms remain a product decision
  gate,
- local design review may use clearly marked fixture values,
- production must hide the section or render a factual `요금제 준비 중` state
  until the commercial terms and purchase path are approved,
- if payment is completed outside the native app, review Apple and Google
  steering/payment rules before linking from mobile-facing surfaces,
- when payment is enabled, update terms, privacy disclosures, refund guidance,
  store declarations, support operations, and backend entitlement enforcement
  in the same release track.

### 8.10 Final CTA and footer

- final CTA uses one clear message and official store badges,
- do not repeat every hero sentence,
- footer retains privacy, terms, account deletion, support, and confirmed
  business/operator information,
- do not copy source social icons unless Hypofit has active official channels,
- footer is visually subordinate but fully readable and keyboard reachable,
- phone footer reserves `env(safe-area-inset-bottom)`.

## 9. Product Image Strategy

### 9.1 Evidence priority

Use assets in this order:

1. reviewed release-build captures with reviewer-safe data,
2. deterministic store/demo captures generated by the existing creative system,
3. current code-rendered landing previews as temporary implementation evidence,
4. newly generated illustrations only when no real product state can explain the
   section.

Never use the downloaded Brainwave app screenshots as Hypofit product evidence.

### 9.2 Required capture set

| Asset             | Primary use           | State                               |
| ----------------- | --------------------- | ----------------------------------- |
| Home or discovery | hero                  | populated, readable, no PII         |
| Interview search  | product story 1       | filters and relevant rows visible   |
| Map discovery     | supporting proof      | markers and list context visible    |
| Application       | product story 2       | relevant experience and time fields |
| Chat coordination | product story 2/proof | safe synthetic conversation         |
| Progress/activity | workflow proof        | meaningful state transitions        |

Requirements:

- no real names, emails, phone numbers, precise private locations, or messages,
- stable intrinsic dimensions,
- AVIF/WebP runtime derivatives with fallback where useful,
- `srcset`/`sizes` for large hero media,
- preload only the actual hero/LCP asset,
- lazy-load below-the-fold assets,
- separate iOS and Android status-bar imagery for store assets even when the
  landing can use one platform-neutral crop.

## 10. Implementation Architecture

### 10.1 Preserve routing and branch policy

Keep:

- `/` public landing with conditional web entry,
- `/landing` outreach-only landing without web auth entry,
- `/app` authenticated web product,
- `<768px` mobile composition,
- `768px+` compact/desktop composition.

Do not render both responsive branches in the DOM.

### 10.2 Target component shape

Refactor incrementally from the current large `LandingPage.tsx` without changing
route behavior:

```text
apps/web/src/pages/LandingPage.tsx
apps/web/src/features/landing/
  content.ts
  LandingDesktop.tsx
  MobileLanding.tsx
  LandingProductVisuals.tsx
  LandingBusinessDetails.tsx
  components/
    LandingHeader.tsx
    LandingFooter.tsx
    StoreLinks.tsx
  sections/
    LandingHeroSection.tsx
    LandingProductStorySection.tsx
    LandingWorkflowSection.tsx
    LandingProofSection.tsx
    LandingCapabilitySection.tsx
    LandingFinalCtaSection.tsx
```

This is a target, not a requirement to create every file immediately. Extract a
component only when it owns one coherent section, removes meaningful duplication,
or isolates desktop/mobile behavior. Do not introduce a generic page-builder or
schema-driven marketing engine.

### 10.3 Dependency rules

- `pages` composes the route and responsive branch.
- `features/landing` owns landing content and UI.
- shared product-agnostic controls may come from `shared`.
- landing must not import authenticated page components.
- no new cross-feature allowlist merely for marketing composition.
- no runtime dependency is added for decorative animation.

### 10.4 Source export handling

- Do not copy the Desktop export into the repository runtime.
- Do not import its `package.json`, Vite config, Tailwind setup, or React version.
- Do not retain temporary Figma MCP asset URLs; they expire.
- If one source asset is explicitly approved, copy it through the repository's
  asset/provenance process and record its license before use.
- Keep the external source folder unchanged as a temporary local reference; the
  repository must not depend on its path to build.

## 11. Responsive Specification

Canonical review widths:

- `320 x 568`: smallest supported phone stress case,
- `375 x 812`: compact iPhone,
- `390 x 844`: primary phone baseline,
- `430 x 932`: large phone,
- `768 x 1024`: compact/tablet fallback and branch boundary,
- `1024 x 768`: small laptop/landscape fallback,
- `1280 x 800`: laptop,
- `1440 x 900`: desktop baseline,
- `1728 x 1117`: wide desktop.

Rules:

- phone horizontal padding starts at 20px unless a full-bleed product scene owns
  the edge,
- desktop content max width remains approximately 1200-1240px,
- section spacing uses discrete 56/72/96px bands by breakpoint,
- no horizontal page overflow,
- long Korean headings wrap intentionally,
- buttons and badges never shrink their labels below readable sizes,
- hero and fixed headers account for safe-area insets,
- first viewport reveals a hint of the next section,
- each full-screen or fixed surface has explicit scroll ownership.

## 12. Interaction And Motion

- Header anchors use the existing landing scroll and focus behavior.
- CTA hover/pressed transitions remain 120-200ms and property-specific.
- Product media may use a small entrance fade/translate after initial paint, not
  parallax or continuous floating motion.
- Mobile product stories should prefer ordinary vertical scrolling over a
  mandatory carousel.
- If a carousel remains, it needs snap behavior, visible progress, keyboard
  controls, reduced-motion handling, and no hidden essential content.
- Respect `prefers-reduced-motion` and the completed navigation-motion contract.
- No animation may delay LCP, block interaction, or hide content until JavaScript
  finishes.

## 13. Accessibility And Content Requirements

- exactly one H1,
- logical H2/H3 order,
- real `main`, `header`, `nav`, `section`, and `footer` landmarks,
- skip link remains functional,
- all controls have visible keyboard focus,
- minimum 44px touch targets on phone,
- official store badges have meaningful accessible labels,
- decorative media uses empty alt text,
- product captures use concise alt text describing the product state,
- text contrast meets WCAG AA,
- feature distinctions do not rely on color alone,
- no QR code as the only installation path,
- legal, support, and deletion links remain reachable without authentication.

## 14. Performance Budget

- no new animation library,
- no autoplay hero video,
- no downloaded Figma runtime bundle,
- no duplicate desktop/mobile product trees,
- explicit media dimensions to prevent layout shift,
- one preloaded LCP image at most,
- below-the-fold images lazy-loaded,
- responsive image candidates for large product captures,
- landing route remains isolated from authenticated workflow bundles where the
  existing architecture permits,
- bundle budget and production build must remain passing.

## 15. Implementation Phases

### Phase 0: Reference lock and baseline

- [x] Record the Brainwave source and local export in this plan.
- [ ] Verify exact Figma Community publisher/license before copying any asset.
- [ ] Add `THIRD_PARTY_NOTICES.md` attribution if substantial adaptation or a
      source asset is shipped.
- [x] Capture current phone and desktop landing screenshots for comparison.
- [x] Lock the current route, auth-entry, store-link, legal-link, and breakpoint
      behavior in tests.

Exit gate: source provenance and non-regression baseline exist.

### Phase 1: Content and section mapping

- [x] Finalize release-safe hero and supporting copy.
- [x] Define current interview-only and future multi-format copy separately.
- [x] Map every reference section to keep, replace, defer, or remove.
- [x] Define pricing fixture data separately from production commercial terms.
- [x] Remove testimonial and fake-video assumptions from the implementation brief.
- [x] Select the exact real or interim product state for each section.

Exit gate: no section depends on unsupported claims or missing evidence.

### Phase 2: Landing component boundary cleanup

- [x] Keep `LandingPage.tsx` as thin route composition.
- [x] Extract desktop landing composition from the page without changing output.
- [x] Centralize official store links/badges without affecting mobile behavior.
- [x] Keep mobile-only and desktop-only layout owners explicit.
- [x] Preserve architecture-boundary checks.

Exit gate: route behavior is unchanged and section-level implementation is
bounded enough for visual iteration.

### Phase 3: Hero reconstruction

- [x] Implement one approved flat-color hero direction.
- [x] Integrate one dominant product scene into the hero composition.
- [x] Establish desktop, compact, and phone type scales.
- [x] Keep store badges official and undistorted.
- [x] Preserve outreach-only and authenticated-entry variations.
- [x] Verify first-viewport framing at the canonical sizes.

Exit gate: value, product evidence, and primary action are clear without
scrolling.

### Phase 4: Narrative sections and workflow

- [x] Build two alternating product-story sections.
- [x] Replace card-heavy presentation with full-width bands and one proof per
      section.
- [x] Implement the four-step desktop and phone workflow variants.
- [x] Replace the reference video with the product-proof composition.
- [x] Verify long Korean copy and no horizontal overflow.

Exit gate: the page tells one continuous product story without repeated content.

### Phase 5: Capability, trust, pricing, CTA, and footer

- [x] Implement the dark verified-capability band.
- [x] Replace the generic capability copy with launch-state AI applicant-summary
      copy and a source-grounded preview. The landing describes the intended
      released experience without provisional wording, while production deployment
      remains gated on the AI implementation plan. The preview shows summary and
      follow-up-question assistance only and does not imply ranking, scoring,
      matching, selection, or rejection.
- [x] Keep safety/support/deletion claims factual and reachable.
- [x] Implement the pricing section from typed Hypofit plan content.
- [x] Keep production pricing hidden or explicitly preparatory until exact
      commercial terms and a valid purchase path are approved.
- [x] Do not implement fabricated testimonials.
- [x] Rebuild the final CTA with one concise message.
- [x] Preserve confirmed business information and safe-area footer behavior.

Exit gate: the page closes with trust and a clear next action, not invented proof.

### Phase 6: Product asset replacement

- [ ] Capture reviewed release-safe product states.
- [ ] Remove stale or old-logo source screens.
- [ ] Generate responsive runtime derivatives.
- [ ] Replace interim code-rendered hero evidence where approved captures are
      superior.
- [ ] Verify image sharpness at DPR 1, 2, and 3 where practical.

Exit gate: every displayed product image is current, readable, privacy-safe, and
brand-consistent.

### Phase 7: Validation and release

- [x] Run landing tests.
- [x] Run TypeScript typecheck.
- [x] Run real lint and architecture boundaries.
- [x] Run the complete web test suite and coverage gate.
- [x] Run production build and bundle budget.
- [x] Run browser smoke for `/`, `/landing`, `/app`, legal, support, and account
      deletion paths where affected.
- [x] Capture phone, compact, laptop, desktop, and wide-desktop screenshots.
- [ ] Verify keyboard, focus, reduced motion, contrast, and long-copy states.
- [ ] Deploy Vercel only after explicit user approval.
- [ ] Verify the canonical domain points to the intended deployment.

Exit gate: automated checks pass, visual review is approved, and production
truth matches the released clients.

## 16. Test Matrix

### Functional regression

- `/` renders the public landing.
- `/landing` renders the outreach landing without login/dashboard entry.
- authenticated `/` entry shows `대시보드로 이동` only where intended.
- phone view does not expose the authenticated web dashboard entry.
- Apple and Google badges point to configured store URLs.
- legal, support, and account-deletion links remain valid.
- anchor navigation moves focus and history correctly.

### Responsive and visual

- no clipped hero text at 320px,
- no store badge distortion,
- no duplicated desktop/mobile branch in the DOM,
- no horizontal overflow at any canonical width,
- product media remains legible without covering copy,
- header, hero, and next-section hint fit common first viewports,
- compact/tablet fallback does not look like a stretched phone screen,
- desktop alignment remains stable between 1280px and 1728px.

### Accessibility

- one H1,
- logical headings,
- keyboard navigation and visible focus,
- reduced-motion fallback,
- descriptive product media alt text,
- decorative reference-inspired geometry hidden from assistive technology,
- legal/support/deletion paths reachable without pointer input.

### Performance

- no missing intrinsic media dimensions,
- no unnecessary preload,
- no autoplay media,
- no new decorative runtime package,
- bundle budget passes,
- LCP and CLS are reviewed in a production build rather than inferred from dev.

## 17. Risks And Mitigations

| Risk                                         | Mitigation                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| Landing becomes a Brainwave clone            | Use only section rhythm; retain Hypofit tokens, copy, icons, and product proof         |
| Downloaded absolute layout is copied         | Treat it as measurement-only and reject imports from the Desktop path                  |
| Unsupported survey/beta claims ship          | Gate public copy on released client and production capability state                    |
| Fake testimonials reduce trust               | Omit testimonials until consented real evidence exists                                 |
| Fixture pricing is mistaken for a real offer | Separate fixture and production data and gate public visibility                        |
| Store payment rules are violated             | Review platform steering/payment rules before exposing a purchase destination          |
| Mobile becomes a squeezed desktop            | Keep the existing separate `<768px` composition                                        |
| Hero media hurts performance                 | One responsive LCP image, explicit dimensions, lazy-load all later media               |
| Global tokens destabilize `/app`             | Keep landing-specific art direction within `features/landing`                          |
| Source license is lost                       | Record provenance and update third-party notices before shipping source-derived assets |
| Old app/logo screenshots remain              | Replace through the approved capture and brand export pipelines                        |
| Too many components are introduced           | Extract only coherent sections or meaningful duplication                               |

## 18. Definition Of Done

This plan is complete when:

- the public landing clearly uses the approved Brainwave-inspired section rhythm
  without copying its identity,
- all user-facing copy describes released Hypofit behavior truthfully,
- all product media is current, privacy-safe, and visually readable,
- Hypofit colors, Spoqa Han Sans Neo, Fit Node brand assets, icons, and official
  store badges are used consistently,
- desktop, compact, and phone layouts each feel intentionally composed,
- `/`, `/landing`, `/app`, legal, support, and deletion route behavior remains
  correct,
- pricing uses approved Hypofit terms or an explicitly non-purchasable
  preparatory state,
- fake testimonials, source-specific remote-team content, and original template
  assets are absent,
- accessibility, performance, architecture, tests, build, and browser smoke pass,
- source provenance and any required attribution are complete,
- an explicitly approved Vercel deployment is verified on the canonical domain.

After implementation and automated validation are complete, move this document
to `docs/completed/` even if later store screenshots or marketing experiments
remain in their broader owner plans.

## 19. Mobile-App-First Green Landing Revision (2026-08-25)

- [x] Reworked the desktop hero into copy on the left and two real Hypofit mobile
      app screens on the right. A browser/dashboard mockup is not used as the hero
      product object.
- [x] Added landing-only green, forest, lime, mint, border, and near-white
      tokens. The hero uses restrained radial light sources and near-imperceptible
      grain rather than a broad green gradient.
- [x] Replaced code-rendered landing previews in the public product stories with
      reviewed repository captures for home, interview discovery, map discovery,
      and chat coordination.
- [x] Replaced repeated feature-card treatment with alternating mobile-screen
      product stories, a divider-led workflow, one dark forest continuity band, and
      restrained pricing rows.
- [x] Removed the post-hero operational fact strip so the hero phone scene
      moves directly into the product story without competing text or overlap.
- [x] Where a release-safe app capture does not yet exist, show only a plainly
      labeled placeholder rather than a fabricated mobile UI or an unrelated screen.
- [x] Kept `/`, `/landing`, store links, legal/business footer, responsive
      branch policy, and the non-purchasable pricing truth intact.

The current source captures are iOS-oriented approved documentation assets.
Replace them with a reviewed Android release-candidate capture set before any
Android-specific launch campaign, and add responsive image derivatives when the
capture set is finalized.

## 20. Mobile-First, Web-Supported Product Narrative (2026-08-25)

- [x] Reordered the public narrative so the organizer/participant split is
      understood immediately after the mobile-first hero.
- [x] Replaced participant-first product stories with organizer recruitment and
      applicant-review stories before participant discovery and shared chat.
- [x] Added the web entry as a distinct product surface in navigation and the
      landing narrative, without making it the hero object.
- [x] Removed unapproved pricing cards and the broken Google Play download CTA.
- [x] Kept the released App Store CTA and explicit Android preparation status.
- [x] Kept unavailable visual states as plainly labeled text only; do not
      replace them with code-rendered mock UIs or unrelated app captures.

The repository currently has no reviewed, release-safe Hypofit Web capture and
no dedicated applicant-review capture. Replace the corresponding text labels
only after approved captures of those exact screens are available.

### Role And Platform Terminology Correction (2026-08-25)

- [x] Treat `모집할 때` and `참여할 때` as user contexts, not as separate
      platform products or permanent roles.
- [x] Treat mobile and web as equal access environments for the same Hypofit
      core flow; mobile remains visually primary only in the landing composition.
- [x] Removed organizer/mobile and participant/web labeling, renamed public
      dashboard language to web-entry language, and preserved all visual slots.

### Workflow Comparison And Progress Copy Refinement (2026-08-25)

- [x] Replaced the flat `기존 방식 | HYPOFIT` word columns with a restrained
      fragmented-tool-card to connected-workflow-rail comparison, while keeping
      the existing section placement, color system, and responsive rhythm.
- [x] Updated the continuity-band headline to a complete, action-oriented
      sentence and made its supporting copy explicitly cover recruiting,
      applying, messages, and progress states.
- [x] Kept approved product captures and intentionally labeled empty visual
      slots unchanged; no fabricated dashboard or mobile UI was introduced.

### Landing CTA And Copy Polish (2026-08-25)

- [x] Kept all shared landing eyebrow labels at their small label hierarchy;
      desktop single-line title treatment is applied only to the corresponding
      headings, never to eyebrow text.
- [x] Standardized public CTA terminology: the desktop header uses `로그인` or
      `대시보드` by authentication state, while Hero and final product CTAs use
      `웹에서 이용하기`.
- [x] Refined the progress microcopy and final CTA copy without changing the
      product flow, section order, assets, or placeholder slots.

### Responsive And Semantic Polish (2026-08-25)

- [x] Kept mobile landing navigation limited to brand and app-download entry;
      authenticated web-workspace shortcuts remain desktop/tablet-only.
- [x] Restored skip-link focusability on both landing `main` elements and kept
      the workflow rail outside the ordered-list child structure.
- [x] Checked the public landing from 320px through 1440px for horizontal
      overflow, header collisions, and phone-frame clipping.

### Navigation And Motion Polish (2026-08-25)

- [x] Removed public section-anchor navigation from the desktop header while
      retaining account and app-download actions and all section identifiers.
- [x] Extended the existing one-time IntersectionObserver reveal with short
      text hierarchy stagger and a dedicated fragmented-to-connected sequence
      for the Why Hypofit comparison. No scroll snap or scroll handler was
      added.
- [x] Kept reduced-motion rendering immediate and removed transform-based
      motion for that preference.

### Header CTA Hierarchy Polish (2026-08-25)

- [x] Preserved the sticky header geometry and simplified desktop account
      actions into a plain `로그인` or `대시보드` navigation link plus one filled
      `앱 다운로드` action.
- [x] Removed the app-download arrow treatment and kept the mobile header to
      the brand and compact app-download action only.
