package com.contentruck.hypofit.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    OpenAPI hypofitOpenApi() {
        return new OpenAPI()
                .info(new Info().title("Hypofit API").version("v1").description("인터뷰 참여자 모집과 운영 API"))
                .components(new Components().addSecuritySchemes(
                        "HTTPBearer",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer")
                ));
    }
}
