import React from 'react';

export const StatCard = ({ title, value, icon: Icon, color = 'blue', subtext, onClick }) => {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {Icon && (
        <div className={`stat-icon ${color}`}>
          <Icon size={24} />
        </div>
      )}
      <div className="stat-details">
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {subtext && <div className="stat-subtext">{subtext}</div>}
      </div>
    </div>
  );
};
