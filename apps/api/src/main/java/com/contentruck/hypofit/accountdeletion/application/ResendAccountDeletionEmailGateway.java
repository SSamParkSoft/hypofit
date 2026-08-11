package com.contentruck.hypofit.accountdeletion.application;

import com.contentruck.hypofit.common.config.HypofitProperties;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class ResendAccountDeletionEmailGateway implements AccountDeletionEmailGateway {

    private final RestClient restClient;
    private final HypofitProperties properties;

    public ResendAccountDeletionEmailGateway(RestClient.Builder restClientBuilder, HypofitProperties properties) {
        this.restClient = restClientBuilder.build();
        this.properties = properties;
    }

    @Override
    public String sendVerificationCode(String email, String verificationCode) {
        if (!StringUtils.hasText(properties.getResendApiKey()) || !StringUtils.hasText(properties.getResendFromEmail())) {
            return "verification_email_not_configured";
        }

        Map<String, Object> payload = Map.of(
                "from", properties.getResendFromEmail(),
                "to", List.of(email),
                "subject", "[Hypofit] 계정 삭제 인증번호",
                "html", html(verificationCode),
                "text", text(verificationCode)
        );

        try {
            restClient.post()
                    .uri("https://api.resend.com/emails")
                    .header("Authorization", "Bearer " + properties.getResendApiKey())
                    .header("Content-Type", "application/json")
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            return "verification_email_sent";
        } catch (RestClientException | IllegalArgumentException exception) {
            return "verification_email_failed";
        }
    }

    private String html(String verificationCode) {
        return """
                <div style="margin:0;padding:0;background:#f6f7f8;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7f8;">
                    <tr>
                      <td align="center" style="padding:32px 16px;">
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background:#ffffff;border-radius:18px;">
                          <tr>
                            <td style="padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                              <div style="font-size:15px;font-weight:700;color:#176B5D;margin-bottom:18px;">Hypofit</div>
                              <h1 style="margin:0 0 14px;font-size:22px;line-height:1.35;font-weight:800;color:#111827;">계정 삭제 인증번호를 입력해 주세요</h1>
                              <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#4B5563;">Hypofit 화면에 아래 숫자 6자리를 입력해 주세요.</p>
                              <div style="margin:0 0 22px;padding:18px 20px;border-radius:14px;background:#F0F7F4;text-align:center;font-size:30px;letter-spacing:8px;font-weight:800;color:#176B5D;">%s</div>
                              <p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#6B7280;">인증번호는 10분 동안 사용할 수 있어요.</p>
                              <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">요청하지 않았다면 이 메일은 무시해 주세요. 도움이 필요하면 %s로 연락해 주세요.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
                """.formatted(verificationCode, properties.getSupportEmail());
    }

    private String text(String verificationCode) {
        return """
                Hypofit 계정 삭제 인증번호입니다.

                인증번호: %s
                인증번호는 10분 동안 사용할 수 있습니다.

                요청하지 않았다면 이 메일은 무시해 주세요. 도움이 필요하면 %s로 연락해 주세요.
                """.formatted(verificationCode, properties.getSupportEmail());
    }
}
