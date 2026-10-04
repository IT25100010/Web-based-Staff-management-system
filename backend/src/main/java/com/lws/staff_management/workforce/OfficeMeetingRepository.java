package com.lws.staff_management.workforce;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface OfficeMeetingRepository extends JpaRepository<OfficeMeeting, Long> {
    List<OfficeMeeting> findByMeetingDateGreaterThanEqualOrderByMeetingDateAsc(LocalDate date);
    List<OfficeMeeting> findByStatus(String status);
}
