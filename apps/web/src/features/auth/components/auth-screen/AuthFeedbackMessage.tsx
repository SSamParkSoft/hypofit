import { cn } from "../../../../shared/ui/cn";
import type { AuthFeedback } from "../../authScreenModel";

interface AuthFeedbackMessageProps {
  feedback: AuthFeedback;
  reserveSpace?: boolean;
}

export function AuthFeedbackMessage({
  feedback,
  reserveSpace = true,
}: AuthFeedbackMessageProps) {
  return (
    <div className={cn(reserveSpace && "min-h-6")}>
      {feedback ? (
        <p
          className={cn(
            "text-sm font-bold leading-6",
            feedback.tone === "error" ? "text-hypo-danger" : "text-hypo-brand",
          )}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
