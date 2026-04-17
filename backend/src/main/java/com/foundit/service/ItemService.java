package com.foundit.service;

import com.foundit.dto.ClaimVerificationRequest;
import com.foundit.dto.ItemRequest;
import com.foundit.dto.ItemResponse;
import com.foundit.model.Item;
import com.foundit.model.ItemStatus;
import com.foundit.model.User;
import com.foundit.model.UserHistory;
import com.foundit.repository.ItemRepository;
import com.foundit.repository.UserHistoryRepository;
import com.foundit.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final UserHistoryRepository userHistoryRepository;
    private final MatchingService matchingService;
    private final NotificationService notificationService;

    private static final List<String> VALUABLE_KEYWORDS = Arrays.asList(
            "phone", "laptop", "wallet", "smartwatch", "tablet", "airpod",
            "ipad", "macbook", "iphone", "samsung", "watch", "camera"
    );

    private boolean isValuable(String name) {
        if (name == null) return false;
        String lower = name.toLowerCase();
        return VALUABLE_KEYWORDS.stream().anyMatch(lower::contains);
    }

    @Transactional
    public ItemResponse createItem(ItemRequest req, ItemStatus itemType, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        Item item = Item.builder()
                .user(user)
                .name(req.getName())
                .description(req.getDescription())
                .category(req.getCategory())
                .locationFound(req.getLocationFound())
                .imageUrl(req.getImageUrl())
                .itemType(itemType)
                .status(itemType)  // Initial status mirrors the type (LOST or FOUND)
                .build();

        Item saved = itemRepository.save(item);

        // Log history
        userHistoryRepository.save(
                UserHistory.builder()
                        .user(user)
                        .item(saved)
                        .actionType("POSTED_" + itemType.name())
                        .build());

        // Trigger matching engine asynchronously-safe within the same transaction
        matchingService.findMatchesForItem(saved);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> getItems(String status, String category, String keyword) {
        List<Item> items;

        if (StringUtils.hasText(keyword)) {
            items = itemRepository.searchByKeyword(keyword.trim(), ItemStatus.CLAIMED);
        } else if (StringUtils.hasText(status) && StringUtils.hasText(category)) {
            try {
                ItemStatus itemStatus = ItemStatus.valueOf(status.toUpperCase());
                items = itemRepository.findByStatusAndCategoryIgnoreCaseOrderByDatePostedDesc(
                        itemStatus, category.trim());
            } catch (IllegalArgumentException e) {
                items = itemRepository.findByStatusNotOrderByDatePostedDesc(ItemStatus.CLAIMED);
            }
        } else if (StringUtils.hasText(status)) {
            try {
                ItemStatus itemStatus = ItemStatus.valueOf(status.toUpperCase());
                items = itemRepository.findByStatusAndCategoryIgnoreCaseOrderByDatePostedDesc(
                        itemStatus, "");
                if (items.isEmpty()) {
                    items = itemRepository.findAll().stream()
                            .filter(i -> i.getStatus() == itemStatus)
                            .sorted((a, b) -> b.getDatePosted().compareTo(a.getDatePosted()))
                            .collect(Collectors.toList());
                }
            } catch (IllegalArgumentException e) {
                items = itemRepository.findByStatusNotOrderByDatePostedDesc(ItemStatus.CLAIMED);
            }
        } else {
            items = itemRepository.findByStatusNotOrderByDatePostedDesc(ItemStatus.CLAIMED);
        }

        return items.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ItemResponse getItemById(Long id) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Item not found with id: " + id));
        return toResponse(item);
    }

    @Transactional
    public ItemResponse claimItem(Long itemId, Long claimantId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found with id: " + itemId));

        if (item.getStatus() == ItemStatus.CLAIMED) {
            throw new IllegalArgumentException("Item is already claimed");
        }

        item.setStatus(ItemStatus.CLAIMED);
        Item saved = itemRepository.save(item);

        User claimant = userRepository.findById(claimantId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        userHistoryRepository.save(
                UserHistory.builder()
                        .user(claimant)
                        .item(saved)
                        .actionType("CLAIMED_ITEM")
                        .build());

        return toResponse(saved);
    }

    /**
     * Non-valuable item: claimer requests claim → notify finder, store claimantId.
     */
    @Transactional
    public ItemResponse requestSimpleClaim(Long itemId, Long claimantId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found with id: " + itemId));

        if (item.getStatus() == ItemStatus.CLAIMED) {
            throw new IllegalArgumentException("Item is already claimed");
        }
        if (item.getUser().getId().equals(claimantId)) {
            throw new IllegalArgumentException("You cannot claim your own item");
        }

        User claimant = userRepository.findById(claimantId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        item.setClaimantId(claimantId);
        Item saved = itemRepository.save(item);

        // Notify the finder (item owner)
        notificationService.createClaimRequestNotification(item.getUser(), itemId, claimant.getName());

        return toResponse(saved);
    }

    /**
     * Non-valuable item: finder (owner) approves a pending claim → mark CLAIMED.
     */
    @Transactional
    public ItemResponse approveClaim(Long itemId, Long ownerId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found with id: " + itemId));

        if (!item.getUser().getId().equals(ownerId)) {
            throw new IllegalArgumentException("Only the finder can approve this claim");
        }
        if (item.getStatus() == ItemStatus.CLAIMED) {
            throw new IllegalArgumentException("Item is already claimed");
        }

        item.setStatus(ItemStatus.CLAIMED);
        Item saved = itemRepository.save(item);

        return toResponse(saved);
    }

    /**
     * Valuable item: claimer submits verification form → run matching engine.
     * Score >= 50 → CLAIMED + notify both; else → notify claimer only.
     */
    @Transactional
    public ItemResponse verifyAndClaim(Long itemId, ClaimVerificationRequest req, Long claimantId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found with id: " + itemId));

        if (item.getStatus() == ItemStatus.CLAIMED) {
            throw new IllegalArgumentException("Item is already claimed");
        }
        if (item.getUser().getId().equals(claimantId)) {
            throw new IllegalArgumentException("You cannot claim your own item");
        }

        User claimer = userRepository.findById(claimantId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        int score = matchesClaim(item, req);
        boolean matched = score >= 50;

        if (matched) {
            // Do NOT mark as CLAIMED yet — let the finder verify first
            item.setClaimantId(claimantId);
            itemRepository.save(item);

            // Notify claimer: high chance of match, contact finder
            notificationService.createClaimResultNotification(claimer, itemId, true);
            // Notify finder: someone's claim matched, contact them
            notificationService.createClaimMatchNotificationForFinder(item.getUser(), itemId, claimer.getName());
        } else {
            // Notify claimer: no match
            notificationService.createClaimResultNotification(claimer, itemId, false);
        }

        return toResponse(item);
    }

    private int matchesClaim(Item item, ClaimVerificationRequest req) {
        int score = 0;

        // Name match (40 pts): claimer's name is contained in item name or vice versa
        if (StringUtils.hasText(req.getName()) && StringUtils.hasText(item.getName())) {
            String itemName = item.getName().toLowerCase().trim();
            String claimName = req.getName().toLowerCase().trim();
            if (itemName.contains(claimName) || claimName.contains(itemName)) {
                score += 40;
            }
        }

        // Location match (30 pts)
        if (StringUtils.hasText(req.getLocation()) && StringUtils.hasText(item.getLocationFound())) {
            String itemLoc = item.getLocationFound().toLowerCase().trim();
            String claimLoc = req.getLocation().toLowerCase().trim();
            if (itemLoc.contains(claimLoc) || claimLoc.contains(itemLoc)) {
                score += 30;
            }
        }

        // Description keyword overlap (30 pts): >= 30% shared words > 3 chars
        if (StringUtils.hasText(req.getDescription()) && StringUtils.hasText(item.getDescription())) {
            Set<String> itemWords = extractKeywords(item.getDescription());
            Set<String> claimWords = extractKeywords(req.getDescription());
            if (!itemWords.isEmpty() && !claimWords.isEmpty()) {
                Set<String> intersection = new HashSet<>(itemWords);
                intersection.retainAll(claimWords);
                double overlap = (double) intersection.size() / Math.min(itemWords.size(), claimWords.size());
                if (overlap >= 0.3) {
                    score += 30;
                }
            }
        }

        return score;
    }

    private Set<String> extractKeywords(String text) {
        if (text == null) return new HashSet<>();
        return Arrays.stream(text.toLowerCase().split("\\W+"))
                .filter(w -> w.length() > 3)
                .collect(Collectors.toSet());
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> getItemsByUser(Long userId) {
        return itemRepository.findByUserIdOrderByDatePostedDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ItemResponse toResponse(Item item) {
        return ItemResponse.builder()
                .id(item.getId())
                .name(item.getName())
                .description(item.getDescription())
                .category(item.getCategory())
                .locationFound(item.getLocationFound())
                .imageUrl(item.getImageUrl())
                .status(item.getStatus() != null ? item.getStatus().name() : null)
                .itemType(item.getItemType() != null ? item.getItemType().name() : null)
                .datePosted(item.getDatePosted())
                .reporterId(item.getUser() != null ? item.getUser().getId() : null)
                .reporterName(item.getUser() != null ? item.getUser().getName() : null)
                .reporterEmail(item.getUser() != null ? item.getUser().getEmail() : null)
                .claimantId(item.getClaimantId())
                .build();
    }
}
