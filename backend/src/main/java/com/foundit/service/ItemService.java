package com.foundit.service;

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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final UserHistoryRepository userHistoryRepository;
    private final MatchingService matchingService;

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
                    // Fallback: just get everything with this status
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
                .build();
    }
}
