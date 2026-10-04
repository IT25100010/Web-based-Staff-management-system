package com.lws.staff_management.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyPolicyRepository extends JpaRepository<CompanyPolicy, Long> {
    Optional<CompanyPolicy> findByPolicyCode(String policyCode);
    List<CompanyPolicy> findByStatus(String status);
    List<CompanyPolicy> findByCategory(String category);
}
