package com.foundit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ItemRequest {

    @NotBlank(message = "Item name is required")
    private String name;

    private String description;

    private String category;

    private String locationFound;

    private String imageUrl;

    private boolean isPublic = true;
}
