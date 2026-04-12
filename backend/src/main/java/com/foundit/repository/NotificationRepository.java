package com.foundit.repository;

import com.foundit.model.Notification;
import com.foundit.model.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByTimestampDesc(Long userId);

    long countByUserIdAndStatus(Long userId, NotificationStatus status);
}
