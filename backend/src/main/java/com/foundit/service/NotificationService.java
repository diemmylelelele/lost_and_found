package com.foundit.service;

import com.foundit.dto.NotificationResponse;
import com.foundit.model.Match;
import com.foundit.model.Notification;
import com.foundit.model.NotificationStatus;
import com.foundit.model.User;
import com.foundit.repository.NotificationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByTimestampDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Notification not found with id: " + notificationId));

        if (!notification.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("You do not own this notification");
        }

        notification.setStatus(NotificationStatus.READ);
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndStatus(userId, NotificationStatus.UNREAD);
    }

    @Transactional
    public Notification createNotification(User user, Match match, String message) {
        Notification notification = Notification.builder()
                .user(user)
                .match(match)
                .message(message)
                .status(NotificationStatus.UNREAD)
                .build();
        Notification saved = notificationRepository.save(notification);
        pushToUser(user, toResponse(saved));
        return saved;
    }

    @Transactional
    public void createChatNotification(User recipient, Long senderId, String senderName, String messagePreview) {
        Notification notification = Notification.builder()
                .user(recipient)
                .match(null)
                .message(messagePreview)
                .chatSenderId(senderId)
                .chatSenderName(senderName)
                .status(NotificationStatus.UNREAD)
                .build();
        Notification saved = notificationRepository.save(notification);
        pushToUser(recipient, toResponse(saved));
    }

    private void pushToUser(User user, NotificationResponse response) {
        messagingTemplate.convertAndSendToUser(
                user.getEmail(),
                "/queue/notifications",
                response);
    }

    private NotificationResponse toResponse(Notification n) {
        Long matchId = n.getMatch() != null ? n.getMatch().getId() : null;
        Long lostItemId = (n.getMatch() != null && n.getMatch().getLostItem() != null)
                ? n.getMatch().getLostItem().getId() : null;
        Long foundItemId = (n.getMatch() != null && n.getMatch().getFoundItem() != null)
                ? n.getMatch().getFoundItem().getId() : null;

        return NotificationResponse.builder()
                .id(n.getId())
                .message(n.getMessage())
                .status(n.getStatus().name())
                .timestamp(n.getTimestamp())
                .matchId(matchId)
                .lostItemId(lostItemId)
                .foundItemId(foundItemId)
                .chatSenderId(n.getChatSenderId())
                .chatSenderName(n.getChatSenderName())
                .build();
    }
}
