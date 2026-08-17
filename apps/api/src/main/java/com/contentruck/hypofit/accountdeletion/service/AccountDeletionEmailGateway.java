package com.contentruck.hypofit.accountdeletion.service;

public interface AccountDeletionEmailGateway {

    String sendVerificationCode(String email, String verificationCode);
}
