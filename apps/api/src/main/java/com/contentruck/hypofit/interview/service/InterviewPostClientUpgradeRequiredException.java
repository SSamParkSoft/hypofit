package com.contentruck.hypofit.interview.service;

import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class InterviewPostClientUpgradeRequiredException extends InterviewPostQueryException {
    public InterviewPostClientUpgradeRequiredException(UUID postId, String recruitmentType) {
        super(
                "client_upgrade_required",
                "최신 버전으로 업데이트한 뒤 다시 확인해 주세요.",
                HttpStatus.UPGRADE_REQUIRED,
                "Client capability missing for recruitment type %s on interview post %s"
                        .formatted(recruitmentType, postId)
        );
    }
}
