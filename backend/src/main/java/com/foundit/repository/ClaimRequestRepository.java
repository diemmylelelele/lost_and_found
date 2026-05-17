package com.foundit.repository;

import com.foundit.model.ClaimRequest;
import com.foundit.model.ClaimRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClaimRequestRepository extends JpaRepository<ClaimRequest, Long> {

    List<ClaimRequest> findByItemIdAndStatus(Long itemId, ClaimRequestStatus status);

    Optional<ClaimRequest> findByItemIdAndClaimantId(Long itemId, Long claimantId);

    boolean existsByItemIdAndClaimantIdAndStatus(
            Long itemId,
            Long claimantId,
            ClaimRequestStatus status
    );
}