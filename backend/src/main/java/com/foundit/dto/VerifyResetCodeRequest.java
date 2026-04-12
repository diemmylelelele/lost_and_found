package com.foundit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyResetCodeRequest {
    @NotBlank
    private String email;
    @NotBlank
    private String code;
}
