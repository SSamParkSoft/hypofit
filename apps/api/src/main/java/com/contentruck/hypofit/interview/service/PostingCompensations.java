package com.contentruck.hypofit.interview.service;

import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import java.util.List;
import java.util.Set;

public final class PostingCompensations {

    private static final Set<String> TYPES = Set.of(
            "cash", "gift_card", "points", "product", "coupon_or_access", "other", "none"
    );

    private PostingCompensations() {
    }

    public static List<PostingCompensation> normalize(List<PostingCompensation> compensations, int legacyRewardAmount) {
        List<PostingCompensation> normalized = compensations == null || compensations.isEmpty()
                ? legacy(legacyRewardAmount)
                : List.copyOf(compensations);

        boolean includesNone = normalized.stream().anyMatch(compensation -> "none".equals(compensation.type()));
        if (includesNone && normalized.size() != 1) {
            throw invalid("보상 없음은 다른 보상과 함께 설정할 수 없어요.");
        }

        for (PostingCompensation compensation : normalized) {
            if (compensation == null || compensation.type() == null || !TYPES.contains(compensation.type())) {
                throw invalid("보상 종류를 확인해 주세요.");
            }
            if ("cash".equals(compensation.type())
                    && (compensation.amount() == null || compensation.amount() < 0)) {
                throw invalid("현금 보상 금액을 확인해 주세요.");
            }
            if ("points".equals(compensation.type())
                    && (compensation.points() == null || compensation.points() < 0)) {
                throw invalid("포인트 보상 값을 확인해 주세요.");
            }
            if (!"cash".equals(compensation.type())
                    && !"points".equals(compensation.type())
                    && !"none".equals(compensation.type())
                    && (compensation.label() == null || compensation.label().trim().isEmpty())) {
                throw invalid("보상 내용을 입력해 주세요.");
            }
        }
        return normalized;
    }

    public static int legacyRewardAmount(List<PostingCompensation> compensations) {
        return compensations.stream()
                .filter(compensation -> "cash".equals(compensation.type()))
                .map(PostingCompensation::amount)
                .filter(amount -> amount != null && amount >= 0)
                .findFirst()
                .orElse(0);
    }

    public static List<PostingCompensation> legacy(int rewardAmount) {
        return rewardAmount > 0
                ? List.of(new PostingCompensation("cash", null, rewardAmount, "KRW", null, null, null))
                : List.of(new PostingCompensation("none", null, null, null, null, null, null));
    }

    private static HypofitValidationException invalid(String message) {
        return new HypofitValidationException(message, List.of(new FieldError("compensations", message)));
    }
}
