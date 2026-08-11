package com.contentruck.hypofit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class HypofitApplication {

    public static void main(String[] args) {
        SpringApplication.run(HypofitApplication.class, args);
    }
}
