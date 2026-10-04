import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { 
  Clock, 
  Users, 
  CalendarCheck, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  LogOut, 
  History, 
  UserCheck, 
  Calendar, 
  Building2, 
  Briefcase, 
  ArrowRight,
  Filter,
  XCircle,
  Clock3,
  Eye,
  Edit2,
  Trash2,
  LogIn
} from 'lucide-react';

export const AttendanceRecord = () => {
  // Active Tab: 'daily' | 'history'
  const [activeTab, setActiveTab] = useState('daily');

  // Master data
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters for Attendance Monitoring
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Employee History Tab state
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState(null);
  const [employeeHistoryRecords, setEmployeeHistoryRecords] = useState([]);

  // Daily Clock-In Modal state
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [clockInSearchQuery, setClockInSearchQuery] = useState('');
  const [clockInStatus, setClockInStatus] = useState(null);
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockInError, setClockInError] = useState('');
  const [clockInSuccess, setClockInSuccess] = useState('');

  // Daily Clock-Out Modal state
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);
  const [clockOutSearchQuery, setClockOutSearchQuery] = useState('');
  const [clockOutStatus, setClockOutStatus] = useState(null);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [clockOutError, setClockOutError] = useState('');
  const [clockOutResult, setClockOutResult] = useState(null);

  // Manual Record Attendance Modal state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Record Form state
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [matchedEmployee, setMatchedEmployee] = useState(null);
  const [employeeShift, setEmployeeShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftError, setShiftError] = useState('');

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formStatus, setFormStatus] = useState('PRESENT');
  const [formNotes, setFormNotes] = useState('');
  const [calculatedHours, setCalculatedHours] = useState(0);
  const [punctualityNotice, setPunctualityNotice] = useState('');

  // View Details Modal state
  const [viewRecord, setViewRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal state
  const [editRecord, setEditRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    checkInTime: '',
    checkOutTime: '',
    status: 'PRESENT',
    notes: '',
    workingHours: 0
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal state
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Initial load
  useEffect(() => {
    loadEmployeesAndDepartments();
  }, []);

  // Reload records when filters change
  useEffect(() => {
    loadAttendanceRecords();
  }, [selectedDate, selectedDepartment, selectedStatus, searchQuery]);

  const loadEmployeesAndDepartments = async () => {
    try {
      const [empRes, deptRes] = await Promise.all([
        apiClient.get('/employees'),
        apiClient.get('/employees/departments')
      ]);
      setEmployees(empRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      console.error('Failed to load employee/department master data', err);
    }
  };

  const loadAttendanceRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedDepartment) params.append('departmentId', selectedDepartment);
      if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiClient.get(`/attendance/records?${params.toString()}`);
      setRecords(res.data || []);
    } catch (err) {
      console.error('Failed to load attendance records', err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CLOCK IN FLOW (DAILY ATTENDANCE)
  // ==========================================
  const handleOpenClockInModal = (defaultQuery = '') => {
    setClockInSearchQuery(defaultQuery);
    setClockInStatus(null);
    setClockInError('');
    setClockInSuccess('');
    setIsClockInModalOpen(true);
    if (defaultQuery) {
      searchClockInEmployee(defaultQuery);
    }
  };

  const searchClockInEmployee = async (q = clockInSearchQuery) => {
    if (!q || !q.trim()) {
      setClockInError('Please enter an Employee ID or Code to search.');
      return;
    }
    setClockInLoading(true);
    setClockInError('');
    setClockInSuccess('');
    try {
      const res = await apiClient.get(`/attendance/employee-today-status?employeeQuery=${encodeURIComponent(q.trim())}`);
      setClockInStatus(res.data);
    } catch (err) {
      setClockInStatus(null);
      setClockInError(err.response?.data?.message || err.response?.data || 'Employee not found with provided ID/Code.');
    } finally {
      setClockInLoading(false);
    }
  };

  const confirmClockIn = async () => {
    if (!clockInStatus || !clockInStatus.employeeId) return;
    setClockInLoading(true);
    setClockInError('');
    try {
      const res = await apiClient.post('/attendance/check-in', { employeeId: clockInStatus.employeeId });
      setClockInSuccess(`Check-in confirmed successfully for ${clockInStatus.employeeName} at server time ${res.data.checkInTime || clockInStatus.currentTime}!`);
      loadAttendanceRecords();
      setClockInStatus((prev) => ({
        ...prev,
        isOpen: true,
        hasRecord: true,
        checkInTime: res.data.checkInTime || clockInStatus.currentTime
      }));
    } catch (err) {
      setClockInError(err.response?.data?.message || err.response?.data || 'Failed to record check-in.');
    } finally {
      setClockInLoading(false);
    }
  };

  // ==========================================
  // CLOCK OUT FLOW (DAILY ATTENDANCE)
  // ==========================================
  const handleOpenClockOutModal = (defaultQuery = '') => {
    setClockOutSearchQuery(defaultQuery);
    setClockOutStatus(null);
    setClockOutError('');
    setClockOutResult(null);
    setIsClockOutModalOpen(true);
    if (defaultQuery) {
      searchClockOutEmployee(defaultQuery);
    }
  };

  const searchClockOutEmployee = async (q = clockOutSearchQuery) => {
    if (!q || !q.trim()) {
      setClockOutError('Please enter an Employee ID or Code to search.');
      return;
    }
    setClockOutLoading(true);
    setClockOutError('');
    setClockOutResult(null);
    try {
      const res = await apiClient.get(`/attendance/employee-today-status?employeeQuery=${encodeURIComponent(q.trim())}`);
      setClockOutStatus(res.data);
    } catch (err) {
      setClockOutStatus(null);
      setClockOutError(err.response?.data?.message || err.response?.data || 'Employee not found with provided ID/Code.');
    } finally {
      setClockOutLoading(false);
    }
  };

  const confirmClockOut = async () => {
    if (!clockOutStatus || !clockOutStatus.employeeId) return;
    setClockOutLoading(true);
    setClockOutError('');
    try {
      const res = await apiClient.post('/attendance/check-out', { employeeId: clockOutStatus.employeeId });
      setClockOutResult(res.data);
      loadAttendanceRecords();
    } catch (err) {
      setClockOutError(err.response?.data?.message || err.response?.data || 'Failed to record check-out.');
    } finally {
      setClockOutLoading(false);
    }
  };

  // Open modal to record attendance
  const handleOpenRecordModal = (preselectedEmployee = null) => {
    setModalError('');
    setModalSuccess('');
    setPunctualityNotice('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCheckIn('');
    setFormCheckOut('');
    setFormStatus('PRESENT');
    setFormNotes('');
    setCalculatedHours(0);
    setShiftError('');

    if (preselectedEmployee) {
      setEmployeeIdInput(preselectedEmployee.employeeId || preselectedEmployee.id.toString());
      lookupEmployee(preselectedEmployee.employeeId || preselectedEmployee.id.toString(), preselectedEmployee);
    } else {
      setEmployeeIdInput('');
      setMatchedEmployee(null);
      setEmployeeShift(null);
    }

    setIsRecordModalOpen(true);
  };

  // Look up employee by ID
  const handleSearchEmployee = (e) => {
    if (e) e.preventDefault();
    if (!employeeIdInput.trim()) {
      setShiftError('Please enter an Employee ID to search.');
      setMatchedEmployee(null);
      setEmployeeShift(null);
      return;
    }
    lookupEmployee(employeeIdInput.trim());
  };

  const lookupEmployee = async (empId, preloaded = null) => {
    setShiftError('');
    setModalError('');
    setModalSuccess('');
    setPunctualityNotice('');

    let emp = preloaded;
    if (!emp) {
      const q = empId.toLowerCase();
      emp = employees.find(
        (e) => (e.employeeId && e.employeeId.toLowerCase() === q) || e.id.toString() === q
      );
    }

    if (!emp) {
      setMatchedEmployee(null);
      setEmployeeShift(null);
      setShiftError(`Employee with ID "${empId}" not found in registered records. Attendance can only be recorded for existing registered employees.`);
      return;
    }

    setMatchedEmployee(emp);

    // Look up assigned shift for this employee
    setShiftLoading(true);
    try {
      const res = await apiClient.get(`/attendance/employee/${emp.id}/shift?date=${formDate}`);
      if (res.data && res.data.hasShift) {
        setEmployeeShift(res.data);
        setShiftError('');
      } else {
        setEmployeeShift(null);
        setShiftError(res.data?.message || 'This employee is not currently assigned to any shift. A shift must be assigned before recording attendance.');
      }
    } catch (err) {
      // Fallback check from client assignments
      try {
        const asgRes = await apiClient.get('/workforce/assignments');
        const userAsg = (asgRes.data || []).find(
          (a) => a.employee?.id === emp.id || a.employeeId == emp.id
        );
        if (userAsg && userAsg.shift) {
          setEmployeeShift({
            hasShift: true,
            shiftId: userAsg.shift.id,
            shiftName: userAsg.shift.shiftName,
            shiftCode: userAsg.shift.shiftCode,
            startTime: userAsg.shift.startTime,
            endTime: userAsg.shift.endTime,
            workLocation: userAsg.workLocation?.locationName || 'Logistics Terminal'
          });
          setShiftError('');
        } else {
          setEmployeeShift(null);
          setShiftError('This employee is not currently assigned to any shift. A shift must be assigned before recording attendance.');
        }
      } catch (e2) {
        setEmployeeShift(null);
        setShiftError('Failed to verify shift assignment.');
      }
    } finally {
      setShiftLoading(false);
    }
  };

  // Automatically recalculate working hours & evaluate punctuality rules
  useEffect(() => {
    if (!employeeShift || formStatus === 'ABSENT' || formStatus === 'LEAVE') {
      if (formStatus === 'ABSENT' || formStatus === 'LEAVE') {
        setCalculatedHours(0);
        setPunctualityNotice(`Attendance marked as ${formStatus}. Working hours set to 0.00.`);
      }
      return;
    }

    let hours = 0;
    if (formCheckIn && formCheckOut) {
      const [inH, inM] = formCheckIn.split(':').map(Number);
      const [outH, outM] = formCheckOut.split(':').map(Number);
      let mins = (outH * 60 + outM) - (inH * 60 + inM);
      if (mins < 0) mins += 24 * 60; // Cross midnight
      hours = Number((mins / 60).toFixed(2));
      setCalculatedHours(hours);
    } else {
      setCalculatedHours(0);
    }

    // Evaluate Punctuality rules
    const shiftStart = employeeShift.startTime?.substring(0, 5);
    const shiftEnd = employeeShift.endTime?.substring(0, 5);

    let isLate = false;
    let isEarlyLeave = false;

    if (formCheckIn && shiftStart && formCheckIn > shiftStart) {
      isLate = true;
    }
    if (formCheckOut && shiftEnd && formCheckOut < shiftEnd) {
      isEarlyLeave = true;
    }

    if (isLate && !isEarlyLeave) {
      setFormStatus('LATE');
      setPunctualityNotice(`⚠️ Late Arrival: Check-in (${formCheckIn}) is after shift start time (${shiftStart}). Marked as Late.`);
    } else if (isEarlyLeave && !isLate) {
      setFormStatus('EARLY_LEAVE');
      setPunctualityNotice(`⚠️ Early Leave: Check-out (${formCheckOut}) is before shift end time (${shiftEnd}). Marked as Early Leave.`);
    } else if (isLate && isEarlyLeave) {
      setFormStatus('LATE');
      setPunctualityNotice(`⚠️ Late & Early Departure: Check-in (${formCheckIn}) was late, and check-out (${formCheckOut}) was early.`);
    } else if (formCheckIn && formCheckOut) {
      setFormStatus('PRESENT');
      setPunctualityNotice(`✅ Full Shift Attended: Clocked in on time (${formCheckIn}) and completed full shift.`);
    } else {
      setPunctualityNotice('');
    }
  }, [formCheckIn, formCheckOut, employeeShift, formStatus]);

  // Handle attendance submission
  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!matchedEmployee) {
      setModalError('Please search and select a registered employee first.');
      return;
    }

    if (!employeeShift) {
      setModalError('The employee must already be assigned to a shift before attendance can be recorded.');
      return;
    }

    if (formStatus !== 'ABSENT' && formStatus !== 'LEAVE') {
      if (!formCheckIn) {
        setModalError('Please enter a check-in time for present/late records.');
        return;
      }
    }

    try {
      const payload = {
        employeeId: matchedEmployee.id,
        shiftId: employeeShift.shiftId,
        attendanceDate: formDate,
        checkInTime: formCheckIn || null,
        checkOutTime: formCheckOut || null,
        status: formStatus,
        notes: formNotes || `Shift ${employeeShift.shiftName} attendance`
      };

      await apiClient.post('/attendance/record', payload);
      setModalSuccess(`Attendance for ${matchedEmployee.firstName} ${matchedEmployee.lastName} saved successfully as ${formStatus}!`);

      // Refresh records
      loadAttendanceRecords();

      // If employee history view is open for this employee, refresh that too
      if (selectedEmployeeForHistory && selectedEmployeeForHistory.id === matchedEmployee.id) {
        viewEmployeeHistory(matchedEmployee);
      }

      setTimeout(() => {
        setIsRecordModalOpen(false);
      }, 1200);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save attendance record.');
    }
  };

  // View specific employee's attendance history
  const viewEmployeeHistory = async (emp) => {
    setSelectedEmployeeForHistory(emp);
    setActiveTab('history');
    try {
      const res = await apiClient.get(`/attendance/employee/${emp.id}/history`);
      setEmployeeHistoryRecords(res.data || []);
    } catch (err) {
      try {
        const res = await apiClient.get(`/attendance/records?employeeId=${emp.id}`);
        setEmployeeHistoryRecords(res.data || []);
      } catch (e2) {
        console.error('Failed to load employee attendance history', e2);
      }
    }
  };

  // CRUD Action Handlers
  const handleOpenView = (r) => {
    setViewRecord(r);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = (r) => {
    setEditRecord(r);
    setEditError('');
    setEditForm({
      checkInTime: r.checkInTime || '',
      checkOutTime: r.checkOutTime || '',
      status: r.status || 'PRESENT',
      notes: r.notes || '',
      workingHours: r.workingHours || 0
    });
    setIsEditModalOpen(true);
  };

  const handleEditTimeChange = (field, value) => {
    const updated = { ...editForm, [field]: value };
    if (updated.checkInTime && updated.checkOutTime && updated.status !== 'ABSENT' && updated.status !== 'LEAVE') {
      const [inH, inM] = updated.checkInTime.split(':').map(Number);
      const [outH, outM] = updated.checkOutTime.split(':').map(Number);
      let mins = (outH * 60 + outM) - (inH * 60 + inM);
      if (mins < 0) mins += 24 * 60;
      updated.workingHours = Number((mins / 60).toFixed(2));
    }
    setEditForm(updated);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/attendance/records/${editRecord.id}`, editForm);
      setIsEditModalOpen(false);
      loadAttendanceRecords();
      if (selectedEmployeeForHistory) {
        viewEmployeeHistory(selectedEmployeeForHistory);
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update attendance record.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (r) => {
    setDeleteRecord(r);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/attendance/records/${deleteRecord.id}`);
      setIsDeleteModalOpen(false);
      setDeleteRecord(null);
      loadAttendanceRecords();
      if (selectedEmployeeForHistory) {
        viewEmployeeHistory(selectedEmployeeForHistory);
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete attendance record.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Daily Summary KPI Counts
  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const lateCount = records.filter((r) => r.status === 'LATE').length;
  const earlyLeaveCount = records.filter((r) => r.status === 'EARLY_LEAVE').length;
  const onLeaveCount = records.filter((r) => r.status === 'LEAVE' || r.status === 'ON_LEAVE').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;

  // History KPIs for selected employee
  const histTotal = employeeHistoryRecords.length;
  const histPresent = employeeHistoryRecords.filter((r) => r.status === 'PRESENT').length;
  const histLate = employeeHistoryRecords.filter((r) => r.status === 'LATE').length;
  const histEarlyLeave = employeeHistoryRecords.filter((r) => r.status === 'EARLY_LEAVE').length;
  const histTotalHours = employeeHistoryRecords.reduce((sum, r) => sum + (Number(r.workingHours) || 0), 0);

  // Columns for Daily Attendance Monitoring Table
  const dailyColumns = [
    {
      header: 'Employee',
      accessor: 'employee',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            {r.employee?.firstName} {r.employee?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            ID: {r.employee?.employeeId || `EMP-${r.employee?.id}`}
          </div>
        </div>
      )
    },
    {
      header: 'Department & Position',
      accessor: 'dept',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500, color: '#334155' }}>
            {r.employee?.department?.name || r.employee?.department || '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {r.employee?.position?.title || r.employee?.position || '—'}
          </div>
        </div>
      )
    },
    {
      header: 'Assigned Shift',
      accessor: 'shift',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e3a8a' }}>
            {r.shift?.shiftName || 'Standard Shift'}
          </div>
          {r.shift?.startTime && (
            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>
              {r.shift.startTime.substring(0, 5)} - {r.shift.endTime?.substring(0, 5)}
            </span>
          )}
        </div>
      )
    },
    { header: 'Date', accessor: 'attendanceDate' },
    {
      header: 'Check In',
      accessor: 'checkInTime',
      render: (r) => (
        <span style={{ fontWeight: r.checkInTime ? 600 : 400, color: r.status === 'LATE' ? '#d97706' : '#0f172a' }}>
          {r.checkInTime || '—'}
        </span>
      )
    },
    {
      header: 'Check Out',
      accessor: 'checkOutTime',
      render: (r) => (
        <span style={{ fontWeight: r.checkOutTime ? 600 : 400, color: r.status === 'EARLY_LEAVE' ? '#7c3aed' : '#0f172a' }}>
          {r.checkOutTime || '—'}
        </span>
      )
    },
    {
      header: 'Working Hours',
      accessor: 'workingHours',
      render: (r) => (
        <span style={{ fontWeight: 600, color: '#0369a1' }}>
          {r.workingHours ? `${Number(r.workingHours).toFixed(2)} hrs` : '0.00 hrs'}
        </span>
      )
    },
    {
      header: 'Attendance Status',
      accessor: 'status',
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      header: 'Notes / Remarks',
      accessor: 'notes',
      render: (r) => <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.notes || '—'}</span>
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
          {r.checkInTime && !r.checkOutTime && (
            <button
              className="btn btn-warning"
              style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#d97706', color: '#fff', border: 'none' }}
              title="Clock Out Employee Now"
              onClick={() => handleOpenClockOutModal(r.employee?.employeeId || (r.employee?.id ? String(r.employee.id) : ''))}
            >
              <LogOut size={13} />
            </button>
          )}
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => handleOpenView(r)}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Record"
            onClick={() => handleOpenEdit(r)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Record"
            onClick={() => handleOpenDelete(r)}
          >
            <Trash2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View History"
            onClick={() => viewEmployeeHistory(r.employee)}
          >
            <History size={13} />
          </button>
        </div>
      )
    }
  ];

  // Columns for Employee History Table
  const historyColumns = [
    { header: 'Date', accessor: 'attendanceDate' },
    {
      header: 'Shift',
      accessor: 'shift',
      render: (r) => (
        <span>
          <strong>{r.shift?.shiftName || 'Assigned Shift'}</strong>{' '}
          {r.shift?.startTime && `(${r.shift.startTime.substring(0, 5)} - ${r.shift.endTime?.substring(0, 5)})`}
        </span>
      )
    },
    { header: 'Check In', accessor: 'checkInTime', render: (r) => r.checkInTime || '—' },
    { header: 'Check Out', accessor: 'checkOutTime', render: (r) => r.checkOutTime || '—' },
    {
      header: 'Hours Worked',
      accessor: 'workingHours',
      render: (r) => (r.workingHours ? `${Number(r.workingHours).toFixed(2)} hrs` : '0.00 hrs')
    },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
    { header: 'Notes', accessor: 'notes', render: (r) => r.notes || '—' },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => handleOpenView(r)}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Record"
            onClick={() => handleOpenEdit(r)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Record"
            onClick={() => handleOpenDelete(r)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Workforce Attendance Management & Monitoring</h1>
          <p className="page-description">
            Search registered employees, record shift-based clockings, and monitor punctuality compliance across terminals.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', borderColor: '#16a34a' }}
            onClick={() => handleOpenClockInModal()}
          >
            <LogIn size={16} /> Clock In Employee
          </button>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#d97706', borderColor: '#d97706' }}
            onClick={() => handleOpenClockOutModal()}
          >
            <LogOut size={16} /> Clock Out Employee
          </button>
          <button
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Authorized management manual correction or backdated attendance entry"
            onClick={() => handleOpenRecordModal()}
          >
            <Plus size={16} /> Manual Record / Correction
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <button
          className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('daily')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Calendar size={16} /> Daily Attendance Monitoring
        </button>
        <button
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <History size={16} /> Employee Attendance History
        </button>
      </div>

      {/* TAB 1: DAILY ATTENDANCE MONITORING */}
      {activeTab === 'daily' && (
        <>
          {/* Summary KPI Cards for Selected Date */}
          <div className="stat-grid" style={{ marginBottom: '24px' }}>
            <StatCard
              title="Present On-Duty"
              value={`${presentCount} Staff`}
              icon={CheckCircle2}
              color="green"
              subtext="Clocked on time & working"
            />
            <StatCard
              title="Late Arrivals"
              value={`${lateCount} Staff`}
              icon={Clock}
              color="amber"
              subtext="Check-in past shift start"
            />
            <StatCard
              title="Early Leaves"
              value={`${earlyLeaveCount} Staff`}
              icon={LogOut}
              color="purple"
              subtext="Left before shift end"
            />
            <StatCard
              title="On Approved Leave"
              value={`${onLeaveCount} Staff`}
              icon={CalendarCheck}
              color="blue"
              subtext="Official leave authorizations"
            />
            <StatCard
              title="Absent Staff"
              value={`${absentCount} Staff`}
              icon={AlertCircle}
              color="red"
              subtext="Unexcused non-attendances"
            />
          </div>

          {/* Filter & Search Bar */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              {/* Search by Employee ID or Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Search size={14} /> Search Employee
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter employee ID or name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Date Filter */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} /> Attendance Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              {/* Department Filter */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={14} /> Department
                </label>
                <select
                  className="form-control"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendance Status Filter */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={14} /> Attendance Status
                </label>
                <select
                  className="form-control"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="EARLY_LEAVE">Early Leave</option>
                  <option value="LEAVE">Leave</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </div>

              {/* Reset Filters */}
              <div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                    setSelectedDepartment('');
                    setSelectedStatus('ALL');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Daily Monitoring Table */}
          <div className="card">
            <DataTable
              columns={dailyColumns}
              data={records}
              searchPlaceholder="Search..."
              emptyMessage="No attendance records found matching the criteria."
            />
          </div>
        </>
      )}

      {/* TAB 2: EMPLOYEE ATTENDANCE HISTORY */}
      {activeTab === 'history' && (
        <div>
          {/* Employee Selector for History Audit */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px 24px' }}>
            <label className="form-label" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              Select Registered Employee to View Attendance History:
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                className="form-control"
                style={{ maxWidth: '400px' }}
                value={selectedEmployeeForHistory ? selectedEmployeeForHistory.id : ''}
                onChange={(e) => {
                  const emp = employees.find((x) => x.id == e.target.value);
                  if (emp) viewEmployeeHistory(emp);
                }}
              >
                <option value="">Select an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId || `EMP-${emp.id}`}) — {emp.department?.name || 'Staff'}
                  </option>
                ))}
              </select>

              {selectedEmployeeForHistory && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleOpenRecordModal(selectedEmployeeForHistory)}
                >
                  <Plus size={15} /> Record Attendance for this Employee
                </button>
              )}
            </div>
          </div>

          {/* If Employee is Selected */}
          {selectedEmployeeForHistory ? (
            <div>
              {/* Employee Dossier Header Card */}
              <div
                className="card"
                style={{
                  marginBottom: '20px',
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #eef2f6 100%)',
                  border: '1px solid #cbd5e1'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: '#2563eb',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 700
                      }}
                    >
                      {selectedEmployeeForHistory.firstName?.[0]}
                      {selectedEmployeeForHistory.lastName?.[0]}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
                        {selectedEmployeeForHistory.firstName} {selectedEmployeeForHistory.lastName}
                      </h3>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                        <span>
                          <strong>ID:</strong> {selectedEmployeeForHistory.employeeId || `EMP-${selectedEmployeeForHistory.id}`}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Dept:</strong> {selectedEmployeeForHistory.department?.name || 'Logistics'}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Position:</strong> {selectedEmployeeForHistory.position?.title || 'Operational Staff'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ textAlign: 'center', padding: '8px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Days</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{histTotal}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>On Time</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>{histPresent}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Late</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{histLate}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Early Leave</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed' }}>{histEarlyLeave}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Hours</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0369a1' }}>{histTotalHours.toFixed(1)} hrs</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* History Data Table */}
              <div className="card">
                <DataTable
                  columns={historyColumns}
                  data={employeeHistoryRecords}
                  searchPlaceholder="Search..."
                  emptyMessage="No historical attendance records recorded yet for this employee."
                />
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
              <Users size={40} style={{ margin: '0 auto 16px', color: '#94a3b8' }} />
              <h3 style={{ margin: '0 0 8px', color: '#334155' }}>Select an Employee to View Full History</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Use the dropdown above or click "History" beside any record in the Daily Monitoring table.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 1. CLOCK IN EMPLOYEE MODAL (DAILY ATTENDANCE) */}
      <Modal
        isOpen={isClockInModalOpen}
        onClose={() => setIsClockInModalOpen(false)}
        title="Clock In Employee — Daily Attendance Check-In"
        maxWidth="540px"
      >
        {clockInSuccess && (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', marginBottom: '16px', fontSize: '0.875rem' }}>
            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px' }} />
            {clockInSuccess}
          </div>
        )}

        {clockInError && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.875rem' }}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
            {clockInError}
          </div>
        )}

        {/* Search Employee Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            searchClockInEmployee();
          }}
          style={{ marginBottom: '16px' }}
        >
          <label className="form-label" style={{ fontWeight: 600 }}>
            Enter Employee ID or Staff Code *
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. EMP001 or 1"
              value={clockInSearchQuery}
              onChange={(e) => setClockInSearchQuery(e.target.value)}
              disabled={clockInLoading}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={clockInLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <Search size={16} /> Search
            </button>
          </div>
        </form>

        {/* Employee Search Details & Status Card */}
        {clockInStatus && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>{clockInStatus.employeeName}</h4>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  ID: <strong>{clockInStatus.employeeCode}</strong> • {clockInStatus.department}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Position: <strong>{clockInStatus.position}</strong> (Std: {clockInStatus.regularWorkingHoursPerDay}h/day)
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Current Server Time</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e3a8a' }}>{clockInStatus.currentTime}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{clockInStatus.currentDate}</div>
              </div>
            </div>

            {/* Status alerts */}
            {clockInStatus.isOpen ? (
              <div style={{ padding: '10px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', color: '#92400e', fontSize: '0.82rem' }}>
                <strong>⚠️ Already Clocked In:</strong> This employee clocked in at <strong>{clockInStatus.checkInTime}</strong>. Multiple check-ins without checkout are prevented. Please use <strong>Clock Out</strong> when work concludes.
              </div>
            ) : clockInStatus.isCompleted ? (
              <div style={{ padding: '10px 12px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '6px', color: '#0369a1', fontSize: '0.82rem' }}>
                <strong>ℹ️ Shift Completed:</strong> Today's attendance is already completed ({clockInStatus.checkInTime} to {clockInStatus.checkOutTime}). Total: {clockInStatus.totalWorkedFormatted || `${clockInStatus.workingHours}h`}.
              </div>
            ) : (
              <div style={{ padding: '10px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', fontSize: '0.82rem' }}>
                Ready to clock in. The current server time (<strong>{clockInStatus.currentTime}</strong>) will be recorded as check-in.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsClockInModalOpen(false)}
          >
            Close
          </button>
          {clockInStatus && !clockInStatus.isOpen && !clockInStatus.isCompleted && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#16a34a', borderColor: '#16a34a' }}
              disabled={clockInLoading}
              onClick={confirmClockIn}
            >
              {clockInLoading ? 'Recording...' : 'Confirm Check In'}
            </button>
          )}
        </div>
      </Modal>

      {/* 2. CLOCK OUT EMPLOYEE MODAL (DAILY ATTENDANCE) */}
      <Modal
        isOpen={isClockOutModalOpen}
        onClose={() => {
          setIsClockOutModalOpen(false);
          setClockOutResult(null);
        }}
        title="Clock Out Employee — Shift Completion & OT Calculation"
        maxWidth="560px"
      >
        {clockOutError && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.875rem' }}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
            {clockOutError}
          </div>
        )}

        {/* Search Employee Bar */}
        {!clockOutResult && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchClockOutEmployee();
            }}
            style={{ marginBottom: '16px' }}
          >
            <label className="form-label" style={{ fontWeight: 600 }}>
              Enter Employee ID or Staff Code *
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. EMP001 or 1"
                value={clockOutSearchQuery}
                onChange={(e) => setClockOutSearchQuery(e.target.value)}
                disabled={clockOutLoading}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={clockOutLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                <Search size={16} /> Search
              </button>
            </div>
          </form>
        )}

        {/* Search Result - Open Attendance Status */}
        {clockOutStatus && !clockOutResult && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>{clockOutStatus.employeeName}</h4>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  ID: <strong>{clockOutStatus.employeeCode}</strong> • {clockOutStatus.department}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Position: <strong>{clockOutStatus.position}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Current Server Time</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#d97706' }}>{clockOutStatus.currentTime}</div>
              </div>
            </div>

            {/* Validation checks */}
            {!clockOutStatus.hasRecord ? (
              <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '0.82rem' }}>
                <strong>❌ No Check-In Record:</strong> This employee has not clocked in today. Checkout requires an active open check-in.
              </div>
            ) : clockOutStatus.isCompleted ? (
              <div style={{ padding: '10px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontSize: '0.82rem' }}>
                <strong>ℹ️ Already Checked Out:</strong> Checked in at <strong>{clockOutStatus.checkInTime}</strong> and checked out at <strong>{clockOutStatus.checkOutTime}</strong>. Total Worked: {clockOutStatus.totalWorkedFormatted || `${clockOutStatus.workingHours}h`}.
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '12px', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Check-In Time</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{clockOutStatus.checkInTime}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Current Time</span>
                    <strong style={{ fontSize: '1rem', color: '#d97706' }}>{clockOutStatus.currentTime}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Duration Worked</span>
                    <strong style={{ fontSize: '1rem', color: '#2563eb' }}>{clockOutStatus.currentWorkedDuration || '—'}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#475569', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px' }}>
                  • Standard Regular Hours: <strong>{clockOutStatus.regularWorkingHoursPerDay}h/day</strong> (Position setting)<br />
                  • Overtime Rate: <strong>LKR {Number(clockOutStatus.otRatePerHour || 0).toFixed(2)}/hr</strong> (Position setting)<br />
                  • Any hours exceeding {clockOutStatus.regularWorkingHoursPerDay}h will automatically generate an Overtime record in <strong>PENDING</strong> status.
                </div>
              </div>
            )}
          </div>
        )}

        {/* AFTER CHECKOUT SUCCESS SUMMARY DISPLAY */}
        {clockOutResult && (
          <div style={{ border: '2px solid #bbf7d0', borderRadius: '8px', padding: '16px', background: '#f0fdf4', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '1rem', marginBottom: '12px' }}>
              <CheckCircle2 size={20} />
              <span>Checkout Successful!</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: '#fff', border: '1px solid #dcfce7', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Check In</span>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{clockOutResult.checkInTime}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Check Out</span>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{clockOutResult.checkOutTime}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Total Worked</span>
                <strong style={{ fontSize: '1.1rem', color: '#1e3a8a' }}>{clockOutResult.totalWorkedFormatted || `${clockOutResult.workingHours}h`}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Regular Hours</span>
                <strong style={{ fontSize: '1.1rem', color: '#15803d' }}>{clockOutResult.regularHoursFormatted || `${clockOutResult.regularHours}h`}</strong>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #dcfce7', borderRadius: '6px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Potential Overtime</span>
                  <strong style={{ fontSize: '1.15rem', color: '#b45309' }}>
                    {clockOutResult.otHoursFormatted || `${clockOutResult.otHours}h`}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>OT Compensation</span>
                  <strong style={{ fontSize: '1.15rem', color: '#b45309' }}>
                    LKR {Number(clockOutResult.potentialOtAmount || 0).toFixed(2)}
                  </strong>
                </div>
              </div>
              {Number(clockOutResult.otHours || 0) > 0 ? (
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#854d0e', background: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>
                  ℹ️ Overtime record generated as <strong>PENDING</strong>. Requires authorized manager approval before inclusion in payroll.
                </div>
              ) : (
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                  No overtime hours incurred (worked within standard regular hours limit).
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setIsClockOutModalOpen(false);
              setClockOutResult(null);
            }}
          >
            {clockOutResult ? 'Done' : 'Close'}
          </button>
          {!clockOutResult && clockOutStatus && clockOutStatus.isOpen && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#d97706', borderColor: '#d97706' }}
              disabled={clockOutLoading}
              onClick={confirmClockOut}
            >
              {clockOutLoading ? 'Processing...' : 'Confirm Check Out'}
            </button>
          )}
        </div>
      </Modal>

      {/* RECORD ATTENDANCE MODAL */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Employee Shift Attendance"
      >
        {modalSuccess && (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', marginBottom: '16px', fontSize: '0.875rem' }}>
            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px' }} />
            {modalSuccess}
          </div>
        )}

        {modalError && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.875rem' }}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
            {modalError}
          </div>
        )}

        {/* STEP 1: Search Employee by ID */}
        <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            Enter Employee ID *
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Enter employee ID"
              value={employeeIdInput}
              onChange={(e) => setEmployeeIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchEmployee();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap' }}
              onClick={handleSearchEmployee}
            >
              <Search size={15} /> Search
            </button>
          </div>

          {/* Quick Selector of Registered Employees for convenience */}
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
            Or select registered employee:{' '}
            <select
              style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              onChange={(e) => {
                const emp = employees.find((x) => x.id == e.target.value);
                if (emp) {
                  setEmployeeIdInput(emp.employeeId || emp.id.toString());
                  lookupEmployee(emp.employeeId || emp.id.toString(), emp);
                }
              }}
              value={matchedEmployee ? matchedEmployee.id : ''}
            >
              <option value="">Select registered employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeId || `EMP-${emp.id}`} — {emp.firstName} {emp.lastName} ({emp.department?.name || 'Dept'})
                </option>
              ))}
            </select>
          </div>

          {/* Display Employee Found Card */}
          {matchedEmployee && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                    {matchedEmployee.firstName} {matchedEmployee.lastName}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                    <strong>Department:</strong> {matchedEmployee.department?.name || 'Operations'} &nbsp;|&nbsp;{' '}
                    <strong>Position:</strong> {matchedEmployee.position?.title || 'Operational Staff'}
                  </div>
                </div>
                <span className="badge badge-success">Registered Employee</span>
              </div>
            </div>
          )}

          {/* Display Shift Status / Information */}
          {shiftLoading && (
            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#64748b' }}>
              <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} /> Checking assigned shift...
            </div>
          )}

          {shiftError && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 16px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '0.85rem'
              }}
            >
              <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
              {shiftError}
            </div>
          )}

          {employeeShift && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 16px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                color: '#1e40af'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Assigned Shift: {employeeShift.shiftName}
                  </span>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    <strong>Working Hours:</strong> {employeeShift.startTime?.substring(0, 5)} - {employeeShift.endTime?.substring(0, 5)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#3b82f6' }}>
                  Location: {employeeShift.workLocation || 'Assigned Terminal'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: Attendance Recording Form */}
        <form onSubmit={handleSaveAttendance}>
          {/* Date Picker */}
          <div className="form-group">
            <label className="form-label">Attendance Date *</label>
            <input
              type="date"
              className="form-control"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          {/* Attendance Status Selection */}
          <div className="form-group">
            <label className="form-label">Attendance Status *</label>
            <select
              className="form-control"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
            >
              <option value="PRESENT">Present (Regular Shift Attendance)</option>
              <option value="LATE">Late (Arrived Past Shift Start Time)</option>
              <option value="EARLY_LEAVE">Early Leave (Departed Before Shift End Time)</option>
              <option value="LEAVE">Leave (Official Approved Leave)</option>
              <option value="ABSENT">Absent (Unexcused Absence)</option>
            </select>
          </div>

          {/* Times Inputs (if not Absent or Leave) */}
          {formStatus !== 'ABSENT' && formStatus !== 'LEAVE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Check-in Time * {employeeShift?.startTime && `(Shift Start: ${employeeShift.startTime.substring(0, 5)})`}
                </label>
                <input
                  type="time"
                  className="form-control"
                  required
                  value={formCheckIn}
                  onChange={(e) => setFormCheckIn(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Check-out Time {employeeShift?.endTime && `(Shift End: ${employeeShift.endTime.substring(0, 5)})`}
                </label>
                <input
                  type="time"
                  className="form-control"
                  value={formCheckOut}
                  onChange={(e) => setFormCheckOut(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Live Punctuality & Working Hours Feedback Banner */}
          {punctualityNotice && (
            <div
              style={{
                padding: '10px 14px',
                background: formStatus === 'LATE' ? '#fffbeb' : formStatus === 'EARLY_LEAVE' ? '#f5f3ff' : '#f0fdf4',
                border: `1px solid ${formStatus === 'LATE' ? '#fde68a' : formStatus === 'EARLY_LEAVE' ? '#ddd6fe' : '#bbf7d0'}`,
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '0.85rem',
                color: formStatus === 'LATE' ? '#92400e' : formStatus === 'EARLY_LEAVE' ? '#6b21a8' : '#166534',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>{punctualityNotice}</div>
              {calculatedHours > 0 && (
                <div style={{ fontWeight: 700, marginLeft: '12px' }}>
                  {calculatedHours} hrs
                </div>
              )}
            </div>
          )}

          {/* Station Remarks / Notes */}
          <div className="form-group">
            <label className="form-label">Station / Attendance Remarks</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter remarks (e.g. Approved transport delay, onsite check)"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRecordModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!matchedEmployee || !employeeShift}
            >
              Save Attendance Record
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW ATTENDANCE DETAILS */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Attendance Record Details"
      >
        {viewRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                  {viewRecord.employee?.firstName} {viewRecord.employee?.lastName}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  ID: {viewRecord.employee?.employeeId || `EMP-${viewRecord.employee?.id}`} | {viewRecord.employee?.department?.name || 'Department'}
                </span>
              </div>
              <StatusBadge status={viewRecord.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Attendance Date</span>
                <strong>{viewRecord.attendanceDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Assigned Shift</span>
                <strong>{viewRecord.shift?.shiftName || 'Standard Shift'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Check In Time</span>
                <strong style={{ color: viewRecord.status === 'LATE' ? '#d97706' : '#0f172a' }}>
                  {viewRecord.checkInTime || '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Check Out Time</span>
                <strong style={{ color: viewRecord.status === 'EARLY_LEAVE' ? '#7c3aed' : '#0f172a' }}>
                  {viewRecord.checkOutTime || '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Total Hours Recorded</span>
                <strong style={{ color: '#0284c7' }}>
                  {viewRecord.workingHours ? `${Number(viewRecord.workingHours).toFixed(2)} hrs` : '0.00 hrs'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Position / Designation</span>
                <strong>{viewRecord.employee?.position?.title || '—'}</strong>
              </div>
            </div>

            {viewRecord.notes && (
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Notes / Remarks</span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>{viewRecord.notes}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(viewRecord);
                }}
              >
                Edit Record
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT ATTENDANCE RECORD */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Attendance Record"
      >
        {editRecord && (
          <form onSubmit={handleSaveEdit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}

            <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '14px', fontSize: '0.85rem' }}>
              <strong>Employee:</strong> {editRecord.employee?.firstName} {editRecord.employee?.lastName} ({editRecord.employee?.employeeId || `EMP-${editRecord.employee?.id}`})
              <br />
              <strong>Date:</strong> {editRecord.attendanceDate} | <strong>Shift:</strong> {editRecord.shift?.shiftName || 'Standard Shift'}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Attendance Status *</label>
              <select
                className="form-control"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="PRESENT">Present</option>
                <option value="LATE">Late Arrival</option>
                <option value="EARLY_LEAVE">Early Departure</option>
                <option value="LEAVE">Approved Leave</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>

            {editForm.status !== 'ABSENT' && editForm.status !== 'LEAVE' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Check-in Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={editForm.checkInTime}
                    onChange={(e) => handleEditTimeChange('checkInTime', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Check-out Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={editForm.checkOutTime}
                    onChange={(e) => handleEditTimeChange('checkOutTime', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Working Hours Calculated</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={editForm.workingHours}
                onChange={(e) => setEditForm({ ...editForm, workingHours: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Station Remarks / Revision Notes</label>
              <input
                type="text"
                className="form-control"
                placeholder="Reason for editing this record"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={editLoading}
              >
                {editLoading ? 'Saving...' : 'Update Record'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: DELETE ATTENDANCE RECORD CONFIRMATION */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Attendance Record"
      >
        {deleteRecord && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to permanently delete the attendance record for{' '}
              <strong>{deleteRecord.employee?.firstName} {deleteRecord.employee?.lastName}</strong> on{' '}
              <strong>{deleteRecord.attendanceDate}</strong>?
            </p>
            <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '6px', fontSize: '0.85rem', color: '#854d0e', marginBottom: '18px' }}>
              ⚠️ This action will remove the check-in/out stamps and recalculate day metrics. If already consolidated in a finalized timesheet, deletion may be rejected.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
