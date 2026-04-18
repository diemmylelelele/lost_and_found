package com.foundit.controller;

import com.foundit.dto.ClaimVerificationRequest;
import com.foundit.dto.ItemRequest;
import com.foundit.dto.ItemResponse;
import com.foundit.model.ItemStatus;
import com.foundit.model.User;
import com.foundit.service.ItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    public ResponseEntity<List<ItemResponse>> getItems(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(itemService.getItems(status, category, keyword));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemResponse> getItem(@PathVariable Long id) {
        return ResponseEntity.ok(itemService.getItemById(id));
    }

    @PostMapping("/lost")
    public ResponseEntity<ItemResponse> reportLost(
            @Valid @RequestBody ItemRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(itemService.createItem(request, ItemStatus.LOST, currentUser.getId()));
    }

    @PostMapping("/found")
    public ResponseEntity<ItemResponse> reportFound(
            @Valid @RequestBody ItemRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(itemService.createItem(request, ItemStatus.FOUND, currentUser.getId()));
    }

    @PostMapping("/{id}/claim")
    public ResponseEntity<ItemResponse> claimItem(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(itemService.claimItem(id, currentUser.getId()));
    }

    /** Non-valuable: claimer requests claim, finder gets notified */
    @PostMapping("/{id}/claim/simple")
    public ResponseEntity<ItemResponse> requestSimpleClaim(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(itemService.requestSimpleClaim(id, currentUser.getId()));
    }

    /** Non-valuable: finder approves the pending claim */
    @PostMapping("/{id}/approve")
    public ResponseEntity<ItemResponse> approveClaim(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(itemService.approveClaim(id, currentUser.getId()));
    }

    /** Valuable: claimer submits verification form */
    @PostMapping("/{id}/claim/verify")
    public ResponseEntity<ItemResponse> verifyAndClaim(
            @PathVariable Long id,
            @RequestBody ClaimVerificationRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(itemService.verifyAndClaim(id, request, currentUser.getId()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<ItemResponse>> getMyItems(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(itemService.getItemsByUser(currentUser.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        itemService.deleteItem(id, currentUser.getId());
        return ResponseEntity.noContent().build();
    }
}
