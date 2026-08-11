import { router } from "expo-router";
import { SupportForm } from "./SupportForm";

export function FeedbackScreen() {
  return (
    <SupportForm
      mode="feedback"
      onSubmitted={() => {
        router.replace({ pathname: "/(tabs)/profile", params: { toast: "feedback_submitted" } });
      }}
    />
  );
}
