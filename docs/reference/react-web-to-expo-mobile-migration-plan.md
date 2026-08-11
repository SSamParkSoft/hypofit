# React Web To Expo Mobile Migration Plan

Status: reference

Last updated: 2026-05-29

Historical note: this is a migration and decision-history reference. The Expo
mobile app now exists under `apps/mobile`; do not treat the phase checklists in
this document as the current active backlog. Current implementation work lives
in `docs/active/`.

## Purpose

Hypofit will no longer treat the current React PWA as the final mobile app
surface.

The product direction is now:

```text
apps/web
  -> React + Vite web app
  -> desktop/web-first UI
  -> Vercel deployment

apps/mobile
  -> Expo React Native app
  -> iOS and Android mobile app UI
  -> App Store and Google Play release path

apps/api
  -> FastAPI backend
  -> shared system of record through Supabase/Postgres
```

This plan defines how to move the approved phone-sized mobile app experience
currently prototyped in `apps/web` into a dedicated Expo React Native app,
while narrowing future `apps/web` work back toward web and desktop workflows.

The goal is not to share every screen implementation. The goal is to share the
product contract and keep each platform's UI native to its context.

## Mobile Web UI Parity Rule

The current phone-sized rendering of `apps/web` is the first visual and
interaction baseline for `apps/mobile`. The desktop/web layout inside
`apps/web` is not a mobile implementation reference.

When porting a screen to Expo React Native, the mobile app should first
reproduce the approved mobile web experience as closely as practical:

- same top-level tab structure
- same screen order and information architecture
- same Korean product copy unless a native platform label must differ
- same card density and row hierarchy
- same primary/secondary CTA placement
- same applied/read/selected/rejected/completed states
- same report, block, account deletion, support, and legal entry points
- same profile activity summary concept
- same chat list/thread information hierarchy
- same map bottom sheet and selected-interview card concept
- same color semantics for brand, reward, success, warning, danger, and muted
  states

Implementation must still be native:

- Rebuild screens with React Native components, not DOM components.
- Rebuild layout with native flexbox, safe areas, keyboard handling, gestures,
  and navigation.
- Replace browser APIs with native APIs where needed.
- Replace Kakao Maps Web SDK with a mobile map strategy.
- Replace PWA splash/install behavior with native splash and store
  distribution behavior.

Allowed differences:

- Native permission prompts may require different timing or wording.
- iOS and Android safe areas, keyboard behavior, and back gestures may require
  platform-specific layout adjustments.
- Native maps, action sheets, bottom sheets, and image pickers may differ
  slightly if the native convention is clearer.
- Desktop/web-only affordances should not be copied into mobile.

Not allowed without explicit product approval:

- Redesigning the mobile IA from scratch.
- Removing an approved mobile web flow during RN migration.
- Replacing the current bottom-tab model with another primary navigation model.
- Hiding report/block/account deletion paths that exist in web.
- Making `apps/mobile` a thin WebView wrapper.

## Parity Verification Standard

Use this standard before marking any RN mobile screen complete:

- The comparison source is the approved phone-sized `apps/web` UI only.
  Desktop `apps/web` layouts are not a mobile reference.
- The mobile screen must preserve the same user decision path: what the user
  sees first, what they can tap next, and where the primary action appears.
- Native implementation details may differ, but the product meaning must not:
  tabs, search/filter meaning, interview detail/application flow, map sheet,
  chat controls, profile/support/legal paths, and auth steps should remain
  recognizable from the approved mobile web design.
- Verify safe-area behavior on notched iPhone-sized screens and Android-sized
  screens before calling a screen done.
- Keep App Store and Google Play review-sensitive flows reachable during
  migration: account deletion, report/block, support contact, legal documents,
  permission rationale, and authentication recovery.
- If a screen intentionally diverges, document the reason and the user benefit
  in this plan or a linked active document before implementation is closed.

## Decision

Hypofit should use:

- `React + Vite` for web.
- `Expo React Native` for mobile.
- `NativeWind v4 + Tailwind CSS 3.x` as the default static styling system for
  `apps/mobile`.
- `FastAPI` as the shared backend.
- `Supabase Auth`, Supabase Storage, and Supabase Postgres as shared durable
  services.
- Shared TypeScript contracts where useful.
- Separate web and mobile UI component implementations.
- Dynamic native runtime styles remain allowed for safe-area calculations,
  pressed/animated state, gestures, map SDK containers, keyboard offsets, and
  other values that cannot be expressed as stable utility classes.

## Mobile Dependency Compatibility Policy

`apps/mobile` should follow Expo's SDK-managed dependency set.

Current pinned family:

```text
Expo SDK 53
React Native 0.79.x
React 19.0.x
Reanimated 3.17.x
NativeWind 4.x
Tailwind CSS 3.4.x
```

Rules:

- Do not upgrade mobile packages to registry `latest` in isolation.
- Use Expo SDK upgrade work to move Expo, React, React Native, Expo Router,
  Reanimated, Gesture Handler, Safe Area Context, Screens, and related native
  packages together.
- Keep `apps/mobile` Tailwind CSS on 3.4.x while NativeWind v4 is in use.
- Treat `apps/web` Tailwind CSS 4.x and `apps/mobile` Tailwind CSS 3.4.x as an
  intentional app-level split.
- Do not migrate to NativeWind v5, Tailwind CSS 4, Reanimated 4, or newer React
  Native without an explicit Expo SDK upgrade plan and simulator/device smoke.
- Keep React type packages app-local: React 18 types for `apps/web`, React 19
  types for `apps/mobile`, and no root React type package unless root React
  TypeScript code is introduced.

Required checks after dependency changes:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile exec expo install --check
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build
```

PWA remains useful as:

- MVP web distribution.
- Browser-based smoke testing.
- Desktop founder workflow.
- Internal QA and demo route.
- A fallback install path before native apps are ready.

PWA should not be treated as:

- The final iOS app.
- The final Android app.
- A thin WebView wrapper submission plan.
- The source of truth for mobile UI implementation.

## Source Basis

Official references checked on 2026-05-25:

- Expo monorepo guide:
  https://docs.expo.dev/guides/monorepos/
- Expo `create-expo-app`:
  https://docs.expo.dev/more/create-expo/
- Expo EAS build config:
  https://docs.expo.dev/build/eas-json/
- Expo EAS environment variables:
  https://docs.expo.dev/eas/environment-variables/
- Expo Router native link rewriting:
  https://docs.expo.dev/router/advanced/native-intent/
- Expo notifications:
  https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo new architecture guide:
  https://docs.expo.dev/guides/new-architecture/
- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- Apple account deletion guidance:
  https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Google Play target API requirement:
  https://developer.android.com/google/play/requirements/target-sdk
- Google Play payments policy:
  https://support.google.com/googleplay/android-developer/answer/9858738

Key implications:

- Expo supports monorepos and can be added under `apps/mobile`.
- EAS environments should be used for mobile build-time and runtime
  environment values.
- Expo public env values use `EXPO_PUBLIC_*`; secrets must not be exposed in
  client code.
- Push notifications should be designed as a native mobile feature, not a PWA
  assumption.
- App Store and Play Store review requirements should be designed into the app
  before submission, especially account deletion, privacy, reporting, blocking,
  UGC moderation, reviewer access, and stable backend availability.

## Target Repository Structure

Target structure:

```text
hypofit/
  apps/
    web/
      src/
      package.json
      vite.config.ts
      vercel.json

    mobile/
      app/
      src/
        app/
        features/
        screens/
        shared/
      assets/
      app.config.ts
      eas.json
      package.json
      tsconfig.json

    api/
      app/
      alembic/
      pyproject.toml

  packages/
    contracts/
      src/
        api/
        domain/
        formatting/
      package.json
      tsconfig.json

  docs/
  infra/
  AGENTS.md
  package.json
  pnpm-workspace.yaml
```

Required workspace update:

```yaml
packages:
  - apps/web
  - apps/mobile
  - packages/*
```

Root scripts should eventually include:

```json
{
  "dev:web": "pnpm --dir apps/web dev",
  "build:web": "pnpm --dir apps/web build",
  "test:web": "pnpm --dir apps/web test",
  "dev:mobile": "pnpm --dir apps/mobile start",
  "ios:mobile": "pnpm --dir apps/mobile ios",
  "android:mobile": "pnpm --dir apps/mobile android",
  "typecheck:mobile": "pnpm --dir apps/mobile typecheck",
  "test:mobile": "pnpm --dir apps/mobile test"
}
```

## Boundary Rules

### Share

Share only platform-neutral code:

- API endpoint path constants.
- API request and response types.
- Domain enums:
  - user role
  - interview mode
  - interview post status
  - application status
  - session status
  - support ticket kind/category
  - chat room status
- Formatting helpers:
  - reward formatting
  - duration formatting
  - distance formatting
  - Korean phone normalization/display helpers where UI-neutral
- Auth token contract:
  - Supabase access token is sent to FastAPI as
    `Authorization: Bearer <token>`.
- Query key factories if they do not depend on React DOM.
- Pure read-model builders:
  - application/session/post derived state
  - chat room display state

### Do Not Share

Do not share web UI directly with RN:

- Tailwind DOM components.
- `className`-based `Button`, `Badge`, `Field`, `PageFrame`.
- Web routing helpers using `window.history`.
- Browser-only Kakao Maps loader.
- DOM-only PWA manifest/service-worker logic.
- Web-specific safe-area CSS variables.
- Any component relying on `div`, `button`, `input`, CSS grid, CSS overflow, or
  browser layout behavior.

### Rebuild Separately

Rebuild these as native mobile components:

- App shell and bottom tab navigation.
- Screen headers and native back behavior.
- Button system.
- Text input and form fields.
- Bottom sheets.
- Modal/action sheets.
- Toast/snackbar feedback.
- Avatar/profile image picker.
- Map screen and markers.
- Chat list and chat thread.
- Keyboard-aware composer.
- Support/report forms.
- Account deletion flow.

## Platform Ownership

### `apps/web`

Primary audience:

- founders on desktop/laptop
- internal operators
- external users who open links in browser
- mobile browser fallback users

Web should prioritize:

- wider layouts
- denser comparison tables/cards
- keyboard and pointer interaction
- public legal/support/install pages
- shareable interview detail URLs
- founder management workflows
- Vercel deployment stability

Web should stop prioritizing:

- native-app-like bottom sheets as the core layout
- phone-only navigation polish as the final product experience
- installed PWA as the main app-store path
- simulator-first mobile tuning after `apps/mobile` exists

### `apps/mobile`

Primary audience:

- respondents scanning and applying on a phone
- founders receiving applications and chatting on a phone
- App Store and Google Play reviewers

Mobile should prioritize:

- native-feeling bottom tabs
- stack navigation
- map/location permission flows
- push notification readiness
- chat coordination
- account/profile settings
- report/block/delete flows
- store-review safe screens
- iOS and Android safe areas
- keyboard behavior

## Mobile App Stack

Recommended initial stack:

```text
Expo
React Native
TypeScript
Expo Router or React Navigation
TanStack Query
Supabase JS
expo-secure-store
expo-image-picker
expo-location
expo-notifications
react-native-safe-area-context
react-native-gesture-handler
react-native-reanimated
@gorhom/bottom-sheet or equivalent after compatibility check
```

Map decision:

- Start with a Korean-market-compatible native map strategy.
- Do not assume Kakao Web SDK can be reused.
- Evaluate:
  - native Kakao map library availability and maintenance
  - Naver Map React Native support
  - Google Maps feasibility for Korea-specific UX
  - web map fallback only if native SDK risk is too high

Payment decision:

- Do not implement payment in the first mobile migration phase.
- Keep reward display and interview coordination.
- Before payment implementation, write a dedicated payment policy and store
  review plan.
- Treat interview reward as a real-world/person-to-person service unless the
  business model changes into digital content or app functionality purchase.
- Avoid wording that implies Apple or Google handles interview reward payment.

Push notification decision:

- Add app architecture hooks early.
- Do not request push permission on first launch.
- Request permission only after a user reaches a clear notification value
  moment, such as chat coordination or selection updates.
- Backend must store device push tokens by user and platform.

## Screen Migration Map

### Auth

Source web files:

- `apps/web/src/features/auth/AuthScreen.tsx`
- `apps/web/src/features/auth/SplashScreen.tsx`
- `apps/web/src/features/auth/AuthProvider.tsx`

Mobile target:

- `apps/mobile/src/features/auth/`
- `apps/mobile/src/screens/auth/`

Mobile requirements:

- Native splash screen using Expo config.
- Login screen.
- Sign-up account step:
  - name
  - email
  - password
  - password confirmation
- Sign-up role step:
  - founder
  - respondent
  - both
- Password visibility toggles.
- Supabase Auth session persistence through secure storage.
- Email confirmation state copy if Supabase requires it.
- Keyboard-aware layout.

Do not port:

- DOM fixed layout.
- CSS safe-area variables.
- PWA splash implementation.

### Home

Source web files:

- `apps/web/src/pages/ExplorePage.tsx`
- `apps/web/src/features/interview-posts/components/OpportunityCard.tsx`
- `apps/web/src/features/interview-posts/components/OpportunityExpandedDetail.tsx`

Mobile target:

- `apps/mobile/src/screens/home/HomeScreen.tsx`
- `apps/mobile/src/features/interview-posts/components/MobileOpportunityRow.tsx`

Mobile requirements:

- Recent interview feed.
- Brand header and notification button.
- Compact vertical list.
- Tap row to expand/collapse.
- Applied/read states.
- Empty/loading/error states.
- No founder creation CTA on home.

Do not port:

- Desktop grid assumptions.
- CSS-only internal scroll behavior.

### Interviews

Source web files:

- `apps/web/src/pages/InterviewsPage.tsx`
- `apps/web/src/pages/InterviewDetailPage.tsx`
- `apps/web/src/pages/NewInterviewPage.tsx`
- `apps/web/src/pages/MyInterviewsPage.tsx`

Mobile target:

- `apps/mobile/src/screens/interviews/InterviewSearchScreen.tsx`
- `apps/mobile/src/screens/interviews/InterviewDetailScreen.tsx`
- `apps/mobile/src/screens/interviews/CreateInterviewScreen.tsx`
- `apps/mobile/src/screens/interviews/MyInterviewsScreen.tsx`

Mobile requirements:

- Search-first discovery.
- Filter bottom sheet:
  - mode
  - reward
  - near me
  - radius
- Detail screen with one primary CTA:
  - `신청하기`
  - `신청완료`
- Application form.
- My interviews:
  - applied interviews
  - founder posts only if founder tools are enabled
- Problem/report entry points.

Do not port:

- Web panel/detail split.
- DOM modal implementation.

### Map

Source web files:

- `apps/web/src/pages/MapPage.tsx`
- `apps/web/src/shared/map/kakaoMapLoader.ts`

Mobile target:

- `apps/mobile/src/screens/map/MapScreen.tsx`
- `apps/mobile/src/features/location/`

Mobile requirements:

- Request location on map tab entry with clear context.
- Native permission handling:
  - granted
  - denied
  - unavailable
  - limited/platform-specific cases if applicable
- Current location marker.
- Interview markers.
- Nearby interview bottom sheet.
- Selected interview floating card or bottom sheet detail.
- Region-based refresh policy.
- Preserve selected card if still in result set.
- No continuous background tracking.

Do not port:

- Kakao Maps Web SDK loader.
- DOM custom overlay code.
- Browser geolocation code.

### Chat

Source web files:

- `apps/web/src/pages/ChatPage.tsx`
- `apps/web/src/features/chat/`

Mobile target:

- `apps/mobile/src/screens/chat/ChatListScreen.tsx`
- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
- `apps/mobile/src/features/chat/`

Mobile requirements:

- Native chat list.
- Search and status filters.
- Unread count badges.
- Room action menu:
  - profile
  - mute
  - hide
  - report
  - block
- Chat thread:
  - left/right bubbles
  - system messages
  - interview context collapsible card
  - keyboard-aware composer
- Read tracking.
- Push notification integration later.

Do not port:

- Web fixed overlay implementation.
- CSS overflow assumptions.

### Profile And Settings

Source web files:

- `apps/web/src/pages/ProfilePage.tsx`
- `apps/web/src/pages/ProfileSubPage.tsx`
- `apps/web/src/features/profiles/`

Mobile target:

- `apps/mobile/src/screens/profile/ProfileScreen.tsx`
- `apps/mobile/src/screens/profile/AccountInfoScreen.tsx`
- `apps/mobile/src/screens/profile/RoleSettingsScreen.tsx`
- `apps/mobile/src/screens/profile/NotificationSettingsScreen.tsx`
- `apps/mobile/src/screens/profile/AppearanceSettingsScreen.tsx`
- `apps/mobile/src/screens/profile/DeleteAccountScreen.tsx`

Mobile requirements:

- Profile image picker.
- `내 활동` summary.
- Account info edit.
- Role settings.
- Notification settings placeholder/real implementation.
- Appearance settings for display-mode preferences.
- Terms/privacy/support/report links.
- Logout and account deletion text actions below version/company.
- `contentruck` company display.

### Support, Report, Legal

Source web files:

- `apps/web/src/pages/SupportPage.tsx`
- `apps/web/src/pages/LegalPage.tsx`

Mobile target:

- `apps/mobile/src/screens/support/SupportScreen.tsx`
- `apps/mobile/src/screens/support/ReportScreen.tsx`
- `apps/mobile/src/screens/legal/TermsScreen.tsx`
- `apps/mobile/src/screens/legal/PrivacyScreen.tsx`

Mobile requirements:

- In-app inquiry form.
- In-app report form.
- Account deletion request flow.
- Public support/deletion web URL remains available for store review.
- Legal content must match web content.

## Shared Package Plan

Start with `packages/contracts`, then split only when usage proves the boundary.

Initial package:

```text
packages/contracts/
  src/
    api/
      applications.ts
      chat.ts
      interview-posts.ts
      me.ts
      sessions.ts
      support.ts
    domain/
      roles.ts
      statuses.ts
      interviewModes.ts
    formatting/
      reward.ts
      distance.ts
      duration.ts
      phone.ts
    index.ts
```

Possible later packages:

```text
packages/api-client/
  -> endpoint functions and fetch error handling
  -> React Query hooks stay app-local

packages/auth/
  -> Supabase client factory
  -> platform storage adapter interface
  -> web and mobile providers stay app-local

packages/navigation/
  -> canonical route IDs
  -> link/deep-link builders
  -> push target route metadata

packages/domain/
  -> role/status labels
  -> radius presets
  -> pure workflow read models

packages/tokens/
  -> semantic color/spacing/radius values only
  -> no shared React components
```

Do not create all packages on day one. The first extraction should be
`packages/contracts`; the others should be introduced only when both web and
mobile need the same code.

Migration order:

1. Move pure TypeScript types from `apps/web/src/shared/api/types.ts`.
2. Move role helpers from `apps/web/src/shared/auth/roles.ts`.
3. Move pure formatting helpers from web feature components.
4. Move workflow read-model builders if they are DOM-independent.
5. Keep API clients app-local at first.
6. Extract `packages/api-client` only after both web and mobile use the same
   contract and error model.

Avoid extracting too early:

- Query hooks should probably stay app-local because web and mobile navigation,
  cache lifetime, and screen focus behavior will differ.
- UI-level format strings can diverge by platform.
- Auth providers should stay app-local because browser storage and native secure
  storage differ.
- Navigation implementation should stay app-local because browser history and
  native stacks differ.

## API And Auth Contract

Both clients should use the same backend:

```text
Supabase Auth
  -> client obtains access token
  -> client sends Authorization: Bearer <token>
  -> FastAPI verifies token
  -> FastAPI reads/writes Supabase Postgres
```

Web env:

```text
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_KAKAO_MAP_APP_KEY
VITE_SUPPORT_EMAIL
```

Mobile env:

```text
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SUPPORT_EMAIL
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
```

Backend-only secrets must remain backend-only:

- Supabase service role key.
- Supabase database URL.
- Kakao REST API key.
- JWT signing material.
- Private SSH keys.
- Payment provider secret keys.
- Push provider server keys.

## Navigation Architecture

Recommended mobile navigation:

```text
Root
  AuthStack
    Splash
    Login
    SignUpAccount
    SignUpRole

  AppTabs
    HomeStack
      Home
      InterviewDetail

    InterviewsStack
      InterviewSearch
      InterviewDetail
      CreateInterview
      MyInterviews
      ApplicationForm

    MapStack
      Map
      InterviewDetail

    ChatStack
      ChatList
      ChatThread
      CounterpartProfile

    ProfileStack
      Profile
      AccountInfo
      RoleSettings
      NotificationSettings
      LocationSettings
      Support
      Report
      Terms
      Privacy
      DeleteAccount
```

Bottom tabs:

- `홈`
- `인터뷰`
- `지도`
- `채팅`
- `프로필`

Rules:

- Detail screens push on top of the current stack.
- Chat thread hides tab bar if it improves keyboard and message UX.
- Create interview is visible only for founder-capable users.
- Role checks must be enforced by API, not only by mobile UI.

## Design Migration Policy

Use the current mobile web UI as the parity baseline, not as code to copy.

The first RN version should feel like the approved mobile web app translated
into native components. It should not be a new design exploration unless the
user explicitly asks for redesign.

Port these design decisions:

- Korean Toss-like copy tone.
- Bottom tab information architecture.
- Compact list density.
- Green/neutral/reward color semantics.
- 8px radius system unless native component requires otherwise.
- Clear primary actions.
- Applied/read states.
- Report/block/account deletion availability.
- Map bottom sheet interaction concept.
- Chat left/right bubble semantics.

Redesign these for mobile:

- Screen layout.
- Navigation transitions.
- Safe area.
- Keyboard avoidance.
- Native action sheets.
- Native bottom sheets.
- Native map marker rendering.
- Native image picker.
- Native permission prompts.

## Web Refocus Plan

After `apps/mobile` exists, refocus `apps/web`:

### Keep

- Public legal pages.
- Public support/deletion request pages.
- Login/signup.
- Founder dashboard style workflows.
- Interview browsing and detail for browser users.
- Desktop create interview flow.
- Desktop my interviews management.
- Chat fallback.

### Reduce Priority

- Phone-perfect PWA polish.
- Mobile standalone install UX.
- Mobile-only bottom sheet tuning.
- PWA splash as primary app splash.
- Mobile browser map micro-interactions.

### Later Web Enhancements

- Desktop founder workspace:
  - post management
  - applicants
  - schedule/session state
  - support/report review if admin is added
- Desktop respondent browser fallback:
  - apply to interview
  - open chat
  - account settings

## Implementation Phases

### Phase 0: Freeze Direction

Status: completed on 2026-05-25

Outputs:

- This plan exists in `docs/active`.
- `docs/active/README.md` references this plan.
- `AGENTS.md` is updated so future agents know:
  - `apps/web` is web-first React.
  - `apps/mobile` is Expo RN.
  - UI is not shared directly.
  - shared code belongs in `packages/contracts`.

Acceptance:

- No new PWA-specific mobile polish should be treated as the final mobile app
  unless the user explicitly asks.

### Phase 1: Prepare Shared Contracts

Status: completed on 2026-05-25

Files:

- `packages/contracts/package.json`
- `packages/contracts/tsconfig.json`
- `packages/contracts/src/**`
- `apps/web/package.json`
- root `package.json`
- `pnpm-workspace.yaml`

Steps:

1. Create a real `@hypofit/contracts` package.
2. Move shared TypeScript types into it.
3. Move role helper logic.
4. Move pure formatting helpers.
5. Keep existing `apps/web` import paths as compatibility shims.
6. Configure web TypeScript/Vite resolution for `@hypofit/contracts`.
7. Keep tests passing.

Acceptance:

- `apps/web` builds using shared contracts.
- No DOM code is inside `packages/contracts`.
- No Supabase service role or backend secret is referenced in contracts.
- Verified on 2026-05-25 with
  `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build`.

### Phase 2: Scaffold `apps/mobile`

Status: completed on 2026-05-25

Files:

- `apps/mobile/package.json`
- `apps/mobile/app.config.ts`
- `apps/mobile/eas.json`
- `apps/mobile/tsconfig.json`
- `apps/mobile/src/**`

Steps:

1. Create Expo app under `apps/mobile`.
2. Use TypeScript.
3. Configure monorepo package resolution.
4. Add `@hypofit/contracts`.
5. Add root-level mobile scripts.
6. Add TanStack Query provider scaffold.
7. Add navigation shell.
8. Add native theme tokens.
9. Add placeholder tabs and parity screen routes.
10. Add local iOS/Android run scripts.
11. Install Expo dependencies and update lockfile.
12. Add Supabase client with mobile-safe storage.
13. Add a temporary parity checklist file that maps each current mobile web
    screen to its RN target screen.

Acceptance:

- `pnpm --dir apps/mobile start` starts Expo.
- iOS simulator can open the app.
- Android emulator path is documented, even if not run immediately.
- Mobile app can hit `/api/v1/health`.

Completed on 2026-05-25:

- `apps/mobile` Expo Router TypeScript scaffold was created.
- Placeholder routes were added for auth, tabs, interview detail/create/my
  interviews, chat thread, profile subpages, support, report, terms, and
  privacy.
- Existing web app icons were copied into mobile scaffold assets.
- Supabase mobile client scaffold was added with `expo-secure-store` auth
  storage.
- Mobile API client scaffold and `/api/v1/health` query were added.
- Local API base URL fallback is platform-aware for iOS simulator and Android
  emulator; physical devices still require `EXPO_PUBLIC_API_BASE_URL`.
- `apps/mobile/docs/parity-checklist.md` was added.
- Dependencies were installed and `pnpm-lock.yaml` was updated.
- Verified with
  `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck`.
- Local FastAPI health smoke was verified with `/health` and
  `/api/v1/health` after starting Uvicorn on `127.0.0.1:8000`.
- Expo iOS simulator smoke was verified through Expo Go on iPhone 16 Pro.
- Expo Go's development entry path was normalized with `+native-intent.tsx`
  so `exp://127.0.0.1:8082/--/` opens the root splash screen.

Pending:

- Add real native UI screen by screen from the current mobile web baseline.
- Add authenticated Supabase session smoke.

### Phase 3: Auth And Session

Status: in progress; native auth scaffold started on 2026-05-25

Screens:

- Splash
- Login
- Sign-up account
- Sign-up role

Steps:

1. Implement Supabase Auth provider.
2. Persist session securely with `expo-secure-store`.
3. Sync app user through existing API.
4. Implement profile bootstrap.
5. Handle email confirmation state.
6. Implement logout.

Acceptance:

- Existing Supabase accounts can log in.
- New users can sign up and select a role.
- `Authorization: Bearer` token reaches FastAPI.
- App survives reload/reopen with session restored.

Completed on 2026-05-25:

- Added `AuthProvider` with Supabase session restore, secure storage
  persistence, auth-state subscription, sign-in, sign-up, and sign-out methods.
- Wrapped the mobile app shell with `AuthProvider`.
- Replaced auth placeholders with native login, account sign-up, role-selection,
  and splash/session-check screen implementations.
- Added mobile `/api/v1/me`, `/api/v1/me/sync`, and `/api/v1/me` update client
  helpers.
- Connected role selection to Supabase sign-up metadata and FastAPI profile
  sync when Supabase returns a session.
- Added an email-confirmation screen for Supabase projects that require email
  confirmation before returning a session.
- Fixed Expo Go `/--/` development route handling so local iOS smoke opens the
  splash route instead of the unmatched route page.
- Confirmed the iOS simulator renders the splash screen and reports
  `/api/v1/health` as connected.
- Hardened the mobile auth smoke path by fixing missing-profile 403 recovery,
  keyboard-safe placeholder layout, and non-development API URL requirements.
- Verified with
  `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck`.

Pending:

- Replace auth scaffold UI with the approved mobile login/splash/sign-up visual
  design.
- Add authenticated API smoke that proves `Authorization: Bearer` reaches
  FastAPI.
- Run the flow in the iOS simulator with real Supabase env values.

### Phase 4: Core Mobile Tabs

Status: in progress; home feed API-backed RN screen started on 2026-05-25

Implement in this order:

1. Home feed.
2. Interview search.
3. Interview detail and application.
4. My interviews.
5. Profile.
6. Support/report/legal.

Acceptance:

- Each implemented RN screen is compared against the current mobile web screen
  before it is considered complete.
- A respondent can find and apply to an interview.
- A founder-capable account can create a post.
- A user can see application state.
- A user can report a post/problem.
- A user can request account deletion.

Completed on 2026-05-25:

- Ported the mobile web home feed structure into `apps/mobile` as a native RN
  screen:
  - brand header
  - notification entry
  - "최근 올라온 인터뷰" panel
  - API-backed open interview list
  - row press expansion
  - read-state marking for signed-in users
  - application-state lookup for signed-in users
  - minimal "신청완료" state
  - detail and apply actions
  - native application form with validation
- Added mobile API clients and TanStack Query hooks for:
  - interview posts
  - applications
  - interview post views
- Fixed Expo Router tab screen names to match nested `*/index` routes.
- Verified iOS simulator renders the home tab. The local DB currently has no
  seeded demo posts, so the expected empty state is shown.
- Ported the interview search tab into `apps/mobile`:
  - `내 인터뷰` and founder-only `만들기` header actions
  - service/target/location text search
  - mode and reward filters
  - active filter chips
  - API-backed result list
  - shared row expansion, application, read-state, and applied-state behavior
- Ported the interview detail route into `apps/mobile`:
  - `/interviews/[postId]`
  - API-backed post detail
  - read-state marking with source `detail`
  - status/mode badges
  - reward and duration stats
  - shared application panel with optional initial apply state
  - report route handoff to `/support/report`
- Reused the home feed's RN opportunity row, expanded detail, and state-message
  components for the interview search/detail screens to keep interaction
  behavior consistent while the component system is still forming.
- Ported the `내 인터뷰` route into `apps/mobile`:
  - signed-in guard and empty state
  - 신청한 인터뷰 / 내 모집글 segmented control
  - API-backed application, post, and session reads
  - application read models for title, target, answer count, available times,
    and session time
  - founder post cards with applicant count and first applicant previews
  - applicant selection
  - applicant rejection with required rejection reason modal
  - rejection reason display
- Added mobile session API clients and query/mutation hooks for future session
  scheduling/completion/no-show actions.
- Ported the `모집글 만들기` route into `apps/mobile`:
  - founder-role guard
  - online interview post creation with validation
  - status, title, service summary, target condition, reward, duration, mode,
    and schedule fields
  - successful save redirects to `내 인터뷰`
  - offline/both mode is intentionally blocked until the native map/place
    picker is connected.
- Added NativeWind v4 styling infrastructure for `apps/mobile`:
  - `global.css`
  - `tailwind.config.js`
  - `metro.config.js` with `withNativeWind`
  - `nativewind-env.d.ts`
  - Babel preset configured with `jsxImportSource: "nativewind"`
- Converted current `apps/mobile` screen-level `StyleSheet.create` usage to
  NativeWind class names. Runtime `style` props remain only for stateful/native
  calculations such as pressed opacity.
- Verified no `StyleSheet.create` or `styles.*` references remain under
  `apps/mobile`.
- Removed the root-level `@types/react@18` dependency so React type packages are
  scoped to the web and mobile apps that actually need them.
- Ported the profile, settings, support, report, account deletion, terms, and
  privacy slice into `apps/mobile`:
  - profile header, role badge, activity counts, settings/help/legal menu,
    logout, and account deletion entry
  - account information read/edit flow wired to `useAuth().updateCurrentUser`
  - role, notification, and location settings screens with native app copy
  - support and report forms wired to `/api/v1/support/tickets`
  - account deletion request through the same support-ticket API
  - terms and privacy document screens using the same MVP legal content scope as
    web
  - `EXPO_PUBLIC_SUPPORT_EMAIL` exposed through the mobile env helper
- Verified the newly ported profile/support/legal screens no longer reference
  `ScreenPlaceholder`.

Migration hardening completed on 2026-05-25:

- Shortened Alembic revision ids so they fit Postgres/Alembic's default
  `alembic_version.version_num varchar(32)`.
- Made the location-coordinate migration tolerate local Postgres instances
  without PostGIS by adding normal latitude/longitude columns first and
  creating `location_point` only when PostGIS is available.
- Verified local Alembic head:
  `.venv/bin/alembic current` -> `0010_location_coordinates (head)`.
- Verified local public interview list endpoint:
  `GET /api/v1/interview-posts/?status=open&sort=newest` -> `[]`.

### Phase 5: Chat

Steps:

1. [done] Implement chat room list.
2. [done] Implement chat thread.
3. [done] Implement message send.
4. [done] Implement read/unread state.
5. [done] Implement room action menu.
6. [done] Implement counterpart profile sheet.
7. [partial] Implement report/block/mute/hide UI.
8. Add push-token data model plan before push goes live.

Acceptance:

- Chat room opens from application workflow.
- Messages render left/right correctly.
- Composer is keyboard-safe.
- Report/block entry points exist.
- Read status is preserved through backend API.

Completed on 2026-05-25:

- Added mobile chat API client and TanStack Query hooks:
  - room list
  - room detail
  - message list
  - send message
  - mark room read
  - update mute/hide settings
- Replaced the chat list placeholder with an API-backed native screen:
  - hidden rooms are excluded from the list
  - counterpart avatar/name
  - interview title
  - last message
  - relative time
  - unread count badge
  - muted state label
  - room action sheet
- Replaced the chat thread placeholder with an API-backed native screen:
  - interview summary card with expand/collapse
  - system messages centered
  - my messages on the right
  - counterpart messages on the left
  - keyboard-safe composer
  - send message mutation
  - mark-read mutation on room entry
- Added chat room actions available from mobile:
  - mute/unmute
  - hide from list
  - report route handoff
- Added counterpart profile surfaces in mobile chat:
  - tapping the avatar in the chat list opens a native profile sheet
  - tapping the counterpart area in the chat thread header opens the same sheet
  - the sheet shows avatar, name, role, one-line intro/fallback intro, and the
    connected interview title
  - report handoff includes chat-room target id, counterpart name, and interview
    title context

Remaining:

- True block state still needs a backend data model and moderation policy before
  it should be shown as an immediate client action.
- Explicit block action and backend block state handling.
- Push-token data model and native notification routing.

### Phase 6: Map And Location

Steps:

1. [done] Choose native map provider.
2. [done] Implement map screen.
3. [done] Implement current-location permission flow.
4. [done] Implement markers from API coordinates.
5. [done] Implement nearby bottom sheet.
6. [done] Implement selected interview preview.
7. [done] Implement region refresh behavior.
8. [done] Implement `내 근처` filter integration in interview search.

Acceptance:

- Entering map tab requests location only with clear context.
- Denied permission keeps manual browsing usable.
- No background location tracking exists.
- Markers and nearby list use backend coordinates.
- Native map bottom sheet, marker styling, selected preview, and floating
  controls must be visually compared against the approved phone-sized mobile
  web map before the map screen is considered parity-complete.

Completed on 2026-05-25:

- First replaced the mobile map placeholder with a dependency-free RN map
  surface:
  - API-backed open interview loading
  - coordinate-only post filtering
  - schematic marker layer based on stored latitude/longitude
  - selected interview preview card
  - nearby list section
  - detail route handoff to `/interviews/[postId]`
  - read-state marking with source `map`
- This is intentionally not the final native map implementation. Real
  pan/zoom, current-location permission, provider SDK rendering, and region
  refresh remain pending until the native map/location package decision is made.
- Chose the MVP native map path:
  - `react-native-maps` for rendering
  - `expo-location` for foreground-only current location
  - Kakao Local REST API through FastAPI for Korean place-search quality
  - Kakao Native Map SDK deferred to a dedicated upgrade plan
- Installed Expo SDK 53-compatible native packages:
  - `expo-location@18.1.6`
  - `react-native-maps@1.20.1`
- Replaced the schematic RN map with a real `MapView`:
  - foreground location permission request on map entry
  - current-position recenter button
  - user-location rendering when permission is granted
  - API-backed marker rendering from stored post coordinates
  - map center based `sort=distance` and `radius_m` querying
  - region-change refresh through `onRegionChangeComplete`
  - selected post preview and detail route handoff
- Added the mobile interview-tab `내 근처` filter:
  - requests foreground location at filter activation
  - queries the interview list API with `lat`, `lng`, `radius_m`, and
    `sort=distance`
  - falls back to a clear permission message when denied
- Added backend Kakao Local keyword-search proxy:
  - `GET /api/v1/places/search`
  - server-only `KAKAO_REST_API_KEY`
  - `lat`, `lng`, `radius_m`, and `limit` query support
  - mobile place-search client and hook scaffolding for post creation flow
- Implemented the native map interaction layer:
  - safe-area-aware `MapView` surface
  - buffered nearby result list to reduce flicker during region refetch
  - snap-based native bottom sheet with min/mid/max heights
  - sheet-attached current-location control
  - reward-first marker pills with selected/viewed states
  - selected interview preview, detail handoff, apply handoff, and read-state marking
- Implemented native post-creation place selection:
  - Kakao Local place search through the FastAPI proxy
  - selected place summary with road/address fallback
  - `nearby`/`exact` location precision toggle
  - offline/both interview validation requiring a selected place
  - location coordinate/source fields included in create input
- Ported auth/login/splash from scaffold to native mobile UI:
  - shared auth frame
  - brand header and centered elevated card
  - password visibility controls
  - sign-up role selection screen
  - email confirmation screen
- Added native Gmarket Sans loading:
  - `expo-font`
  - `apps/mobile/assets/fonts/GmarketSansTTF*.ttf`
  - mobile Tailwind/theme token font-family update

Completed on 2026-05-26:

- Tightened the RN interview search tab toward the approved phone-sized mobile
  web UI:
  - compact header with `인터뷰` title and short guidance copy
  - search icon inside the search field
  - icon-led filter button
  - removed the always-visible helper sentence between search and results
  - fixed active filter chip vertical alignment
  - added configurable `내 근처` radius chips: 1km, 3km, 5km, 10km, 20km
- Tightened the RN map tab:
  - default nearby radius aligned to 3km
  - map queries exclude online-only interviews
  - map mode filters support 전체, 대면, 대면/화상
  - restored region/place search overlay using the FastAPI Kakao Local proxy
  - restored current-location action in the map search overlay
  - restored the floating `목록` button above the bottom sheet
  - moved result count into the bottom sheet instead of the map header
  - simplified loading copy to `이 지역 인터뷰를 찾고 있어요.`
- Added the mobile parity and store-readiness gate to:
  - `AGENTS.md`
  - `apps/mobile/docs/parity-checklist.md`
  - `docs/reference/ui-final-qa-checklist.md`
  - this migration plan
- Verified:
  - `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck`
  - `git diff --check`

Remaining visual parity work:

- Run simulator visual QA against the approved phone-sized mobile web screens.
- Replace text-glyph controls with a single explicit native icon strategy.
- Regenerate app icon/adaptive icon/splash PNGs from the approved brand source.
- Fine-tune map marker shape and selected preview placement after simulator QA
  if it still diverges from the approved mobile web interaction.

### Phase 7: Native Capabilities

Add only after core flows work:

- Push notifications.
- Deep links.
- App links/universal links.
- Image picker hardening.
- Permission settings shortcuts.
- Crash/error monitoring.
- Store build metadata.

Acceptance:

- Permissions are requested at value moments.
- Privacy policy and store disclosures match actual SDK usage.
- Native capability can be disabled without breaking the core MVP loop.

### Phase 8: Store Readiness

Before submission:

1. Prepare reviewer demo accounts.
2. Confirm account deletion flow.
3. Confirm public deletion/support URL.
4. Confirm report/block/moderation workflow.
5. Confirm privacy policy.
6. Prepare App Store privacy nutrition labels.
7. Prepare Google Play Data safety form.
8. Prepare screenshots showing real workflows.
9. Verify backend tunnel/API uptime plan during review.
10. Verify Android target API requirement for current Play policy.

Acceptance:

- App can be reviewed without private instructions beyond demo credentials.
- Reviewer can create/login, browse, apply, chat, report, and request deletion.
- App does not look like a thin website wrapper.

## Data And API Gaps To Close

Before mobile app beta:

- Durable `user_blocks` table or equivalent backend enforcement.
- Push token table:
  - user id
  - platform
  - token
  - device id
  - enabled flags
- Account deletion request/admin handling.
- Moderation queue or operator guide.
- Optional file upload API wrapper for profile images instead of direct
  Supabase Storage client calls from every app.
- Chat pagination if message volume grows.
- API endpoint for scoped profile activity summary if public filtering becomes
  too expensive.

## Testing Plan

Web:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build
```

Mobile:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile test
```

API:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests -q
```

Manual mobile QA:

- iPhone SE class.
- Standard iPhone.
- Large iPhone.
- Android small/standard emulator.
- Login keyboard.
- Sign-up keyboard.
- Map permission allow/deny.
- Chat composer keyboard.
- Profile image upload.
- Report form.
- Account deletion form.

## Risks

### Risk: Rebuilding mobile UI doubles work

Mitigation:

- Share contracts and read models, not UI.
- Port screens in MVP order.
- Keep web mobile UI as visual reference until RN screens replace it.

### Risk: Expo native package compatibility

Mitigation:

- Prefer Expo-supported packages.
- Check New Architecture compatibility before adding map/bottom-sheet/native
  modules.
- Add one native capability at a time.

### Risk: Map provider lock-in

Mitigation:

- Define a mobile map adapter interface.
- Keep backend coordinates provider-neutral.
- Do not leak Kakao Web SDK assumptions into contracts.

### Risk: Store review rejection

Mitigation:

- Build native app experience, not WebView wrapper.
- Keep deletion/report/block/privacy flows visible.
- Use real demo data and reviewer account.
- Keep backend stable during review.

### Risk: Payment policy complexity

Mitigation:

- Defer payment implementation.
- Write separate payment policy plan.
- Do not imply platform-managed reward settlement until payment design is
  finalized.

## Definition Of Done

This migration plan can move to `docs/completed` when:

- `apps/mobile` exists and runs locally.
- `packages/contracts` is used by both web and mobile.
- Auth works in the mobile app.
- Main mobile tabs exist.
- Respondent can browse and apply from mobile.
- Founder-capable user can create/manage posts from mobile or the planned
  mobile scope explicitly defers founder creation.
- Chat thread works in mobile.
- Profile/support/report/account deletion work in mobile.
- Map/location screen works with native permission flow.
- `apps/web` has been re-scoped in docs as web/desktop-first.
- Store-readiness doc reflects RN/Expo app path instead of PWA-wrapper path.
- Web build and mobile typecheck pass.
