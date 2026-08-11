package com.contentruck.hypofit.accountdeletion.application;

public interface AccountDeletionEmailGateway {

    String sendVerificationCode(String email, String verificationCode);
}
