package com.contentruck.hypofit.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    OpenAPI hypofitOpenApi() {
        return new OpenAPI().components(new Components().addSecuritySchemes(
                "HTTPBearer",
                new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer")
        ));
    }
}
