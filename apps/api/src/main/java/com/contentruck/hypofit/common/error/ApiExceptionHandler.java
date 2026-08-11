package com.contentruck.hypofit.common.error;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.observability.RequestIdContext;
import jakarta.validation.ConstraintViolationException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private final HypofitProperties properties;

    public ApiExceptionHandler(HypofitProperties properties) {
        this.properties = properties;
    }

    @ExceptionHandler(HypofitException.class)
    ResponseEntity<Map<String, Object>> handleHypofitException(HypofitException exception, HttpServletRequest request) {
        List<com.contentruck.hypofit.common.error.FieldError> fieldErrors = exception instanceof HypofitValidationException validation
                ? validation.getFieldErrors()
                : null;
        Object detail = fieldErrors == null ? exception.getDebugMessage() : toFieldDetail(fieldErrors);
        return response(
                exception.getCode(),
                exception.getUserMessage(),
                exception.getStatus(),
                exception.getDebugMessage(),
                fieldErrors,
                detail,
                request
        );
    }

    @ExceptionHandler({
            MethodArgumentNotValidException.class,
            BindException.class,
            ConstraintViolationException.class,
            HttpMessageNotReadableException.class
    })
    ResponseEntity<Map<String, Object>> handleValidationException(Exception exception, HttpServletRequest request) {
        List<com.contentruck.hypofit.common.error.FieldError> fieldErrors = new ArrayList<>();
        Object detail = null;

        if (exception instanceof MethodArgumentNotValidException methodArgumentNotValidException) {
            for (FieldError error : methodArgumentNotValidException.getBindingResult().getFieldErrors()) {
                fieldErrors.add(new com.contentruck.hypofit.common.error.FieldError(error.getField(), error.getDefaultMessage()));
            }
            detail = toFieldDetail(fieldErrors);
        } else if (exception instanceof BindException bindException) {
            for (FieldError error : bindException.getBindingResult().getFieldErrors()) {
                fieldErrors.add(new com.contentruck.hypofit.common.error.FieldError(error.getField(), error.getDefaultMessage()));
            }
            detail = toFieldDetail(fieldErrors);
        } else if (exception instanceof ConstraintViolationException constraintViolationException) {
            constraintViolationException.getConstraintViolations().forEach(violation -> {
                String field = violation.getPropertyPath() == null ? "__root__" : violation.getPropertyPath().toString();
                int index = field.lastIndexOf('.');
                if (index >= 0 && index + 1 < field.length()) {
                    field = field.substring(index + 1);
                }
                fieldErrors.add(new com.contentruck.hypofit.common.error.FieldError(field, violation.getMessage()));
            });
            detail = toFieldDetail(fieldErrors);
        } else if (exception instanceof HttpMessageNotReadableException) {
            fieldErrors.add(new com.contentruck.hypofit.common.error.FieldError("__root__", "입력값을 확인해 주세요."));
            detail = toFieldDetail(fieldErrors);
        }

        return response(
                "validation_failed",
                "입력값을 확인해 주세요.",
                HttpStatus.UNPROCESSABLE_ENTITY.value(),
                exception.getMessage(),
                fieldErrors,
                detail,
                request
        );
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    ResponseEntity<Map<String, Object>> handleNoHandler(NoHandlerFoundException exception, HttpServletRequest request) {
        return notFound(exception.getMessage(), request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException exception, HttpServletRequest request) {
        return notFound(exception.getMessage(), request);
    }

    private ResponseEntity<Map<String, Object>> notFound(String debugMessage, HttpServletRequest request) {
        return response(
                "not_found",
                "요청한 정보를 찾지 못했어요.",
                HttpStatus.NOT_FOUND.value(),
                debugMessage,
                null,
                debugMessage,
                request
        );
    }

    @ExceptionHandler(ErrorResponseException.class)
    ResponseEntity<Map<String, Object>> handleErrorResponseException(ErrorResponseException exception, HttpServletRequest request) {
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode().value());
        HttpStatus resolved = status == null ? HttpStatus.INTERNAL_SERVER_ERROR : status;
        return response(
                httpErrorCode(resolved),
                httpUserMessage(resolved),
                resolved.value(),
                exception.getMessage(),
                null,
                exception.getMessage(),
                request
        );
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> handleUnexpected(Exception exception, HttpServletRequest request) {
        String requestId = RequestIdContext.from(request);
        withRequestIdInMdc(requestId, () -> logger.atError()
                .addKeyValue("event", "unexpected_error")
                .addKeyValue("method", request.getMethod())
                .addKeyValue("path", request.getRequestURI())
                .setCause(exception)
                .log("Unhandled request failure"));
        return response(
                "internal_error",
                "일시적인 오류가 발생했어요.",
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Unexpected server error.",
                null,
                exception.getMessage(),
                request
        );
    }

    private ResponseEntity<Map<String, Object>> response(
            String code,
            String message,
            int status,
            String debugMessage,
            List<com.contentruck.hypofit.common.error.FieldError> fieldErrors,
            Object detail,
            HttpServletRequest request
    ) {
        String requestId = RequestIdContext.from(request);
        ErrorResponse payload = new ErrorResponse(new ErrorDetail(
                code,
                message,
                status,
                requestId,
                properties.isProduction() ? null : debugMessage,
                fieldErrors
        ));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", payload.error());
        if (!properties.isProduction() && detail != null) {
            body.put("detail", detail);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.add(RequestIdContext.REQUEST_ID_HEADER, requestId);
        return ResponseEntity.status(status).headers(headers).body(body);
    }

    private List<Map<String, Object>> toFieldDetail(List<com.contentruck.hypofit.common.error.FieldError> fieldErrors) {
        List<Map<String, Object>> detail = new ArrayList<>();
        for (com.contentruck.hypofit.common.error.FieldError fieldError : fieldErrors) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("field", fieldError.field());
            item.put("message", fieldError.message());
            item.put("code", fieldError.code());
            detail.add(item);
        }
        return detail;
    }

    private String httpErrorCode(HttpStatus status) {
        return switch (status) {
            case UNAUTHORIZED -> "auth_required";
            case FORBIDDEN -> "permission_denied";
            case NOT_FOUND -> "not_found";
            case CONFLICT -> "conflict";
            case SERVICE_UNAVAILABLE -> "service_unavailable";
            default -> status.is5xxServerError() ? "server_error" : "request_failed";
        };
    }

    private String httpUserMessage(HttpStatus status) {
        return switch (status) {
            case UNAUTHORIZED -> "로그인이 필요해요.";
            case FORBIDDEN -> "권한이 없어요.";
            case NOT_FOUND -> "요청한 정보를 찾지 못했어요.";
            case CONFLICT -> "이미 처리된 요청이에요.";
            case SERVICE_UNAVAILABLE -> "서비스 연결이 불안정해요.";
            default -> status.is5xxServerError() ? "일시적인 오류가 발생했어요." : "요청을 처리하지 못했어요.";
        };
    }

    private void withRequestIdInMdc(String requestId, Runnable logAction) {
        String previousRequestId = MDC.get("request_id");
        boolean replaced = requestId != null && !requestId.equals(previousRequestId);
        if (replaced) {
            MDC.put("request_id", requestId);
        }
        try {
            logAction.run();
        } finally {
            if (replaced) {
                if (previousRequestId == null) {
                    MDC.remove("request_id");
                } else {
                    MDC.put("request_id", previousRequestId);
                }
            }
        }
    }
}
