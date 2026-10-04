package com.lws.staff_management.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TechnicalTicketRepository extends JpaRepository<TechnicalTicket, Long> {
    List<TechnicalTicket> findByStatus(String status);
    List<TechnicalTicket> findAllByOrderByCreatedAtDesc();
    long countByStatus(String status);
}
