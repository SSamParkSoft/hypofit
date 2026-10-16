import type { ChatWorkflow } from "@hypofit/contracts";

export type ChatWorkflowResponse = Omit<ChatWorkflow, "counterpart_review_submitted"> & {
  primaryAction?: ChatWorkflow["primary_action"];
  secondaryAction?: ChatWorkflow["secondary_action"];
  dangerAction?: ChatWorkflow["danger_action"];
  myReview?: ChatWorkflow["my_review"];
  counterpartReviewSubmitted?: boolean;
  counterpart_review_submitted?: boolean;
};

// The deployed workflow API currently uses camelCase; the app contract uses snake_case.
export function normalizeChatWorkflow(response: ChatWorkflowResponse): ChatWorkflow {
  return {
    step: response.step,
    title: response.title,
    description: response.description,
    primary_action: "primary_action" in response ? response.primary_action : response.primaryAction,
    secondary_action: "secondary_action" in response ? response.secondary_action : response.secondaryAction,
    danger_action: "danger_action" in response ? response.danger_action : response.dangerAction,
    session: response.session,
    attendance: response.attendance,
    reward: response.reward,
    my_review: "my_review" in response ? response.my_review : response.myReview,
    counterpart_review_submitted: response.counterpart_review_submitted ?? response.counterpartReviewSubmitted ?? false,
  };
}
