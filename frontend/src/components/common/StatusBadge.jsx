import React from 'react';

export const StatusBadge = ({ status, text }) => {
  const getBadgeClass = (st) => {
    if (!st) return 'badge-neutral';
    const s = st.toUpperCase();
    if (['ACTIVE', 'APPROVED', 'VERIFIED', 'PRESENT', 'COMPLETED', 'ACHIEVED', 'SUCCESS', 'OPEN'].includes(s)) {
      return 'badge-success';
    }
    if (['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'DRAFT', 'UNDER_REVIEW', 'LATE'].includes(s)) {
      return 'badge-warning';
    }
    if (['REJECTED', 'CLOSED', 'CANCELLED', 'URGENT', 'CRITICAL', 'FAILED', 'HIGH', 'HALF_DAY', 'ABSENT'].includes(s)) {
      return 'badge-danger';
    }
    if (['FULL-TIME', 'CONTRACT', 'INFO', 'EXCEEDS_EXPECTATIONS', 'OUTSTANDING', 'LEAVE', 'ON_LEAVE', 'ANNUAL_LEAVE', 'CASUAL_LEAVE'].includes(s)) {
      return 'badge-info';
    }
    if (['EARLY_LEAVE', 'EARLY LEAVE'].includes(s)) {
      return 'badge-purple';
    }
    return 'badge-neutral';
  };

  const displayText = text || status?.replace(/_/g, ' ');

  return (
    <span className={`badge ${getBadgeClass(status)}`}>
      {displayText}
    </span>
  );
};
