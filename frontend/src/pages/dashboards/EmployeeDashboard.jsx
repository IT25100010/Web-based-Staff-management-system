import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import {
  Clock,
  CalendarCheck,
  CalendarDays,
  MapPin,
  DollarSign,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Bell,
  Repeat
} from 'lucide-react';

export const EmployeeDashboard = () => {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myPayslips, setMyPayslips] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Annual',
    startDate: '',
    endDate: '',
    totalDays: 1,
    reason: ''
  });

  useEffect(() => {
    loadEmployeePortalData();
  }, []);

  const loadEmployeePortalData = async () => {
    setLoading(true);
    try {
      const [attRes, leaveRes, slipRes, polRes, shRes, notifRes] = await Promise.all([
        apiClient.get('/attendance/today'),
        apiClient.get('/attendance/leaves'),
        apiClient.get('/payroll/payslips'),
        apiClient.get('/compliance/policies?status=ACTIVE'),
        apiClient.get('/workforce/my-schedule'),
        apiClient.get('/notifications/my').catch(() => apiClient.get('/notifications'))
      ]);

      setTodayAttendance(attRes.data);
      setMyLeaves(leaveRes.data || []);
      setMyPayslips(slipRes.data || []);
      setPolicies(polRes.data || []);
      setNotifications(notifRes.data || []);
      const activeSchedule = shRes.data || [];
      if (activeSchedule.length > 0) {
        setSchedule(activeSchedule[0]);
      }
    } catch (e) {
      console.error('Error loading employee portal data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };



  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/attendance/leaves', {
        ...leaveForm
      });
      setIsLeaveModalOpen(false);
      setLeaveForm({ leaveType: 'Annual', startDate: '', endDate: '', totalDays: 1, reason: '' });
      loadEmployeePortalData();
      alert('Leave request submitted to HR Manager!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const leaveColumns = [
    { header: 'Type', accessor: 'leaveType', render: (r) => <span style={{ fontWeight: 600 }}>{r.leaveType}</span> },
    { header: 'Dates', render: (r) => `${r.startDate} to ${r.endDate} (${r.totalDays} days)` },
    { header: 'Reason', accessor: 'reason' },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Employee Portal</h1>
          <p className="page-description">
            Personal attendance clocking, leave requests, shift schedule, payslips, and company policies.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsLeaveModalOpen(true)} className="btn btn-primary">
            <CalendarCheck size={16} /> Apply for Leave
          </button>
        </div>
      </div>

      {/* Direct Work Transfer & System Notifications Banner */}
      {notifications.filter(n => !n.read && n.type === 'TRANSFER').map(n => (
        <div
          key={n.id}
          style={{
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            border: '1px solid #93c5fd',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#2563eb', color: '#fff', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Repeat size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e3a8a' }}>
                {n.title || 'Work Transfer Notification'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#1e40af', marginTop: '2px' }}>
                {n.message}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Published: {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Today'}
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => handleMarkNotificationRead(n.id)}
          >
            <CheckCircle2 size={16} /> Acknowledge Transfer
          </button>
        </div>
      ))}

      {/* Attendance & Clocking Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a, #0f2b48)',
        borderRadius: '16px',
        padding: '28px 32px',
        color: '#ffffff',
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.3)'
      }}>
        <div>
          <span style={{ fontSize: '0.78rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            Today's Biometric Attendance Tracker
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px' }}>
            {todayAttendance?.checkInTime ? (
              todayAttendance?.checkOutTime ? (
                <span>Shift Completed ({todayAttendance.workingHours} hrs)</span>
              ) : (
                <span>Clocked In at {todayAttendance.checkInTime}</span>
              )
            ) : (
              <span>Not Clocked In Yet</span>
            )}
          </h2>
          <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginTop: '6px' }}>
            Current Assigned Location: <strong>{schedule?.workLocation?.locationName || 'Not Assigned'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {todayAttendance?.checkInTime ? (
            todayAttendance?.checkOutTime ? (
              <div style={{ padding: '10px 18px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7' }}>
                <CheckCircle2 size={18} color="#10b981" /> Shift Completed ({todayAttendance.workingHours || 0} hrs)
              </div>
            ) : (
              <div style={{ padding: '10px 18px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#93c5fd' }}>
                <Clock size={18} color="#93c5fd" /> On Duty (Logged at {todayAttendance.checkInTime})
              </div>
            )
          ) : (
            <div style={{ padding: '10px 18px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
              <AlertCircle size={18} color="#94a3b8" /> Biometric Terminal Log Pending
            </div>
          )}
        </div>
      </div>

      {/* Personal Stat Grid */}
      <div className="stat-grid">
        <StatCard title="Today's Shift" value={schedule?.shiftName || 'No Shift'} icon={Clock} color="blue" subtext={schedule ? `${schedule.startTime} to ${schedule.endTime}` : 'No active shift scheduled'} />
        <StatCard title="Assigned Site" value={schedule?.workLocation?.locationName || 'Not Assigned'} icon={MapPin} color="green" subtext={schedule?.workLocation?.address || 'Site assignment pending'} />
        <StatCard title="Annual Leave Balance" value={`${14 - myLeaves.filter(l => l.leaveType === 'Annual' && l.status === 'APPROVED').reduce((sum, l) => sum + (l.totalDays || 0), 0)} Days Left`} icon={CalendarDays} color="purple" subtext="Out of 14 standard days" />
        <StatCard title="Latest Net Salary" value={myPayslips.length > 0 ? `LKR ${Number(myPayslips[0].payrollDetail?.netSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'LKR 0.00'} icon={DollarSign} color="amber" subtext={myPayslips[0]?.periodName || 'No payslips generated'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* My Work Schedule Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">My Work Schedule & Site Assignment</h2>
              <p className="card-subtitle">Official shift roster published by Operations</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {schedule ? (
              <>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>CURRENT ACTIVE SHIFT</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e3a8a', marginTop: '2px' }}>{schedule.shiftName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>⏰ {schedule.startTime} – {schedule.endTime}</div>
                </div>

                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>WORK LOCATION</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{schedule.workLocation?.locationName || 'Terminal'}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>📍 {schedule.workLocation?.address || 'Designated site'}</div>
                </div>
              </>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                No active shift assignment found. Assigned shifts appear once published by Operations.
              </div>
            )}
          </div>
        </div>

        {/* Latest Payslip Quick Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Latest Payslip Summary</h2>
              <p className="card-subtitle">{myPayslips[0]?.periodName || 'Compensation statement'}</p>
            </div>
            <Link to="/employee/payslip" style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Full Payslip <FileText size={14} />
            </Link>
          </div>

          {myPayslips.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                <span style={{ color: '#64748b' }}>Base Monthly Salary</span>
                <strong>LKR {Number(myPayslips[0].payrollDetail?.baseSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                <span style={{ color: '#64748b' }}>Overtime Payment</span>
                <strong>LKR {Number(myPayslips[0].payrollDetail?.overtimePay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                <span style={{ color: '#64748b' }}>Transport & Meal Benefits</span>
                <strong>LKR {Number(myPayslips[0].payrollDetail?.allowances || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                <span style={{ color: '#dc2626' }}>Employee EPF (8%) Deduction</span>
                <strong style={{ color: '#dc2626' }}>- LKR {Number(myPayslips[0].payrollDetail?.epfEmployee || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px', fontSize: '1.05rem', fontWeight: 800 }}>
                <span style={{ color: '#0f172a' }}>Net Take-Home Pay</span>
                <span style={{ color: '#059669' }}>LKR {Number(myPayslips[0].payrollDetail?.netSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              No payslip records available yet. Payslips appear here once processed by Finance.
            </div>
          )}
        </div>
      </div>

      {/* My Leave Requests Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">My Leave History & Status</h2>
            <p className="card-subtitle">Track HR Manager approval on submitted requests</p>
          </div>
        </div>
        <DataTable columns={leaveColumns} data={myLeaves} searchPlaceholder="Search..." />
      </div>

      {/* Leave Application Modal */}
      <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Submit Leave Request">
        <form onSubmit={handleApplyLeave}>
          <div className="form-group">
            <label className="form-label">Leave Type</label>
            <select
              className="form-control"
              value={leaveForm.leaveType}
              onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
            >
              <option value="Annual">Annual Leave</option>
              <option value="Casual">Casual Leave</option>
              <option value="Medical">Medical Leave</option>
              <option value="Unpaid">Unpaid Leave</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Total Days</label>
            <input
              type="number"
              min="1"
              max="30"
              className="form-control"
              value={leaveForm.totalDays}
              onChange={(e) => setLeaveForm({ ...leaveForm, totalDays: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Absence</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="State reason for absence..."
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit to HR
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
