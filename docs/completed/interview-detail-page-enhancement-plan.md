# Interview Detail Page Enhancement Plan

Status: completed

Last updated: 2026-05-29

## Goal

Make the interview detail page materially different from the expanded row in
the interview tab.

The interview tab expanded row is a quick preview for scanning and first-level
decision making. The detail page should be the page a respondent reads before
committing to apply.

## Current Limitation

The current `InterviewPost` API response includes:

- title
- service summary
- target description
- reward amount
- duration
- interview mode
- schedule options
- location fields
- status
- founder id

It does not include a founder profile object. Therefore founder name, profile
image, bio, team name, response metrics, and trust history cannot be rendered
accurately without extending the API contract.

## Detail Page Information Architecture

### 1. Hero Summary

Purpose: confirm the user is viewing the right interview.

Content:

- status chip
- mode chip
- title
- service summary
- reward and duration highlights

### 2. Interview Conditions

Purpose: explain what participation requires.

Content:

- schedule
- mode
- location when offline or both
- expected duration
- reward amount

### 3. Target Respondent

Purpose: help the respondent decide if they are a fit.

Content:

- target description
- short note that matching experience should be written in the application

### 4. Founder / Recruiter Context

Purpose: create trust before applying.

Current MVP content:

- founder id short reference
- message that founder profile will be shown when profile API is connected
- statement that application opens a chat after the founder reviews it

Future API content:

- founder `UserSummary`
- profile image
- founder/team name
- one-line bio
- created post count
- completed interview count
- response rate or average reply time

### 5. Application Guidance

Purpose: reduce low-quality applications.

Content:

- write relevant experience
- propose available times
- use chat for final coordination
- report suspicious requests

### 6. Apply Section

Purpose: final conversion.

Content:

- application form or completed state
- no duplicate detail button

## Implementation Notes

- Keep the detail page more structured than the list row.
- Use section blocks and clear labels, not another large nested dashboard.
- Do not fake founder information. Show only available data now and document
  the API gap.
- Keep `신고하기` available in the header.

## QA Checklist

- [x] Detail page looks meaningfully richer than the expanded list row in the
  iOS 26.5 Expo Go smoke.
- [x] Location appears only when offline participation is possible and location
  data exists.
- [x] Founder section does not invent unavailable profile data.
- [x] Application create works against the deployed API.
- [ ] Detail form-level submit visual smoke still needs Expo confirmation.
- [x] TypeScript check passes in the latest mobile validation run.

## Implementation Update

As of 2026-05-29:

- Expo Go smoke opened a deployed-data detail page successfully.
- The current detail page is now visually distinct from the interview list row:
  it includes hero summary, interview conditions, target respondent guidance,
  founder context, and an application-prep section.
- The old placeholder founder profile label and sliced founder id were removed.
  Until the API returns founder profile data, the section is phrased as
  application/coordination guidance instead of pretending profile data exists.
- This document stays active only because detail form-level Expo submit QA and
  founder summary API enrichment are still open.
