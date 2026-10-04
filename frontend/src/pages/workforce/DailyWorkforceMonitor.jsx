import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Users, Clock, MapPin, AlertTriangle, ArrowRight, Calendar, UserCheck, AlertCircle, RefreshCw, ShieldAlert, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DailyWorkforceMonitor = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const [dashRes, attRes, locRes] = await Promise.all([
        apiClient.get(`/workforce/operational-dashboard?date=${selectedDate}`),
        apiClient.get(`/workforce/attendance-monitoring?date=${selectedDate}&graceMinutes=15`),
        apiClient.get('/workforce/locations')
      ]);
      setDashboardData(dashRes.data || null);
      setAttendanceData(attRes.data || null);
      setLocations(locRes.data || []);
    } catch (err) {
      console.error('Error loading operational dashboard', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedDate]);

  const metrics = dashboardData?.metrics || {};
  const shifts = dashboardData?.shifts || [];
  const attendanceSummary = attendanceData?.summary || dashboardData?.attendanceSummary || {};
  const scheduledRoster = attendanceData?.scheduledRoster || [];
  const unscheduledAlerts = attendanceData?.unscheduledAlerts || dashboardData?.unscheduledAlerts || [];

  const filteredShifts = shifts.filter(s => {
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesLoc = !locationFilter || (s.locationName && s.locationName.toLowerCase().includes(locationFilter.toLowerCase()));
    return matchesStatus && matchesLoc;
  });

  const getCapacityBadgeStyle = (status) => {
    switch (status) {
      case 'UNDERSTAFFED':
        return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
      case 'FULLY_STAFFED':
        return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'OVERSTAFFED':
        return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      default:
        return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const getReconciledStatusStyle = (status) => {
    switch (status) {
      case 'PRESENT':
        return { background: '#dcfce7', color: '#166534' };
      case 'LATE':
        return { background: '#fef3c7', color: '#92400e' };
      case 'ABSENT':
        return { background: '#fee2e2', color: '#991b1b' };
      case 'NOT_MARKED':
        return { background: '#f1f5f9', color: '#475569' };
      case 'NOT_SCHEDULED':
        return { background: '#ffedd5', color: '#c2410c' };
      default:
        return { background: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div className="page-container">
      {/* Header with Date Picker & Refresh */}
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Operational Workforce & Shift Monitor
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Real-time terminal staffing telemetry, capacity fulfillment, and attendance schedule reconciliation
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Calendar size={16} color="var(--primary)" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}
            />
          </div>
          <button
            onClick={fetchDashboard}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '8px 12px' }}
            title="Refresh Telemetry"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Updating...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row 1 - Shift & Capacity Metrics */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Today's Shifts"
          value={metrics.totalShifts ?? shifts.length}
          subtitle={`${metrics.understaffedShifts ?? 0} require more staff`}
          icon={Clock}
          color="#3b82f6"
        />
        <StatCard
          title="Fulfillment"
          value={`${metrics.totalAssignedStaff ?? 0} / ${metrics.totalRequiredStaff ?? 0}`}
          subtitle={`${metrics.remainingStaffNeeded ?? 0} unfilled staff slots`}
          icon={Users}
          color={(metrics.remainingStaffNeeded ?? 0) > 0 ? '#f59e0b' : '#10b981'}
        />
        <StatCard
          title="Understaffed Shifts"
          value={metrics.understaffedShifts ?? 0}
          subtitle="Shifts below required quota"
          icon={AlertTriangle}
          color={(metrics.understaffedShifts ?? 0) > 0 ? '#ef4444' : '#10b981'}
        />
        <StatCard
          title="On Approved Leave"
          value={metrics.employeesOnLeave ?? 0}
          subtitle="Personnel unavailable today"
          icon={UserCheck}
          color="#8b5cf6"
        />
      </div>

      {/* KPI Cards Row 2 - Attendance Reconciliation Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', fontWeight: 700 }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Present on Time</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#166534' }}>{attendanceSummary.present ?? 0}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400e', fontWeight: 700 }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Late Check-ins (&gt;15m)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#92400e' }}>{attendanceSummary.late ?? 0}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 700 }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not Clocked Yet</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#475569' }}>{attendanceSummary.notMarked ?? 0}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991b1b', fontWeight: 700 }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Absent from Shift</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#991b1b' }}>{attendanceSummary.absent ?? 0}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c2410c', fontWeight: 700 }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unscheduled Alerts</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#c2410c' }}>{unscheduledAlerts.length}</div>
          </div>
        </div>
      </div>

      {/* Unscheduled Clock-in Warning Alert Banner */}
      {unscheduledAlerts.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <ShieldAlert size={24} color="#c2410c" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, color: '#9a3412', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
              ⚠️ UNSCHEDULED ATTENDANCE WARNING ({unscheduledAlerts.length} associate{unscheduledAlerts.length > 1 ? 's' : ''})
            </div>
            <div style={{ fontSize: '0.85rem', color: '#7c2d12' }}>
              The following employee(s) clocked in today without any scheduled roster shift assignment:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {unscheduledAlerts.map((u, i) => (
                <span key={i} style={{ background: '#ffedd5', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#9a3412' }}>
                  {u.employeeName} ({u.employeeCode}) • Check-in: {u.checkInTime || 'Recorded'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Operational Shift Capacity Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Shift Capacity & Staffing Status
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Automated evaluation of required quotas vs actual assigned personnel
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <div style={{ display: 'flex', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
              {['ALL', 'UNDERSTAFFED', 'FULLY_STAFFED', 'OVERSTAFFED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    background: statusFilter === st ? 'var(--primary)' : 'transparent',
                    color: statusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Location Filter */}
            <select
              className="form-control"
              style={{ width: '160px', padding: '6px 10px', fontSize: '0.8rem' }}
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All Locations</option>
              {locations.map(l => (
                <option key={l.id} value={l.locationName}>{l.locationName}</option>
              ))}
            </select>

            <Link to="/operations/shifts" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>Shift Roster</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px' }}>Shift Details</th>
                <th style={{ padding: '10px 14px' }}>Terminal Location</th>
                <th style={{ padding: '10px 14px' }}>Hours Window</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Required</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Assigned</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Remaining</th>
                <th style={{ padding: '10px 14px' }}>Staffing Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No operational shifts matching criteria for {selectedDate}.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((s) => {
                  const badgeStyle = getCapacityBadgeStyle(s.status);
                  return (
                    <tr key={s.shiftId} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.shiftName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{s.shiftId}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="var(--primary)" />
                          <span>{s.locationName || 'General'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>
                        {s.requiredStaff}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: s.assignedStaff >= s.requiredStaff ? 'var(--success)' : 'var(--danger)' }}>
                        {s.assignedStaff}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: s.remainingStaff > 0 ? '#b91c1c' : '#15803d' }}>
                        {s.remainingStaff}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block', ...badgeStyle }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <Link
                          to="/workforce/assignments"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          {s.status === 'UNDERSTAFFED' ? '+ Allocate Staff' : 'View Team'}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance vs Scheduled Shift Personnel Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Scheduled Personnel Attendance Telemetry
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Reconciles assigned shifts against actual biometric check-in times with 15-min grace period
            </span>
          </div>
          <Link to="/attendance/records" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>Full Attendance Log</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px' }}>Employee</th>
                <th style={{ padding: '10px 14px' }}>Department</th>
                <th style={{ padding: '10px 14px' }}>Assigned Shift</th>
                <th style={{ padding: '10px 14px' }}>Hours</th>
                <th style={{ padding: '10px 14px' }}>Biometric Check-In</th>
                <th style={{ padding: '10px 14px' }}>Reconciliation Status</th>
                <th style={{ padding: '10px 14px' }}>Operational Note</th>
              </tr>
            </thead>
            <tbody>
              {scheduledRoster.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No scheduled personnel rostered for {selectedDate}.
                  </td>
                </tr>
              ) : (
                scheduledRoster.map((r, idx) => {
                  const style = getReconciledStatusStyle(r.reconciledStatus);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.employeeName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.employeeCode}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {r.department}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--primary)' }}>
                        {r.shiftName}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {r.shiftHours}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                        {r.checkInTime || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, ...style }}>
                          {r.reconciledStatus}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {r.note || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

