package com.lws.staff_management.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class ResendLoginOtpRequest {

    @NotBlank(message = "Challenge ID is required")
    private String challengeId;

    public ResendLoginOtpRequest() {}

    public ResendLoginOtpRequest(String challengeId) {
        this.challengeId = challengeId;
    }

    public String getChallengeId() { return challengeId; }
    public void setChallengeId(String challengeId) { this.challengeId = challengeId; }
}
