# Hypofit Profile Activity Summary Plan

Status: completed

Last updated: 2026-05-25

## Purpose

The profile page should not feel empty, but it should also avoid placeholder
concepts that are not backed by product data. The removed "trust record" card
was too abstract for the current MVP because it did not expose real completion
or no-show data.

Replace it with a simple "My Activity" summary that reflects the user's current
workflow surface.

## Completion Note

Completed on 2026-05-25.

- Profile now shows a concrete `내 활동` summary.
- Counts are backed by applications, chat rooms, scheduled sessions, and
  founder-only posts.
- Founder-only `모집` appears only when the user can use founder tools.
- Account info APIs, bio, phone normalization, and chat-profile bio display are
  implemented.

## UX Direction

Use a compact mobile-friendly summary area:

```text
내 활동
신청 0건
채팅 0건
예정 0건
모집 0건  // founder or both only
인터뷰를 신청하거나 모집하면 여기에 쌓여요.
```

This is clearer because:

- the labels map directly to real product activity
- zero counts are natural for a new account
- the card can be backed by existing API data
- it leaves room for future trust/quality signals once completion and no-show
  history has real weight

## Data Source

Use existing frontend query hooks:

- `useApplications(accessToken)` for application count
- `useChatRooms(accessToken)` for coordination room count
- `useSessions(accessToken)` for scheduled session count
- `useInterviewPosts()` then filter by `founder_id === appUser.id` for founder
  post count, shown only when the user can use founder tools

No backend change is needed for the first version.

## Copy Rules

- Keep labels short: `신청`, `채팅`, `예정`, and founder-only `모집`.
- Use `건` consistently for counts.
- Use one short helper sentence.
- Do not call this a trust score until real completion/no-show history is
  surfaced.

## Follow-Up

- Add click navigation from each stat to its tab if profile sub-navigation
  becomes useful.
- Replace public post filtering with a scoped founder summary endpoint if the
  public list grows large.
- Add completion/no-show summaries only after the MVP workflow has reliable
  session history.

## Account Info API

The profile account page now uses authenticated account APIs instead of static
frontend-only rows.

- `GET /api/v1/me`: returns the current app user after Supabase bearer-token
  verification and local app profile lookup.
- `PATCH /api/v1/me`: updates editable account fields on `app_users`.
- Editable fields: `name`, `bio`, `phone`, `role`.
- Read-only fields for now: `email`, `id`, profile image storage metadata.
- Profile image upload remains on the existing Supabase Storage + `me/sync`
  path until image-specific backend APIs are added.

Profile bio policy:

- Store a short one-line introduction on `app_users.bio`.
- The API accepts up to 120 characters and collapses internal whitespace.
- The bio is shown in chat counterpart profile sheets so users can quickly
  understand who they are coordinating with.

Phone number policy:

- Store phone numbers in normalized Korean display format.
- Mobile example: `010-1234-5678`.
- Seoul example: `02-1234-5678`.
- Browser input may contain digits, spaces, hyphens, or `+82`; the API strips
  non-digits and normalizes `82` country-code input to a leading `0`.
- Blank phone input is stored as `null`.
- Non-domestic numbers and values that cannot become a 10~11 digit Korean phone
  number are rejected by the API.
