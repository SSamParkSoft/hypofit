import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/AuthProvider";
import { useInterviewPost } from "@/features/interview-posts/useInterviewPosts";
import { StateMessage } from "@/screens/home/HomeScreen";
import { CreateInterviewScreen } from "./CreateInterviewScreen";

export function EditInterviewScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { appUser, accessToken } = useAuth();
  const query = useInterviewPost(accessToken ? postId : null, accessToken);
  const post = query.data;
  const canEdit = post && appUser?.id === post.founder_id &&
    ["draft", "open", "closed"].includes(post.status) &&
    ["interview", "survey", "beta_test"].includes(post.recruitment_type ?? "interview");

  if (accessToken && canEdit) {
    return <CreateInterviewScreen key={`${appUser.id}:${post.id}`} initialPost={post} />;
  }
  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="px-4">
        <Pressable accessibilityRole="button" className="min-h-[44px] justify-center" onPress={() => router.back()}>
          <Text className="text-hypo-brand">돌아가기</Text>
        </Pressable>
        <StateMessage
          loading={Boolean(accessToken && query.isPending)}
          title={!accessToken ? "로그인이 필요해요." : query.isPending ? "공고를 불러오는 중이에요." : query.isError ? "공고를 불러오지 못했어요." : "이 공고를 수정할 수 없어요."}
        />
        {query.isError ? (
          <Pressable accessibilityRole="button" className="min-h-[44px] justify-center" onPress={() => void query.refetch()}>
            <Text className="text-hypo-brand">다시 시도</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
