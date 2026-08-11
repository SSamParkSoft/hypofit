# Users And Jobs

Status: service-source-of-truth

Last updated: 2026-07-02

## User Roles

Hypofit has one account system with role-based capabilities.

### Founder

A founder creates and manages interview posts. Initial acquisition may focus on
student founders, but the product should not hardcode founders as students.

Founder jobs:

- Create a recruitment post.
- Describe the service and customer segment.
- Set reward, time, interview mode, location, and schedule options.
- Review applications.
- Select or reject applicants.
- Coordinate through chat.
- Schedule, complete, or report a problem.
- Receive reviews over time as a trust signal.

### Respondent / Interviewer

A respondent is a real target customer for a specific post. Respondents are not
limited to students.

Respondent jobs:

- Maintain a profile.
- Browse and search interview posts.
- Check whether their experience matches the request.
- Apply with relevant experience and available times.
- Chat after applying.
- Attend and confirm completion.
- Report or block unsafe users.

### Both

Some users can both create posts and apply to other posts.

Role behavior:

- `founder`: can use founder tools and can apply to interviews.
- `respondent`: can browse, apply, chat, and manage profile, but should not see
  post creation as a primary action.
- `both`: can use both founder and respondent surfaces.

Role is a product entry mode, not a separate account identity. Backend ownership
and permissions still decide whether a user can modify a specific resource.

### Operator / Admin

Operators handle support, reports, moderation, notifications, health checks, and
review-account operations. Admin surfaces are support tools, not part of the
core respondent/founder product loop.

## Reviewer Account

Store reviewer accounts should have deterministic data that demonstrates:

- login,
- home/interview/map/chat/profile,
- application status,
- support/report/account deletion paths,
- notification behavior if needed.

Reviewer demo data should not leak into ordinary production user feeds unless
intentionally scoped.

## User Trust Expectations

Because Hypofit touches real meetings and reward promises, users must be able
to:

- understand who they are interacting with,
- see the terms before applying,
- report inappropriate behavior,
- block a counterpart,
- delete their account,
- reach support,
- understand that Hypofit does not currently guarantee payment.
