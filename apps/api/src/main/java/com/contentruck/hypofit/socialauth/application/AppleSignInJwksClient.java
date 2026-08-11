package com.contentruck.hypofit.socialauth.application;

import com.nimbusds.jose.jwk.JWK;
import java.util.Map;

public interface AppleSignInJwksClient {

    Map<String, JWK> fetchKeys();
}
