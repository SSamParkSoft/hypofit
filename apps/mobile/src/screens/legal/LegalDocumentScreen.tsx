import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getSafeReturnTo, goBackOrReplaceReturnTo } from "@/shared/navigation/backNavigation";
import { AppScreen } from "@/shared/ui/AppScreen";
import { privacyIntro, privacySections, termsIntro, termsSections } from "./legalContent";

export function LegalDocumentScreen({ type }: { type: "terms" | "privacy" }) {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const isTerms = type === "terms";
  const title = isTerms ? "이용약관" : "개인정보처리방침";
  const sections = isTerms ? termsSections : privacySections;
  const intro = isTerms ? termsIntro : privacyIntro;
  const explicitBackTo = getSafeReturnTo(params.returnTo);
  const backTo = explicitBackTo ?? "/(tabs)/profile";

  return (
    <AppScreen
      backTo={backTo}
      title={title}
      contentClassName="gap-6"
      onBack={() => goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/profile")}
    >
      <View className="gap-3">
        {intro.map((paragraph) => (
          <Text key={paragraph} className="text-[14px] leading-[23px] text-black">
            {paragraph}
          </Text>
        ))}
      </View>

      <View className="gap-8">
        {sections.map((section) => (
          <View key={section.title}>
            <Text className="text-[15px] font-bold leading-[23px] text-black">{section.title}</Text>
            <View className="mt-3 gap-3">
              {section.body.map((paragraph) => (
                <Text key={paragraph} className="text-[14px] leading-[23px] text-black">
                  {paragraph}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}
