import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Clock, MapPin, AlertTriangle, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const EmployeeSchedule = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const [scheduleRes, recallsRes] = await Promise.all([
          apiClient.get('/workforce/my-schedule'),
          apiClient.get('/workforce/my-recalls')
        ]);
        setShifts(scheduleRes.data || []);
        setRecalls(recallsRes.data || []);
      } catch (err) {
        console.error('Error fetching employee own schedule', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  // Active upcoming shifts: ASSIGNED and date >= today
  const upcomingShifts = shifts.filter(s => {
    const shiftDate = s.assignmentDate || s.shiftDate;
    const isUpcoming = !shiftDate || shiftDate >= today;
    const isActive = (s.status || 'ASSIGNED').toUpperCase() === 'ASSIGNED';
    return isUpcoming && isActive;
  });

  // History shifts: REPLACED, CANCELLED, or past assignments
  const historyShifts = shifts.filter(s => {
    const shiftDate = s.assignmentDate || s.shiftDate;
    const isPast = shiftDate && shiftDate < today;
    const isInactive = (s.status || '').toUpperCase() === 'REPLACED' || (s.status || '').toUpperCase() === 'CANCELLED';
    return isPast || isInactive;
  });

  const upcomingShift = upcomingShifts[0];

  const upcomingSite = typeof upcomingShift?.workLocation === 'string'
    ? upcomingShift.workLocation
    : (upcomingShift?.workLocation?.locationName || 'Unassigned');
  const upcomingAddress = typeof upcomingShift?.workLocation === 'string'
    ? (upcomingShift?.address || 'Designated Terminal')
    : (upcomingShift?.workLocation?.address || 'Site assignment pending');

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          My Operational Roster & Shifts
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Weekly terminal work schedules, designated assembly points, and urgent mobilization notices
        </p>
      </div>

      {/* Critical Recall Banner if active */}
      {activeRecalls.length > 0 && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem'
          }}
        >
          <AlertTriangle size={28} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1rem', marginBottom: '0.25rem' }}>
              🚨 URGENT STAFF MOBILIZATION ORDER ACTIVE
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {activeRecalls[0].recallTitle}: {activeRecalls[0].reason}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Reporting Target: <strong>{activeRecalls[0].location}</strong> by <strong>{activeRecalls[0].recallTime}</strong>. Overtime pay rates apply.
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Current / Next Shift"
          value={upcomingShift ? upcomingShift.shiftName : 'No Upcoming Shift'}
          subtitle={upcomingShift ? `${upcomingShift.startTime} - ${upcomingShift.endTime}` : 'No active shifts scheduled'}
          icon={Clock}
          color="#3b82f6"
        />
        <StatCard
          title="Designated Site"
          value={upcomingSite}
          subtitle={upcomingAddress}
          icon={MapPin}
          color="#10b981"
        />
        <StatCard
          title="Shift Supervisor"
          value={typeof upcomingShift?.workLocation === 'object' ? (upcomingShift.workLocation.contactPerson || 'Terminal Lead') : 'Operations Supervisor'}
          subtitle="Site Dispatch"
          icon={UserCheck}
          color="#8b5cf6"
        />
      </div>

      {/* Current / Upcoming Roster */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Current & Upcoming Shifts</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {upcomingShifts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No upcoming active roster shifts. Shifts will appear once assigned by Operations Management.
            </div>
          ) : (
            upcomingShifts.map((shift, idx) => {
              const siteStr = typeof shift.workLocation === 'string'
                ? shift.workLocation
                : (shift.workLocation?.locationName || 'Unassigned Hub');
              const dateStr = shift.assignmentDate || shift.shiftDate || '—';
              return (
                <div
                  key={shift.assignmentId || shift.id || idx}
                  style={{
                    padding: '1.25rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {shift.shiftName}
                      </span>
                      <StatusBadge status={shift.status || 'ASSIGNED'} />
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span><strong>Date:</strong> {dateStr}</span>
                      <span><strong>Hours:</strong> {shift.startTime} - {shift.endTime}</span>
                      <span><strong>Site:</strong> {siteStr}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Required PPE:</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', background: 'var(--bg-page)', border: '1px solid var(--border)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        🦺 High-Vis Vest
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'var(--bg-page)', border: '1px solid var(--border)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        🥾 Steel-Toe Boots
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Roster History (Past, Replaced, Cancelled) */}
      {historyShifts.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Roster History (Past & Replaced Shifts)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {historyShifts.map((shift, idx) => {
              const siteStr = typeof shift.workLocation === 'string'
                ? shift.workLocation
                : (shift.workLocation?.locationName || 'Unassigned Hub');
              const dateStr = shift.assignmentDate || shift.shiftDate || '—';
              return (
                <div
                  key={shift.assignmentId || shift.id || idx}
                  style={{
                    padding: '1rem 1.25rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    opacity: 0.85
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#334155' }}>
                        {shift.shiftName}
                      </span>
                      <StatusBadge status={shift.status || 'COMPLETED'} />
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                      <span><strong>Date:</strong> {dateStr}</span>
                      <span><strong>Hours:</strong> {shift.startTime} - {shift.endTime}</span>
                      <span><strong>Site:</strong> {siteStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
