package com.foundit.service;

import com.foundit.model.Item;
import com.foundit.model.ItemStatus;
import com.foundit.model.Match;
import com.foundit.repository.ItemRepository;
import com.foundit.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchingService {

    private static final String OLLAMA_URL = "http://localhost:11434/api/generate";
    private static final String MODEL = "llama3.2";
    private static final String MATCH_PROMPT =
            "Are these two university lost-and-found reports about the same item?\n\n" +
            "Lost item: name=\"%s\", date=\"%s\", description=\"%s\", location=\"%s\"\n" +
            "Found item: name=\"%s\", date=\"%s\", description=\"%s\", location=\"%s\"\n\n" +
            "Consider synonyms and partial matches (e.g. phone=iPhone, bag=backpack, navy=dark blue). " +
            "Ignore missing fields. " +
            "Reply with one word only: YES or NO.";

    private static final Semaphore OLLAMA_LOCK = new Semaphore(1);

    private final ItemRepository itemRepository;
    private final MatchRepository matchRepository;
    private final NotificationService notificationService;
    private final RestTemplate restTemplate;

    @Async
    @Transactional
    public void findMatchesForItem(Item newItem) {
        ItemStatus oppositeType = (newItem.getItemType() == ItemStatus.FOUND)
                ? ItemStatus.LOST
                : ItemStatus.FOUND;

        List<Item> candidates = itemRepository.findByItemTypeAndStatusNot(
                oppositeType, ItemStatus.CLAIMED);

        log.info("Matching engine started for item={} ({}), candidates={}",
                newItem.getId(), newItem.getItemType(), candidates.size());

        for (Item candidate : candidates) {
            if (candidate.getId().equals(newItem.getId())) continue;

            Item lostItem = (newItem.getItemType() == ItemStatus.LOST) ? newItem : candidate;
            Item foundItem = (newItem.getItemType() == ItemStatus.FOUND) ? newItem : candidate;

            if (matchRepository.existsByLostItemAndFoundItem(lostItem, foundItem)) continue;

            boolean isMatch = askLlm(lostItem, foundItem);

            if (isMatch) {
                Match match = matchRepository.save(
                        Match.builder()
                                .lostItem(lostItem)
                                .foundItem(foundItem)
                                .similarityScore(1.0f)
                                .build());

                log.info("LLM match: lost={}, found={}", lostItem.getId(), foundItem.getId());

                String msgForFinder = String.format(
                        "Potential match found! Your posted found item '%s' has a high chance to match with %s's posted lost item.",
                        foundItem.getName(), lostItem.getUser().getName());
                notificationService.createNotification(foundItem.getUser(), match, msgForFinder, lostItem.getId());

                if (!lostItem.getUser().getId().equals(foundItem.getUser().getId())) {
                    String msgForLostPoster = String.format(
                            "Potential match found! Your posted lost item '%s' has a high chance to match with %s's posted found item.",
                            lostItem.getName(), foundItem.getUser().getName());
                    notificationService.createNotification(lostItem.getUser(), match, msgForLostPoster, foundItem.getId());
                }
            }
        }
    }

    private boolean askLlm(Item lostItem, Item foundItem) {
        String prompt = buildPrompt(lostItem, foundItem);
        try {
            OLLAMA_LOCK.acquire();
            try {
                Map<String, Object> body = Map.of(
                        "model", MODEL,
                        "prompt", prompt,
                        "stream", false
                );

                @SuppressWarnings("unchecked")
                Map<String, Object> response = restTemplate.postForObject(OLLAMA_URL, body, Map.class);
                if (response == null) return false;

                String text = String.valueOf(response.get("response")).trim();
                log.info("LLM response for lost={} found={}: [{}]", lostItem.getId(), foundItem.getId(), text);

                String upper = text.toUpperCase();
                boolean hasYes = upper.contains("YES");
                boolean hasNo  = upper.contains("NO");
                // If both words appear (e.g. "I cannot say YES or NO"), treat as no match
                if (hasYes && !hasNo) return true;
                return false;
            } finally {
                OLLAMA_LOCK.release();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.warn("Ollama unavailable ({}), falling back to keyword matching for lost={} found={}",
                    e.getMessage(), lostItem.getId(), foundItem.getId());
            return jaccardFallback(lostItem, foundItem);
        }
    }

    private boolean jaccardFallback(Item lostItem, Item foundItem) {
        Set<String> a = tokenize(buildText(lostItem));
        Set<String> b = tokenize(buildText(foundItem));
        if (a.isEmpty() || b.isEmpty()) return false;
        Set<String> intersection = new HashSet<>(a);
        intersection.retainAll(b);
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        return !union.isEmpty() && (double) intersection.size() / union.size() >= 0.30;
    }

    private String buildText(Item item) {
        StringBuilder sb = new StringBuilder();
        if (item.getName() != null && !item.getName().isBlank()) sb.append(item.getName()).append(" ");
        if (item.getDescription() != null && !item.getDescription().isBlank()) sb.append(item.getDescription()).append(" ");
        if (item.getLocationFound() != null && !item.getLocationFound().isBlank()) sb.append(item.getLocationFound());
        return sb.toString().trim();
    }

    private Set<String> tokenize(String text) {
        if (text == null || text.isBlank()) return new HashSet<>();
        Set<String> stopWords = Set.of("the","a","an","is","it","this","that","was","are","has","have","had","for","and","but","or","not","with");
        return Arrays.stream(text.toLowerCase().split("\\W+"))
                .filter(w -> w.length() > 2 && !stopWords.contains(w))
                .collect(Collectors.toSet());
    }

    private String buildPrompt(Item lostItem, Item foundItem) {
        return String.format(MATCH_PROMPT,
                orUnknown(lostItem.getName()),
                orUnknown(lostItem.getDateEvent() != null ? lostItem.getDateEvent().toString() : null),
                orUnknown(lostItem.getDescription()),
                orUnknown(lostItem.getLocationFound()),
                orUnknown(foundItem.getName()),
                orUnknown(foundItem.getDateEvent() != null ? foundItem.getDateEvent().toString() : null),
                orUnknown(foundItem.getDescription()),
                orUnknown(foundItem.getLocationFound())
        );
    }

    private String orUnknown(String value) {
        return (value != null && !value.isBlank()) ? value : "not specified";
    }
}
