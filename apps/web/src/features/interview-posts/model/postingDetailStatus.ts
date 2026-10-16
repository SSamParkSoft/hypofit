import type { InterviewPost } from "@hypofit/contracts";

// Survey opening and new submission both require a future deadline on the server.
export function getPostingDetailStatus(post: InterviewPost, now = Date.now()): InterviewPost["status"] {
  if (post.status === "open" && post.recruitment_type === "survey" &&
      post.participation_deadline_at && Date.parse(post.participation_deadline_at) <= now) {
    return "closed";
  }
  return post.status;
}
