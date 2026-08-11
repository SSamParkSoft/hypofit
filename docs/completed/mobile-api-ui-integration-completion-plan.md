# Mobile API and UI Integration Completion Plan

Status: completed

Last updated: 2026-06-08

## Progress

### 2026-05-29

Completed:

- Confirmed the deployed mobile/API base URL remains
  `https://hypofit-api.bukae.co.kr`.
- Post-deploy public API smoke passed:
  - `GET https://hypofit-api.bukae.co.kr/health -> 200 OK`
  - `GET https://hypofit-api.bukae.co.kr/api/v1/health -> 200 OK`
  - `GET https://hypofit-api.bukae.co.kr/api/v1/health/ready -> 200 OK`
- Treat public API availability and deployment as complete for the current
  mobile integration work.
- Backend route availability is no longer the main blocker. The remaining work
  is Expo client wiring smoke, auth/session verification, screen-level API
  smoke, and unfinished lifecycle UI.
- Ran Expo Go smoke on iOS 26.5 / iPhone 17 Pro simulator against
  `https://hypofit-api.bukae.co.kr`.
- Confirmed logged-in screens render deployed API data for:
  - home feed with role-aware progress summary and recent interview posts
  - interview search list with real application/viewed state
  - interview detail page with real post data
  - my interviews route with respondent and founder-side data for the seeded
    `both` account
  - create-interview form entry
  - map tab with nearby posts and markers
  - notification center empty state
  - account deletion request screen
  - support inquiry list
  - report form
  - chat room list
- Fixed remaining mobile self-owned-post routes that pointed to the nonexistent
  `/interviews/my` path. Home, interview search, detail, and map now route to
  `/interviews/my-interviews`.
- Deployed API smoke confirmed application creation and duplicate protection:
  applying to a non-owned open post returned `201`, and immediately applying to
  the same post again returned `409`.

### 2026-06-05

Completed:

- Map place search was upgraded from submit-only search to debounced
  autocomplete in the Expo mobile app.
- Selecting a map search result now recenters the map, clears competing
  marker/list/group state, and refreshes nearby interview posts from the
  selected place area.
- The map tab reselect path now returns the map surface to the normal nearby
  interview state instead of preserving a stale group/list/detail selection.
- FastAPI `/places/search` now trims and validates query whitespace before
  calling Kakao.

Still open:

- Do not mark Expo mobile/API integration complete yet.
- Simulator or real-device smoke is still required for the new map
  autocomplete flow, permission denial/retry, current-location retry,
  create-interview place search/submit, chat room read-badge behavior,
  account-deletion submit, profile update/image upload, and founder/respondent
  session lifecycle paths.

### 2026-05-27

Completed:

- Deployed the local `places` API files to the GPU FastAPI runtime:
  - `apps/api/app/core/config.py`
  - `apps/api/app/api/v1/router.py`
  - `apps/api/app/api/v1/routes/places.py`
  - `apps/api/app/services/places.py`
  - `apps/api/app/schemas/places.py`
- Restarted `hypofit-api.service`.
- Verified the GPU route list now includes `/places/search`.
- Verified local GPU API:

```text
GET http://127.0.0.1:8000/api/v1/places/search?query=안산&lat=37.296513&lng=126.837080&radius_m=20000&limit=3
-> 200 OK
```

- Verified public API through EC2/Nginx/reverse tunnel:

```text
GET https://hypofit-api.bukae.co.kr/api/v1/places/search?query=안산&lat=37.296513&lng=126.837080&radius_m=20000&limit=2
-> 200 OK
```

- Local WIP: fixed remaining mobile auth redirect paths and added a safe
  `returnTo` login redirect. This must be committed separately with the mobile
  app tree after excluding `.env`, `.expo`, and `node_modules`.
- Validation:
  - `apps/api/tests/test_places_routes.py`: 2 passed.
  - `apps/mobile` typecheck: passed.
  - `git diff --check` for touched files: passed.
- Added duplicate application protection:
  - `applications` now has a unique constraint on
    `(interview_post_id, respondent_id)`.
  - duplicate application attempts now return `409 Conflict`.
  - route-level regression coverage was added in
    `apps/api/tests/test_authorization.py`.
- Added self-application protection:
  - the API rejects applying to a post created by the current user.
  - mobile home, interview search, interview detail, and map selected-post
    surfaces route owned posts to `내 인터뷰` instead of opening application
    submission.

## Goal

Bring the Expo mobile UI and FastAPI backend into a testable MVP state where
every visible mobile tab either uses real API data or is clearly documented as a
planned/static surface.

This document separates:

- implemented locally in code.
- deployed and reachable on the GPU API server.
- visible in UI but not backed by a real API yet.
- implemented in API/hook form but not surfaced in UI yet.

## Current Deployment Status

Public API base URL:

- `https://hypofit-api.bukae.co.kr`

Confirmed after deploy:

- `GET /health` passed.
- `GET /api/v1/health` passed.
- `GET /api/v1/health/ready` passed.
- `GET /api/v1/places/search` returned Kakao results through the public domain.

Mobile-facing backend routes are now deployed and reachable through the current
API host, including:

- `/api/v1/me`
- `/api/v1/interview-posts/`
- `/api/v1/interview-post-views/`
- `/api/v1/applications/`
- `/api/v1/chat/rooms/`
- `/api/v1/sessions/`
- `/api/v1/support/tickets`
- `/api/v1/places/search`

The GPU `.env` already had `KAKAO_REST_API_KEY`; after deploying the updated
`Settings` class, Kakao keyword search is reachable through the public API
domain.

Treat deployed API availability as completed. The remaining risk is end-to-end
Expo behavior, not whether the API host is up.

## Mobile Screen Integration Inventory

Unless a section says otherwise, "Current state" below means the code and route
integration exist. It does not mean simulator/device smoke is complete.

### Auth

Screens:

- `apps/mobile/src/screens/auth/SplashScreen.tsx`
- `apps/mobile/src/screens/auth/LoginScreen.tsx`
- `apps/mobile/src/screens/auth/SignUpAccountScreen.tsx`
- `apps/mobile/src/screens/auth/SignUpRoleScreen.tsx`
- `apps/mobile/src/screens/auth/EmailConfirmationScreen.tsx`

Current state:

- Uses Supabase Auth directly through `apps/mobile/src/shared/api/supabase.ts`.
- Syncs app profile with FastAPI through `meApi.sync`.
- Login/session restore is implemented.
- Signup role selection is implemented.

Needed:

- Final demo-account QA.
- Expo smoke for session restore, expired-session handling, and protected-route
  redirects.
- Better error copy for Supabase-specific failures.
- Password reset flow is linked visually but still needs complete screen/API
  behavior if not already wired through Supabase.

### Home

Screen:

- `apps/mobile/src/screens/home/HomeScreen.tsx`

Current API usage:

- `useInterviewPosts({ status: "open", sort: "newest" })`
- `useApplications(accessToken)`
- `useInterviewPostViews(accessToken)`
- `useCreateApplication(accessToken)`
- `useMarkInterviewPostViewed(accessToken)`

Current state:

- Real interview post feed.
- Real application state.
- Real viewed-post state.
- Role-aware progress summary.
- Inline apply flow.

Local WIP:

- Fixed login route consistency in shared `ExpandedOpportunity`.
- Added login return path support for application entry points.

Needed:

- Decide whether home should allow full application form or only route to
  detail for final MVP.
- Expo smoke for feed load against the deployed API is complete.
- Viewed-post state appears in the real feed; mutation side effects still need
  a focused before/after smoke.
- Deployed API application submit smoke passed. Expo form-level submit visual
  smoke is still useful, but backend write-path risk is closed.
- Add empty/error treatment that matches current mobile visual system.

### Interview Search

Screen:

- `apps/mobile/src/screens/interviews/InterviewSearchScreen.tsx`

Current API usage:

- `useInterviewPosts(...)`
- `useApplications(accessToken)`
- `useInterviewPostViews(accessToken)`
- `useCreateApplication(accessToken)`
- location permission through `expo-location`

Current state:

- Real post list.
- Real mode/reward/location filtering.
- Real application state and application creation.
- Real viewed-post tracking.

Needed:

- Duplicate/self-application behavior should be re-smoked against the deployed
  API and Expo screen flow.
- Current search is local text filtering over fetched posts, not a backend
  full-text search.
- Decide whether founder-owned posts should be hidden from respondent apply
  actions when the same user is also `both`.
- Expo smoke for list rendering against the deployed API is complete.
- Route paths should consistently use `/(auth)/login` when auth redirects are
  touched again.

### Interview Detail

Screen:

- `apps/mobile/src/screens/interviews/InterviewDetailScreen.tsx`

Current API usage:

- `useInterviewPost(postId)`
- `useApplications(accessToken)`
- `useCreateApplication(accessToken)`
- `useMarkInterviewPostViewed(accessToken)`

Current state:

- Real post detail.
- Real existing application check.
- Real application create.
- Real viewed-post tracking.

Needed:

- Founder summary is currently limited by `InterviewPostRead`; API does not
  include founder `UserSummary`.
- Add founder profile/team metadata if detail page should show credibility.
- Align detail apply payload keys with the rest of app (`experience` vs
  `relevant_experience`) or normalize server-side.
- Expo smoke for detail open against the deployed API is complete.
- Viewed mark side effects are still open.
- Deployed API application submit smoke passed.

### Create Interview

Screen:

- `apps/mobile/src/screens/interviews/CreateInterviewScreen.tsx`

Current API usage:

- `useCreateInterviewPost(accessToken)`
- `usePlaceSearch(...)`

Current state:

- Real interview post creation.
- Offline/both posts require a selected location.
- Place search depends on `/api/v1/places/search`.

Resolved blocking issue:

- GPU API now exposes `/api/v1/places/search`, so deployed mobile place search
  can call Kakao through FastAPI.

Needed:

- Consider debounce search rather than submit-only search.
- Expo smoke for create form entry is complete.
- Offline/both location selection and submit are still open.
- Add draft editing/publishing flow if drafts are kept in MVP.

### My Interviews

Screen:

- `apps/mobile/src/screens/interviews/MyInterviewsScreen.tsx`

Current API usage:

- `useInterviewPosts()`
- `useApplications(accessToken)`
- `useSessions(accessToken)`
- `useUpdateApplicationStatus(accessToken)`

Current state:

- Real applications for current respondent.
- Real founder post/application management.
- Founder can select/reject applicants.
- Rejection reason is sent to API.
- Sessions are listed and joined into read models.

Needed:

- Session scheduling UI is missing even though API/hook exists.
- Completion/no-show UI is missing even though API/hook exists.
- Need clearer path from selected applicant to chat/schedule.
- Backend should enforce allowed status transitions more explicitly.
- Expo smoke for the seeded `both` account seeing both applied and created
  interview lists is complete.
- Self-owned post entry points now route to the existing `내 인터뷰` route.
- Founder/respondent lifecycle smoke is still open for select/reject -> schedule
  -> complete/no-show.

### Map

Screen:

- `apps/mobile/src/screens/map/MapScreen.tsx`

Current API usage:

- `useInterviewPosts({ lat, lng, radiusM, sort: "distance" })`
- `useDebouncedPlaceSearch(...)`
- `usePlaceSearch(...)` for non-map place-search surfaces
- `useInterviewPostViews(accessToken)`
- `useMarkInterviewPostViewed(accessToken)`
- location permission through `expo-location`

Current state:

- Real coordinate-based interview query in local API code.
- Real map marker data from backend coordinates.
- Search UI uses debounced autocomplete for 2+ character queries and keeps
  keyboard submit as a fallback.
- Map bottom sheet/list/marker preview is UI-complete enough for testing.

Resolved blocking issue:

- Deployed API now includes `/api/v1/places/search`.

Needed:

- Re-test selected place -> map center -> nearby interviews refresh on
  simulator/TestFlight.
- Expo smoke is still open for permission prompt, place search, and
  nearby-results refresh on device/simulator.
- Keep Kakao native map SDK as later enhancement per
  `docs/reference/kakao-native-map-upgrade-plan.md`.

### Chat List

Screen:

- `apps/mobile/src/screens/chat/ChatListScreen.tsx`

Current API usage:

- `useChatRooms(accessToken)`
- `useUpdateChatRoomSettings(roomId, accessToken)`
- counterpart profile modal uses `useBlockedUsers`, `useBlockUser`, and
  `useUnblockUser`
- report navigation to support form

Current state:

- Real chat room list.
- Real hidden/muted settings.
- Real unread counts from backend.
- Real user block/unblock action in counterpart profile modal.
- Real object-specific report entry into support ticket flow.

Needed:

- Delete/hide currently maps to `is_hidden`; decide copy carefully.
- Dedicated blocked-users management list is still missing.
- Empty state was recently improved, but still needs device QA.
- Unread-count and read-state behavior still needs Expo smoke.

### Chat Thread

Screen:

- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`

Current API usage:

- `useChatRoom(roomId, accessToken)`
- `useChatMessages(roomId, accessToken)`
- `useMarkChatRoomRead(roomId, accessToken)`
- `useSendChatMessage(roomId, accessToken)`
- `useUpdateChatRoomSettings(roomId, accessToken)`
- counterpart profile modal uses `useBlockedUsers`, `useBlockUser`, and
  `useUnblockUser`

Current state:

- Real message list.
- Real send message.
- Real mark-read.
- Real mute toggle.
- Real profile/report modal entry.
- Real block/unblock action from counterpart profile modal.
- Blocked send failures now surface a user-facing error instead of failing
  silently.

Needed:

- Polling or realtime updates are not implemented; messages update after send
  and query invalidation only.
- Schedule creation from chat is missing.
- Interview summary can route to detail, but scheduling/confirmation actions
  should be designed.
- Persistent blocked-state banner or disabled composer is still missing outside
  the modal.
- Mark-read side effects and unread badge clearing still need deployed mobile
  smoke.

### Profile

Screens:

- `apps/mobile/src/screens/profile/ProfileScreen.tsx`
- `apps/mobile/src/screens/profile/AccountInfoScreen.tsx`
- `apps/mobile/src/screens/profile/RoleSettingsScreen.tsx`
- `apps/mobile/src/screens/profile/NotificationSettingsScreen.tsx`
- `apps/mobile/src/screens/profile/LocationSettingsScreen.tsx`
- `apps/mobile/src/screens/profile/DeleteAccountScreen.tsx`

Current API usage:

- `useApplications`
- `useChatRooms`
- `useSessions`
- `useInterviewPosts`
- `updateCurrentUser` through `meApi.update`
- profile image upload directly to Supabase Storage bucket `profileimage`

Current state:

- Real profile stats.
- Real account update.
- Real role update exists through account info.
- Real profile image upload through Supabase Storage.

Needed:

- RoleSettings is intentionally explanatory and links to AccountInfo, where the
  real role update is implemented.
- Notification settings are UI-only; no API or push token registration.
- Location settings are permission guidance only.
- Account deletion screen uses the dedicated account deletion request API.
- Profile image upload bypasses FastAPI; acceptable for MVP if bucket policy is
  intentionally public, but document privacy/storage policy clearly.
- Expo smoke for profile update, role/account paths, and image upload is still
  open.

### Notifications

Screen:

- `apps/mobile/src/screens/notifications/NotificationsScreen.tsx`

Current state:

- Real in-app notifications API is implemented and the signed-in empty state was
  verified in Expo smoke.
- Push token registration is intentionally not implemented yet.

Needed:

- Native store-ready option: add Expo push token registration, notification
  preferences, and privacy policy updates.
- Deployed mobile smoke with non-empty notification data is still open.

### Support and Report

Screens:

- `apps/mobile/src/screens/support/SupportScreen.tsx`
- `apps/mobile/src/screens/support/ReportScreen.tsx`
- `apps/mobile/src/screens/support/SupportForm.tsx`

Current API usage:

- `useCreateSupportTicket(accessToken)`
- `POST /api/v1/support/tickets`

Current state:

- Real support/report ticket creation.
- Object-specific report context is passed from chat/profile flows.

Needed:

- No support ticket list/admin moderation UI.
- No email notification to support mailbox.
- No block/restriction side effect from reports.
- Expo submit smoke and target-metadata verification remain open.

### Legal

Screens:

- `apps/mobile/src/screens/legal/TermsScreen.tsx`
- `apps/mobile/src/screens/legal/PrivacyScreen.tsx`

Current state:

- Static content.

Needed:

- Add native app/privacy language for location, profile image, support/report,
  chat, and push notifications before store submission.
- Keep web and mobile legal content synchronized.

## Backend/API Gap Inventory

### Deployed API Availability

- Public API base URL: `https://hypofit-api.bukae.co.kr`
- Public health checks passed:
  - `GET /health`
  - `GET /api/v1/health`
  - `GET /api/v1/health/ready`
- Public places search smoke passed:
  - `GET /api/v1/places/search`

This deployment status is complete enough for current mobile QA. Remaining work
below should be treated as integration or lifecycle QA, not API hosting setup.

### Implemented and Used

- Auth profile sync/update: `/api/v1/me`, `/api/v1/me/sync`
- Interview posts: list/detail/create/close
- Applications: list/create/status update
- Chat: list/get/messages/send/read/settings
- Blocks: list/block/unblock through chat counterpart profiles
- Sessions: list/create/complete/no-show
- Support tickets: create
- Interview post views: list/mark viewed

### Implemented and Deployed on 2026-05-27

- Places search:
  - `GET /api/v1/places/search`
  - Kakao REST API keyword search
  - `KAKAO_REST_API_KEY` config field

### API Exists But UI Does Not Fully Use

- `POST /api/v1/sessions/`
- `POST /api/v1/sessions/{session_id}/complete`
- `POST /api/v1/sessions/{session_id}/no-show`

Mobile hooks exist:

- `useCreateSession`
- `useCompleteSession`
- `useMarkNoShow`

But there is no complete scheduling/finish/no-show UI flow yet.

### UI Exists But API Is Missing

- Notifications tab.
- Notification settings/push preferences.
- Account deletion request as a first-class API.
- Support/admin review UI and email delivery.

### Backend Hardening Needed

- Duplicate application prevention:
  - completed locally on 2026-05-27 with `0011_unique_applications`.
  - still needs migration deployment to the GPU runtime before the production
    API can rely on the database constraint.
- Self-application policy:
  - completed locally on 2026-05-27.
  - users cannot apply to their own interview posts even if they have `both`
    role.
  - mobile application CTAs are hidden/replaced for owned posts.
- Application status state machine:
  - restrict invalid transitions.
  - require rejection reason for rejected.
  - decide who can cancel.
- Chat authorization and moderation:
  - hide/mute exists.
  - block/report split now exists, but dedicated blocked-user management
    outside chat remains open.
- Places API resilience:
  - expose Kakao error status in logs.
  - return safe user-facing 503.
  - add smoke tests with `안산`, `한양대학교 ERICA`, `사리역`.

## Implementation Plan

### Phase 0: Unblock Deployed Map and Place Search

Status: completed on 2026-05-27

Objective: make visible map/search UI work on the current deployed API.

Tasks:

1. Completed: deploy local API changes for places search to GPU server.
2. Completed: confirm `.env` has `KAKAO_REST_API_KEY`.
3. Completed: restart `hypofit-api.service`.
4. Completed: smoke test from GPU:

```text
GET /api/v1/places/search?query=안산&lat=37.296513&lng=126.837080&radius_m=20000&limit=5
```

5. Completed: smoke test from mobile API base URL.
6. Pending device QA: confirm create-interview place search and map place search
   both return visible results in the running Expo app.

Acceptance:

- Searching `안산` no longer shows `지역 검색을 불러오지 못했어요`.
- Result selection moves the map and refreshes nearby interviews.
- Offline post creation can select a Kakao place and submit.

### Phase 1: Finish Core MVP Workflow UI

Objective: complete the MVP loop after selection.

Tasks:

1. Add scheduling UI after founder selects an applicant.
2. Allow founder to create a session for a selected application.
3. Show scheduled session detail in My Interviews and Chat Thread.
4. Add complete/no-show actions for scheduled sessions.
5. Add no-show report path into support/report if needed.
6. Keep chat as the coordination surface but do not make chat the source of
   durable schedule state.

Acceptance:

- Founder can select applicant -> create schedule -> respondent sees schedule.
- Either party can see scheduled session state.
- Completion/no-show state changes are reflected in My Interviews.

### Phase 2: Backend Contract Hardening

Objective: prevent obvious data bugs before external testing.

Tasks:

1. Completed and deployed-smoked: add duplicate application prevention.
2. Completed locally: decide and enforce self-application behavior.
3. Add status transition validation.
4. Improve API error responses for application create/update.
5. Add remaining tests for selected/rejected status changes and chat side
   effects.

Acceptance:

- Duplicate 신청 does not create duplicate rows/chat rooms after the migration
  is deployed.
- Invalid status transition is rejected.
- Rejection reason is consistently stored and visible.

### Phase 3: Notifications and Settings Decision

Objective: avoid shipping misleading static settings.

Decision updated on 2026-05-29:

- Use real in-app notification records for the mobile notification center.
- Keep native push notification permission deferred.
- Do not claim OS push delivery until `expo-notifications`, push tokens, and
  Play/Data safety updates are implemented.

Status:

- Completed API-backed notification client work in:
  - `apps/mobile/src/screens/notifications/NotificationsScreen.tsx`
  - `apps/mobile/src/shared/api/notifications.ts`
  - `apps/mobile/src/features/notifications`
- Completed copy hardening in:
  - `apps/mobile/src/screens/profile/NotificationSettingsScreen.tsx`
- Profile menu copy now uses `알림 안내` instead of promising configurable
  notification delivery.

Option C: Native push-ready.

- Add Expo push token registration.
- Add notification preferences API.
- Update privacy/legal/store docs.

Recommended MVP path:

- Keep real in-app notifications for mobile.
- Verify non-empty demo notification data before closing the notification
  active plan.
- Delay native push until store-build work explicitly starts.

### Phase 4: Profile, Support, and Moderation

Objective: make trust and support flows credible for app testing.

Tasks:

1. Completed: account deletion uses a first-class deletion request API.
2. Completed: user block/unblock model/API is wired into chat profile flows.
3. Add support ticket email notification or document the manual operator path.
4. Document profile image storage policy and bucket visibility.
5. Completed: Role Settings is explanatory and links to Account Info role
   editing.

Acceptance:

- Report/support submissions are actionable by the operator.
- Block/delete UI does not promise behavior that backend cannot enforce.
- Profile image behavior is documented for privacy review.

### Phase 5: UI Consistency and QA

Objective: make the API-backed UI feel consistent across tabs.

Tasks:

1. Normalize top-level tab headers across Home, Interview, Chat, Profile.
2. Normalize empty/loading/error states by context.
3. Normalize search fields through `SearchField`.
4. Remove remaining `router.push("/login")` paths in mobile screens.
5. Device QA:
   - iPhone with Dynamic Island.
   - small iPhone.
   - Android phone.
6. Confirm no visible mock labels remain.

Acceptance:

- Every visible primary tab has a clear real-data state.
- Empty states do not look like nested cards.
- Search input baseline is stable after typing, clearing, and retyping.
- All login redirects reach the correct Expo auth route.

## Recommended Next Work Order

1. Smoke the Expo API client against
   `https://hypofit-api.bukae.co.kr`, including auth/session restore and
   protected-route redirects.
2. Device-QA map and create-interview place search after the deployed API smoke
   already passed.
3. Re-smoke respondent apply plus founder select/reject against the deployed
   API.
4. Deploy and smoke the duplicate-application constraint if it is not already
   active on the GPU runtime.
5. Add and QA session scheduling/completion/no-show UI.
6. Verify chat unread/read badge, profile update/image upload, and
   account-deletion submit in Expo.
7. Re-smoke mobile notifications with a demo user that has non-empty
   notification data.
8. Add account deletion/block/support operational follow-through.

## Verification Checklist

- [x] Public API base URL `https://hypofit-api.bukae.co.kr` is deployed and
  reachable.
- [x] `GET /health`, `GET /api/v1/health`, and
  `GET /api/v1/health/ready` pass after deploy.
- [x] GPU route list includes `/api/v1/places/search`.
- [x] `안산` place search returns Kakao results.
- [x] Expo build under test points to `https://hypofit-api.bukae.co.kr`.
- [x] Existing session restore works in Expo Go on iOS 26.5 simulator.
- [x] Home/search/detail screen-load smoke passes against the deployed API.
- [x] Application submit smoke passes against the deployed API.
- [x] Map tab renders deployed nearby posts and markers in Expo Go.
- [x] Map search result selection refreshes nearby posts in code.
  - Manual simulator/TestFlight QA remains open in
    `docs/completed/map-place-search-autocomplete-plan.md`.
- [ ] Create interview location search works for offline/both posts.
- [x] `sehyeon73@gmail.com` sees both founder and respondent data.
- [x] Duplicate application is prevented in deployed API.
- [ ] Founder can select/reject and schedule in Expo.
- [ ] Scheduled session can be completed or marked no-show in Expo.
- [ ] Chat unread count changes after reading a room.
- [x] Support/report ticket creation persists target metadata.
- [x] Notification tab is real API-backed UI; empty state rendered in signed-in
  Expo smoke.
- [x] Notification tab copy no longer claims push delivery.
- [ ] Profile image upload and profile update still work.
