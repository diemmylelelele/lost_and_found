package com.foundit.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ItemRequest {

    @NotBlank(message = "Item name is required")
    private String name;

    private String description;

    private String category;

    private String locationFound;

    private String imageUrl;

    private LocalDate dateEvent;

    @JsonProperty("isPublic")
    private boolean isPublic = true;
}
