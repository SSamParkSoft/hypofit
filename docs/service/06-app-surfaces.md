# App Surfaces

Status: service-source-of-truth

Last updated: 2026-08-08

## Native Mobile Surface

`apps/mobile` is the primary product app.

Routing is Expo Router based.

Important route groups:

```text
app/(auth)       social-login entry, role/legal onboarding, splash;
                 legacy email routes remain non-public compatibility surfaces
                 and must not act as fallback auth
app/auth         OAuth/OIDC callback completion and recovery
app/(tabs)       home, interviews, map, chat, profile
app/interviews   shared detail route
app/support      support, feedback, report
app/legal        privacy and terms
app/notifications
app/notice
```

Important implementation mapping:

```text
app/_layout.tsx
  -> root bootstrap, AppProviders, fonts, Sentry, root Stack

app/(tabs)/_layout.tsx
  -> bottom tab shell, auth redirect, hidden tab bar on chat thread,
     map tab reselect behavior

app/(auth)/*
  -> SplashScreen, social-only LoginScreen, SignUpRoleScreen
  -> SignUpAccountScreen and EmailConfirmationScreen are retained legacy paths,
     not current public entry points and should stay hidden or redirect

app/auth/*
  -> provider callback completion, requested-route recovery, and safe error UI

app/(tabs)/home/index.tsx
  -> HomeScreen

app/(tabs)/interviews/index.tsx
  -> InterviewSearchScreen

app/interviews/[postId].tsx
  -> InterviewDetailScreen shared by home, interviews, map, chat,
     notifications, and deep links

app/(tabs)/interviews/new.tsx
  -> CreateInterviewScreen

app/(tabs)/interviews/my-interviews.tsx
  -> MyInterviewsScreen, including my applications and my posts

app/(tabs)/map/index.tsx
  -> MapScreen, mapSheet.ts, mapTabEvents.ts

app/(tabs)/chat/index.tsx
  -> ChatListScreen

app/(tabs)/chat/[roomId].tsx
  -> ChatThreadScreen

app/(tabs)/chat/schedule.tsx
  -> ScheduleSessionScreen

app/(tabs)/profile/*
  -> ProfileScreen, AccountInfoScreen, RoleSettingsScreen,
     NotificationSettingsScreen, AppearanceSettingsScreen,
     DeleteAccountScreen

app/support/*
  -> SupportScreen, FeedbackScreen, ReportScreen

app/legal/*
  -> PrivacyScreen, TermsScreen
```

The bottom tab bar contains:

- home,
- interviews,
- map,
- chat,
- profile.

Chat thread hides the bottom tab bar so the message composer can own the bottom
safe area. Tab reselection behavior is intentional for interview/chat/map roots.

Screen implementations live under `apps/mobile/src/screens`. Feature hooks live
under `apps/mobile/src/features`. Shared API clients, UI components, navigation
helpers, formatters, diagnostics, and theme tokens live under
`apps/mobile/src/shared`.

Mobile route files should remain thin wrappers. Put screen UI in
`src/screens/*`, server-state hooks in `src/features/*`, and reusable primitives
in `src/shared/*`.

## Mobile Styling

Use NativeWind for static layout and component styling. Runtime style props are
acceptable for:

- safe-area values,
- animated/gesture values,
- map containers,
- keyboard offsets,
- native measurements,
- pressed states where needed.

Avoid new screen-level `StyleSheet.create` blocks unless there is a clear native
runtime reason.

## Web Surface

`apps/web` is a React/Vite app.

Responsibilities:

- public legal pages,
- public account deletion page,
- PWA/install fallback,
- possible admin/operator web surfaces,
- Vercel deployment.

The web app can have a different desktop information architecture. Do not force
mobile bottom sheets or phone-specific patterns into desktop web.

Important web implementation mapping:

```text
apps/web/src/app/App.tsx
  -> path-based router/gatekeeper, auth splash, AppShell mounting

apps/web/src/pages/*
  -> ExplorePage, InterviewsPage, InterviewDetailPage,
     NewInterviewPage, MyInterviewsPage, MapPage, ChatPage,
     ProfilePage, SupportPage, LegalPage, NotificationsPage,
     AccountDeletionPage, InstallPage, AuthCallbackBridgePage,
     AdminPage

apps/web/src/shared/ui/*
  -> AppShell, Button, Field, Badge, Empty/Loading/Error states,
     confirmation actions, back links
```

Web is page-driven and currently uses path navigation rather than Expo Router.
Keep web API/env behavior separate from mobile API/env behavior.

## Shared Contracts

`packages/contracts` exposes:

- API response/input types,
- domain enums,
- formatting helpers,
- legal constants/content.

Use it for pure shared knowledge. Do not share React DOM or React Native UI
components through contracts.

Shared read-model and formatting logic should be preferred over duplicating
status labels directly in screen files.

## Infra Surface

`infra` contains deployment and runtime support:

- local PostgreSQL Docker Compose,
- Lightsail API Compose, deploy script, Nginx config, and pinned SSH host key.

Production uses the memory-limited Lightsail Compose definition under
`infra/lightsail`; the root Compose file is for local PostgreSQL only.
