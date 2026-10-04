import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Clock, CheckCircle2, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const EmployeeAttendance = () => {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/attendance/records');
      const all = res.data || [];
      const empId = user?.employeeId;
      const myRecords = empId ? all.filter(a => a.employee?.id === empId || a.employee?.employeeId === empId) : all;
      setAttendances(myRecords);

      // Identify today's record from actual stored data
      const today = new Date().toISOString().split('T')[0];
      const todayRec = myRecords.find(a => a.attendanceDate === today);
      setTodayRecord(todayRec || null);
    } catch (err) {
      console.error('Error fetching attendance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const formatDurationHours = (h) => {
    if (h == null || isNaN(h) || Number(h) <= 0) return '00h 00m';
    const num = Number(h);
    const hrs = Math.floor(num);
    const mins = Math.round((num - hrs) * 60);
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'attendanceDate',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>{row.attendanceDate}</span>
      )
    },
    {
      header: 'Check In',
      accessor: 'checkInTime',
      render: (row) => (
        <span style={{ color: 'var(--success, #10b981)', fontWeight: 600 }}>
          {row.checkInTime || '--:--'}
        </span>
      )
    },
    {
      header: 'Check Out',
      accessor: 'checkOutTime',
      render: (row) => (
        <span style={{ color: row.checkOutTime ? 'var(--text-secondary, #475569)' : 'var(--warning, #f59e0b)', fontWeight: 500 }}>
          {row.checkOutTime || 'Active (On Duty)'}
        </span>
      )
    },
    {
      header: 'Worked Hours',
      accessor: 'workingHours',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {row.workingHours ? `${row.workingHours} hrs` : (row.checkInTime ? 'In Progress' : '0.0 hrs')}
        </span>
      )
    },
    {
      header: 'Regular Hours',
      render: (row) => (
        <span>
          {row.regularHours != null ? `${row.regularHours} hrs` : (row.workingHours ? `${Math.min(Number(row.workingHours), 8)} hrs` : '0.0 hrs')}
        </span>
      )
    },
    {
      header: 'OT Hours',
      render: (row) => (
        <span style={{ fontWeight: 600, color: (row.otHours > 0 || (Number(row.workingHours) > 8)) ? '#0369a1' : '#64748b' }}>
          {row.otHours != null ? `${row.otHours} hrs` : (row.workingHours && Number(row.workingHours) > 8 ? `${(Number(row.workingHours) - 8).toFixed(2)} hrs` : '0.0 hrs')}
        </span>
      )
    },
    {
      header: 'Attendance Status',
      accessor: 'status',
      render: (row) => (
        <StatusBadge status={row.status || 'PRESENT'} />
      )
    }
  ];

  const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
  
  // Calculate total overtime hours from verified records where shift hours exceed 8 hrs
  const totalOvertime = attendances.reduce((acc, a) => {
    const ot = a.otHours != null ? Number(a.otHours) : (Number(a.workingHours) > 8 ? Number(a.workingHours) - 8 : 0);
    return acc + (ot > 0 ? ot : 0);
  }, 0).toFixed(1);

  // Derive Today's Status purely from actual stored records
  let todayStatusTitle = 'No Record';
  let todayStatusSubtitle = 'Attendance not recorded for today';
  let todayStatusColor = '#64748b';

  if (todayRecord) {
    if (todayRecord.checkInTime && !todayRecord.checkOutTime) {
      todayStatusTitle = 'ON DUTY';
      todayStatusSubtitle = `Checked in at ${todayRecord.checkInTime}`;
      todayStatusColor = '#10b981';
    } else if (todayRecord.checkOutTime) {
      todayStatusTitle = todayRecord.status || 'COMPLETED';
      todayStatusSubtitle = `Shift ended at ${todayRecord.checkOutTime} (${todayRecord.workingHours || 0} hrs)`;
      todayStatusColor = '#3b82f6';
    } else {
      todayStatusTitle = todayRecord.status || 'RECORDED';
      todayStatusSubtitle = `Official status recorded for today`;
      todayStatusColor = '#f59e0b';
    }
  }

  const todayWorkedNum = Number(todayRecord?.workingHours) || 0;
  const todayRegNum = todayRecord?.regularHours != null ? Number(todayRecord.regularHours) : Math.min(todayWorkedNum, 8);
  const todayOtNum = todayRecord?.otHours != null ? Number(todayRecord.otHours) : Math.max(0, todayWorkedNum - 8);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            My Attendance Records
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Biometric check-in stamps, shift logs, and monthly working hour records synchronized with HR
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
          <FileText size={16} color="#2563eb" />
          <span>Attendance is logged automatically via authorized terminal sensors</span>
        </div>
      </div>

      {/* Today's Attendance Real-Time Status Card */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '20px 24px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e3a8a' }}>
              Today's Attendance
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          {todayRecord?.checkOutTime ? (
            <span style={{ padding: '6px 12px', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
              ✓ Checked Out Successfully
            </span>
          ) : todayRecord?.checkInTime ? (
            <span style={{ padding: '6px 12px', background: '#dbeafe', color: '#1e40af', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
              ● Currently On Duty
            </span>
          ) : (
            <span style={{ padding: '6px 12px', background: '#f1f5f9', color: '#64748b', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
              No check-in record for today
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Check In</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{todayRecord?.checkInTime || '--:--'}</div>
          </div>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Check Out</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: todayRecord?.checkOutTime ? '#2563eb' : '#64748b' }}>
              {todayRecord?.checkOutTime || '--:--'}
            </div>
          </div>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Worked</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              {formatDurationHours(todayWorkedNum)}
            </div>
          </div>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Regular</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              {formatDurationHours(todayRegNum)} / 08h 00m
            </div>
          </div>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              {todayRecord?.checkOutTime ? 'Potential OT' : 'OT'}
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: todayOtNum > 0 ? '#f59e0b' : '#64748b' }}>
              {formatDurationHours(todayOtNum)}
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Today's Attendance Status"
          value={todayStatusTitle}
          subtitle={todayStatusSubtitle}
          icon={Clock}
          color={todayStatusColor}
        />
        <StatCard
          title="Monthly Days Present"
          value={`${presentCount} Days`}
          subtitle="Verified attendance logs"
          icon={CheckCircle2}
          color="#3b82f6"
        />
        <StatCard
          title="Overtime Hours Logged"
          value={`${totalOvertime} hrs`}
          subtitle="Computed for monthly payroll"
          icon={Calendar}
          color="#f59e0b"
        />
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={attendances}
          loading={loading}
          searchPlaceholder="Search attendance logs..."
        />
      </div>
    </div>
  );
};
