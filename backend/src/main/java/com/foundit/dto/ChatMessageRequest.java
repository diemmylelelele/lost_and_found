package com.foundit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatMessageRequest {

    private Long recipientId;

    @NotBlank(message = "Message content cannot be blank")
    private String content;

    private Long itemId;
}
