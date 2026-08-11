# MVP Scope

## MVP Goal

The MVP should validate whether a paid interview matching flow can work between founders and real target respondents.

The first version should answer these questions:

- Will founders pay to recruit customer interview participants?
- Will respondents participate when reward, time, distance, and relevance are clear?
- Is online or offline interview participation easier to complete?
- Can the product screen for real target customers?
- Can the product reduce no-shows with a simple confirmation flow?

## Primary Users

### Founder

Initial founder acquisition can start with student founders, but the product should not assume all founders are students forever.

Founder jobs:

- Create an interview recruitment post.
- Define the service domain and target customer.
- Set interview reward, duration, location, and mode.
- Review applications.
- Select respondents.
- Confirm completion or no-show.

### Respondent

Respondents are not limited to students. They should match the actual target customer segment of each service.

Respondent jobs:

- Create a profile with experience and availability.
- Browse relevant interview opportunities.
- Check reward, time, distance, and mode.
- Apply with screening answers.
- Attend the confirmed interview.
- Confirm completion.

## First Product Flow

```text
Founder registers
  -> creates interview post
  -> post becomes visible
  -> respondent applies
  -> founder reviews applicants
  -> founder selects respondent
  -> interview session is scheduled
  -> interview is completed or marked no-show
```

## Founder MVP Features

- Sign up and log in.
- Create founder profile.
- Create interview post.
- Edit or close interview post.
- View applicants.
- Accept or reject applicants.
- Create confirmed interview session.
- Mark session complete.
- Mark no-show.
- Apply to other interview posts when they are also a valid target customer.

## Respondent MVP Features

- Sign up and log in.
- Create respondent profile.
- Browse open interview posts.
- View interview post details.
- Apply to interview post.
- Track application status.
- View confirmed sessions.
- Confirm attendance or completion.

Respondent-only accounts should not see interview post creation as a primary
surface. If they later need founder tools, they must switch or extend their
role from profile/settings before creating 모집글.

## Matching Requirements

Early matching should be simple and explicit.

Founder post includes:

- Target customer description.
- Required experience.
- Preferred location or online availability.
- Expected interview duration.
- Reward amount.
- Screening questions.

Respondent application includes:

- Answers to screening questions.
- Available time options.
- Location or online availability.
- Short explanation of relevant experience.

The first version does not need complex recommendation ranking. Manual founder review is acceptable and useful for learning what screening data matters.

## No-Show Prevention

Initial no-show prevention can be lightweight.

MVP mechanisms:

- Clear scheduled time.
- Reminder notification later if notification infrastructure exists.
- Founder and respondent completion confirmation.
- No-show status record.
- Future trust score or participation history can be derived later.

Do not build complex penalty, escrow, or automated payout logic in the first version unless payment validation becomes the central experiment.

## Out of Scope Or Constrained For Current MVP

Native app-store distribution is no longer out of scope because Hypofit now uses
the Expo React Native app as the iOS and Android release target. Store release
work should still stay focused on the interview matching loop and review
requirements, not on expanding product scope.

Still out of scope unless explicitly requested:

- Full payment automation or escrow.
- AI-based matching.
- AI-generated applicant ranking, scoring, selection, or rejection. A
  source-grounded reading summary is allowed only under
  `docs/active/ai-interview-and-applicant-summary-plan.md` and does not change
  manual decision ownership.
- Interview recording and transcription.
- Complex admin dashboard beyond the current MVP operator needs.
- Multi-tenant organization features.
- GPU-based processing.

These can be added after the basic recruitment and completion loop proves useful.
