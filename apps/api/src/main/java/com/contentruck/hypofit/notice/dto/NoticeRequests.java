package com.contentruck.hypofit.notice.dto;

import com.contentruck.hypofit.notice.service.NoticeRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class NoticeRequests {
    private NoticeRequests() { }

    public record Write(
            @NotNull String type,
            @NotBlank @Size(max = 160) String title,
            @NotBlank String body
    ) {
        public NoticeRepository.NoticeWriteCommand toCommand() {
            return new NoticeRepository.NoticeWriteCommand(type == null ? null : type.trim().toUpperCase(), title == null ? null : title.trim(), body == null ? null : body.trim());
        }
    }
}
