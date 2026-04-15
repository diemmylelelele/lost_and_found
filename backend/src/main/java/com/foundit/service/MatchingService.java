package com.foundit.service;

import com.foundit.model.Item;
import com.foundit.model.ItemStatus;
import com.foundit.model.Match;
import com.foundit.repository.ItemRepository;
import com.foundit.repository.MatchRepository;
import lombok.RequiredArgsConstructor; 
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

// Service to find potential matches between lost and found items based on Jaccard similarity of their text fields

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchingService {

    private static final float MATCH_THRESHOLD = 0.15f;
    private static final Set<String> STOP_WORDS = Set.of(
            "the", "a", "an", "is", "it", "this", "that", "was", "are",
            "has", "have", "had", "for", "and", "but", "or", "not", "with");

    private final ItemRepository itemRepository;
    private final MatchRepository matchRepository;
    private final NotificationService notificationService;

    @Transactional
    public void findMatchesForItem(Item newItem) {
        // Determine the opposite type to search against
        ItemStatus oppositeType = (newItem.getItemType() == ItemStatus.FOUND)
                ? ItemStatus.LOST
                : ItemStatus.FOUND;

        List<Item> candidates = itemRepository.findByItemTypeAndStatusNot(
                oppositeType, ItemStatus.CLAIMED);

        Set<String> newTokens = tokenize(buildText(newItem));

        for (Item candidate : candidates) {
            // Skip self
            if (candidate.getId().equals(newItem.getId())) continue;

            // Check for existing match
            Item lostItem = (newItem.getItemType() == ItemStatus.LOST) ? newItem : candidate;
            Item foundItem = (newItem.getItemType() == ItemStatus.FOUND) ? newItem : candidate;

            if (matchRepository.existsByLostItemAndFoundItem(lostItem, foundItem)) {
                continue;
            }

            Set<String> candidateTokens = tokenize(buildText(candidate));
            float score = jaccard(newTokens, candidateTokens);

            if (score > MATCH_THRESHOLD) {
                Match match = matchRepository.save(
                        Match.builder()
                                .lostItem(lostItem)
                                .foundItem(foundItem)
                                .similarityScore(score)
                                .build());

                log.info("Match created: lost={}, found={}, score={}",
                        lostItem.getId(), foundItem.getId(), score);

                // Notify the other item's owner
                Item otherItem = newItem.getId().equals(lostItem.getId()) ? foundItem : lostItem;
                String message = String.format(
                        "Potential match found! Your %s item '%s' may match '%s'.",
                        otherItem.getItemType().name().toLowerCase(),
                        otherItem.getName(),
                        newItem.getName());

                notificationService.createNotification(otherItem.getUser(), match, message);

                // Also notify the new item's owner if different user
                if (!newItem.getUser().getId().equals(otherItem.getUser().getId())) {
                    String msgForNewOwner = String.format(
                            "Potential match found! Your %s item '%s' may match '%s'.",
                            newItem.getItemType().name().toLowerCase(),
                            newItem.getName(),
                            otherItem.getName());
                    notificationService.createNotification(newItem.getUser(), match, msgForNewOwner);
                }
            }
        }
    }

    private String buildText(Item item) {
        StringBuilder sb = new StringBuilder();
        if (item.getName() != null) sb.append(item.getName()).append(" ");
        if (item.getDescription() != null) sb.append(item.getDescription()).append(" ");
        if (item.getCategory() != null) sb.append(item.getCategory()).append(" ");
        if (item.getLocationFound() != null) sb.append(item.getLocationFound());
        return sb.toString();
    }

    private Set<String> tokenize(String text) {
        if (text == null || text.isBlank()) return new HashSet<>();
        return Arrays.stream(text.toLowerCase().split("\\W+"))
                .filter(w -> w.length() > 2 && !STOP_WORDS.contains(w))
                .collect(Collectors.toSet());
    }

    private float jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() && b.isEmpty()) return 0f;
        Set<String> intersection = new HashSet<>(a);
        intersection.retainAll(b);
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        return union.isEmpty() ? 0f : (float) intersection.size() / union.size();
    }
}
