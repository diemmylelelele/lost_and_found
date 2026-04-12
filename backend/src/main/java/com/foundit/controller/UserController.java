package com.foundit.controller;

import com.foundit.dto.HistoryResponse;
import com.foundit.dto.UpdateProfileRequest;
import com.foundit.dto.UserProfileResponse;
import com.foundit.model.User;
import com.foundit.model.UserHistory;
import com.foundit.repository.UserHistoryRepository;
import com.foundit.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserHistoryRepository userHistoryRepository;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getProfile(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(toProfileResponse(currentUser));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfileResponse> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return ResponseEntity.ok(toProfileResponse(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal User currentUser) {

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        if (StringUtils.hasText(request.getName())) {
            user.setName(request.getName());
        }
        if (StringUtils.hasText(request.getProfilePicture())) {
            user.setProfilePicture(request.getProfilePicture());
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(toProfileResponse(saved));
    }

    @GetMapping("/me/history")
    public ResponseEntity<List<HistoryResponse>> getHistory(@AuthenticationPrincipal User currentUser) {
        List<UserHistory> history = userHistoryRepository
                .findByUserIdOrderByTimestampDesc(currentUser.getId());
        List<HistoryResponse> responses = history.stream()
                .map(h -> HistoryResponse.builder()
                        .id(h.getId())
                        .actionType(h.getActionType())
                        .timestamp(h.getTimestamp())
                        .itemId(h.getItem() != null ? h.getItem().getId() : null)
                        .itemName(h.getItem() != null ? h.getItem().getName() : null)
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    private UserProfileResponse toProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .studentId(user.getStudentId())
                .profilePicture(user.getProfilePicture())
                .build();
    }
}
