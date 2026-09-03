package com.contentruck.hypofit.notice.controller;

import com.contentruck.hypofit.notice.dto.NoticeResponses;
import com.contentruck.hypofit.notice.service.NoticeService;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notices")
@io.swagger.v3.oas.annotations.tags.Tag(name = "공지사항")
public class NoticeController {
    private final NoticeService service;
    public NoticeController(NoticeService service) { this.service = service; }

    @GetMapping
    public List<NoticeResponses.NoticeResponse> list() {
        return service.listPublished().stream().map(NoticeResponses.NoticeResponse::from).toList();
    }

    @GetMapping("/{id}")
    public NoticeResponses.NoticeResponse get(@PathVariable UUID id) {
        return NoticeResponses.NoticeResponse.from(service.getPublished(id));
    }
}
