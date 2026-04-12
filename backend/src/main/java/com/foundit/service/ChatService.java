package com.foundit.service;

import com.foundit.dto.ChatMessageResponse;
import com.foundit.dto.ConversationSummary;
import com.foundit.model.ChatMessage;
import com.foundit.model.User;
import com.foundit.repository.ChatMessageRepository;
import com.foundit.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    @Transactional
    public List<ChatMessageResponse> getConversation(Long userAId, Long userBId) {
        List<ChatMessage> messages = chatMessageRepository.findConversation(userAId, userBId);

        // Mark unread messages as read
        List<ChatMessage> unread = chatMessageRepository.findUnreadFrom(userAId, userBId);
        unread.forEach(m -> m.setRead(true));
        chatMessageRepository.saveAll(unread);

        return messages.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long senderId, Long recipientId, String content) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new EntityNotFoundException("Sender not found"));
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new EntityNotFoundException("Recipient not found"));

        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .recipient(recipient)
                .content(content)
                .read(false)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);
        ChatMessageResponse response = toResponse(saved);

        // Push real-time message to recipient's chat
        messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/messages",
                response);

        // Create a notification for the recipient
        String senderDisplayName = (sender.getName() != null && !sender.getName().isBlank())
                ? sender.getName()
                : sender.getEmail().split("@")[0];
        String preview = content.length() > 60 ? content.substring(0, 60) + "..." : content;
        notificationService.createChatNotification(recipient, sender.getId(), senderDisplayName, preview);

        return response;
    }

    @Transactional(readOnly = true)
    public List<ConversationSummary> getConversationList(Long userId) {
        List<Long> partnerIds = chatMessageRepository.findConversationPartnerIds(userId);
        List<ConversationSummary> summaries = new ArrayList<>();

        for (Long partnerId : partnerIds) {
            User partner = userRepository.findById(partnerId).orElse(null);
            if (partner == null) continue;

            List<ChatMessage> conversation = chatMessageRepository.findConversation(userId, partnerId);
            if (conversation.isEmpty()) continue;

            ChatMessage lastMsg = conversation.get(conversation.size() - 1);
            List<ChatMessage> unread = chatMessageRepository.findUnreadFrom(userId, partnerId);

            summaries.add(ConversationSummary.builder()
                    .partnerId(partnerId)
                    .partnerName(partner.getName())
                    .partnerEmail(partner.getEmail())
                    .lastMessage(lastMsg.getContent())
                    .lastMessageTime(lastMsg.getSentAt())
                    .unreadCount(unread.size())
                    .build());
        }

        // Sort by most recent message
        summaries.sort((a, b) -> {
            if (a.getLastMessageTime() == null) return 1;
            if (b.getLastMessageTime() == null) return -1;
            return b.getLastMessageTime().compareTo(a.getLastMessageTime());
        });

        return summaries;
    }

    private ChatMessageResponse toResponse(ChatMessage msg) {
        return ChatMessageResponse.builder()
                .id(msg.getId())
                .senderId(msg.getSender().getId())
                .senderName(msg.getSender().getName())
                .recipientId(msg.getRecipient().getId())
                .recipientName(msg.getRecipient().getName())
                .content(msg.getContent())
                .sentAt(msg.getSentAt())
                .read(msg.isRead())
                .build();
    }
}
