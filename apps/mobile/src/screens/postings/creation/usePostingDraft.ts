import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import type { InterviewPost } from "@hypofit/contracts";
import {
  clearPostingCreationDraft,
  clearPostingEditDraft,
  createInitialPostingCreationDraft,
  hasDraftContent,
  loadPostingCreationDraft,
  loadPostingEditDraft,
  savePostingCreationDraft,
  savePostingEditDraft,
  type PostingCreationDraft,
} from "@/features/postings/postingCreationDraft";
import { postingToEditDraft } from "@/features/postings/postingCreationPayload";

interface UsePostingDraftOptions {
  initialPost?: InterviewPost;
  onRestoreExit: () => void;
  shouldRestoreDraft: boolean;
  userId: string | null;
}

/** Account-scoped restore, serialized saves and background/unmount flushing. */
export function usePostingDraft({
  initialPost,
  onRestoreExit,
  shouldRestoreDraft,
  userId,
}: UsePostingDraftOptions) {
  // The edit screen is keyed by account/post; refetches must not restart draft restoration.
  const [editPost] = useState(initialPost);
  const [draft, setDraft] = useState<PostingCreationDraft>(
    () => initialPost ? postingToEditDraft(initialPost, createInitialPostingCreationDraft()) : createInitialPostingCreationDraft(),
  );
  const [editBaseline, setEditBaseline] = useState(draft);
  const editSnapshot = useRef({ baseline: editBaseline, draft });
  editSnapshot.current = { baseline: editBaseline, draft };
  const editSaved = useRef(false);
  const editSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"saving" | "saved" | "failed">(
    "saved",
  );

  useEffect(() => {
    if (!userId) return;
    if (editPost) {
      let cancelled = false;
      void loadPostingEditDraft(editPost.founder_id, editPost.id)
        .then((stored) => {
          if (cancelled) return;
          if (stored && stored.draft.type === (editPost.recruitment_type ?? "interview")) {
            setDraft({ ...stored.draft, entryMode: editPost.entry_mode ?? "application_required" });
            setEditBaseline(stored.baseline);
          }
          setIsDraftReady(true);
        })
        .catch(() => {
          if (cancelled) return;
          Alert.alert("저장한 수정 내용을 불러오지 못했어요", "현재 공고 내용으로 수정할까요?", [
            { text: "돌아가기", style: "cancel", onPress: onRestoreExit },
            { text: "현재 공고로 수정", onPress: () => setIsDraftReady(true) },
          ]);
        });
      return () => { cancelled = true; };
    }
    if (!shouldRestoreDraft) {
      setIsDraftReady(true);
      return;
    }

    let cancelled = false;
    void loadPostingCreationDraft(userId)
      .then((stored) => {
        if (cancelled) return;
        if (stored && hasDraftContent(stored)) {
          setDraft(stored);
        }
        setIsDraftReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setDraftStatus("failed");
        Alert.alert("작성 내용을 불러오지 못했어요", "저장된 초안은 유지했어요. 공고 목록에서 다시 시도해 주세요.", [
          { text: "돌아가기", onPress: onRestoreExit },
        ]);
      });
    return () => { cancelled = true; };
  }, [shouldRestoreDraft, editPost, onRestoreExit, userId]);
  const persistDraft = useCallback((override?: PostingCreationDraft) => {
    if (!userId || editSaved.current || !hasDraftContent(override ?? editSnapshot.current.draft)) return Promise.resolve();
    const snapshot = { ...editSnapshot.current, draft: override ?? editSnapshot.current.draft };
    editSaveQueue.current = editSaveQueue.current.catch(() => undefined).then(() =>
      editPost
        ? savePostingEditDraft(editPost.founder_id, editPost.id, snapshot)
        : savePostingCreationDraft(userId, snapshot.draft),
    );
    return editSaveQueue.current;
  }, [editPost, userId]);
  useEffect(() => {
    if (!isDraftReady || !hasDraftContent(draft)) return;
    setDraftStatus("saving");
    const timeout = setTimeout(
      () =>
        void persistDraft()
          .then(() => setDraftStatus("saved"))
          .catch(() => setDraftStatus("failed")),
      500,
    );
    return () => clearTimeout(timeout);
  }, [draft, isDraftReady, persistDraft]);
  useEffect(() => () => {
    if (isDraftReady && !editSaved.current) void persistDraft().catch(() => undefined);
  }, [isDraftReady, persistDraft]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" && isDraftReady) void persistDraft().catch(() => setDraftStatus("failed"));
    });
    return () => subscription.remove();
  }, [isDraftReady, persistDraft]);

  const completeDraft = async () => {
    editSaved.current = true;
    await editSaveQueue.current.catch(() => undefined);
    if (editPost) {
      await clearPostingEditDraft(editPost.founder_id, editPost.id).catch(() => undefined);
    } else if (userId) {
      await clearPostingCreationDraft(userId).catch(() => undefined);
    }
  };

  return {
    completeDraft,
    draft,
    draftStatus,
    editBaseline,
    isDraftReady,
    persistDraft,
    setDraft,
    setDraftStatus,
  };
}
