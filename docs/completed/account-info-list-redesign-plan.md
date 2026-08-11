# Account Info List Redesign Plan

Status: completed

Last updated: 2026-06-09

## Context

The profile tab has moved toward a plain native settings-list style: section
labels, full-width separators, transparent rows, and fewer card containers.
`AccountInfoScreen` still used `SectionCard` for both read-only account details
and the edit form, which made it feel inconsistent with the current profile
information architecture.

The reference surface guidance still allows cards for profile and form
surfaces, but the current product direction for this screen is a flatter
settings detail page. This implementation treats account info as a profile
subpage that should inherit the profile list style, not as a standalone
decision card.

## UX Decision

- Use no outer card container for account details.
- Keep the `AppScreen` header and the right-side `수정` action.
- Show read-only information as a simple `기본 정보` section.
- Keep editable fields in a plain form area with the same page background.
- Use compact text action for `취소` and a small brand-colored pill for `저장`.
- Keep email read-only because account email is auth-owned in the current MVP.
- Preserve the existing phone formatter and profile update API behavior.

## Implementation

- Updated `apps/mobile/src/screens/profile/AccountInfoScreen.tsx`.
- Removed `SectionCard` and `PrimaryButton` usage from the account info screen.
- Removed the explanatory header description to reduce visual weight.
- Rebuilt read mode as transparent information rows.
- Rebuilt edit mode as a plain form section with compact actions.
- Kept `role: appUser?.role ?? "respondent"` in profile update payload so
  account edits do not accidentally clear the user's current role.

## Verification

- Mobile typecheck should be run after the implementation.
- `git diff --check` should be run before committing.
- Visual simulator/device confirmation is intentionally deferred during active
  UI iteration unless the user asks for it.
