package com.contentruck.hypofit.notice.controller;

import com.contentruck.hypofit.admin.service.AdminAccessService;
import com.contentruck.hypofit.notice.dto.NoticeRequests;
import com.contentruck.hypofit.notice.dto.NoticeResponses;
import com.contentruck.hypofit.notice.service.NoticeService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/notices")
@io.swagger.v3.oas.annotations.tags.Tag(name = "운영자 · 공지사항")
public class AdminNoticeController {
    private final AdminAccessService adminAccess;
    private final NoticeService service;
    public AdminNoticeController(AdminAccessService adminAccess, NoticeService service) {
        this.adminAccess = adminAccess;
        this.service = service;
    }

    @GetMapping
    public List<NoticeResponses.NoticeResponse> list(@AuthenticationPrincipal Jwt jwt) {
        adminAccess.requireAdmin(jwt);
        return service.listAll().stream().map(NoticeResponses.NoticeResponse::from).toList();
    }

    @PostMapping
    public NoticeResponses.NoticeResponse create(
            @Valid @RequestBody NoticeRequests.Write request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return NoticeResponses.NoticeResponse.from(service.create(adminAccess.requireAdmin(jwt).id(), request.toCommand()));
    }

    @GetMapping("/{id}")
    public NoticeResponses.NoticeResponse get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        adminAccess.requireAdmin(jwt);
        return NoticeResponses.NoticeResponse.from(service.get(id));
    }

    @PatchMapping("/{id}")
    public NoticeResponses.NoticeResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody NoticeRequests.Write request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return NoticeResponses.NoticeResponse.from(service.update(adminAccess.requireAdmin(jwt).id(), id, request.toCommand()));
    }

    @PostMapping("/{id}/publish")
    public NoticeResponses.NoticeResponse publish(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return NoticeResponses.NoticeResponse.from(service.publish(adminAccess.requireAdmin(jwt).id(), id));
    }

    @PostMapping("/{id}/archive")
    public NoticeResponses.NoticeResponse archive(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return NoticeResponses.NoticeResponse.from(service.archive(adminAccess.requireAdmin(jwt).id(), id));
    }
}
