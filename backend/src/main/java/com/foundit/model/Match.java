package com.foundit.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "matchings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lost_item_id")
    private Item lostItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "found_item_id")
    private Item foundItem;

    private Float similarityScore;
}
