import axios from 'axios';
import { initialMockData } from './mockData';

const BASE_URL = 'http://localhost:8080/api';

// Development mock mode: strictly requires explicit VITE_USE_MOCK_API=true (default false).
// Authentication and OTP must ALWAYS use the real backend regardless of this setting.
const IS_MOCK_API_ENABLED = import.meta.env.VITE_USE_MOCK_API === 'true';

// Local storage key for fallback offline mock store - clean version without demo records
const MOCK_STORAGE_KEY = 'lws_staff_mgmt_store_clean_v2';

function getMockStore() {
  if (!IS_MOCK_API_ENABLED) return null;
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error parsing mock store', e);
    }
  }
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initialMockData));
  return initialMockData;
}

function saveMockStore(store) {
  if (IS_MOCK_API_ENABLED) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(store));
  }
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for Bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: network failures must display an error, never fake records or fake login/OTP
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.code === 'ECONNABORTED' && isLoginRequest) {
      return Promise.reject({
        response: {
          status: 408,
          data: {
            message: "Login request timed out. Please try again."
          }
        }
      });
    }

    const isAuthRequest = error.config?.url?.includes('/auth/');
    // Real backend is ALWAYS used for auth and by default for all requests.
    // Development mocks only engaged if explicitly enabled via VITE_USE_MOCK_API=true and NOT an auth request.
    if (IS_MOCK_API_ENABLED && !isAuthRequest && (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED')) {
      return handleMockFallback(error.config);
    }

    return Promise.reject(error);
  }
);

// Fallback Mock Router to handle API calls dynamically from store (dev only when VITE_USE_MOCK_API=true)
function handleMockFallback(config) {
  const { url, method, data } = config;
  if (url.includes('/auth/')) {
    return Promise.reject(new Error('Authentication endpoints always require the real backend server.'));
  }
  const store = getMockStore();
  if (!store) {
    return Promise.reject(new Error('Mock API is disabled. Backend server is unreachable at ' + BASE_URL));
  }
  const parsedData = data ? (typeof data === 'string' ? JSON.parse(data) : data) : {};

  // 2. Employees endpoints
  if (url.startsWith('/employees') && method === 'get') {
    if (url.includes('/departments')) return Promise.resolve({ data: store.departments });
    if (url.includes('/positions')) return Promise.resolve({ data: store.positions });
    if (url.match(/\/employees\/\d+\/documents/)) {
      const empId = url.split('/')[2];
      return Promise.resolve({ data: store.employees.find(e => e.id == empId)?.documents || [] });
    }
    return Promise.resolve({ data: store.employees });
  }

  if (url === '/employees' && method === 'post') {
    const newEmp = {
      id: Date.now(),
      ...parsedData,
      department: store.departments.find(d => d.id == parsedData.departmentId) || null,
      position: store.positions.find(p => p.id == parsedData.positionId) || null,
      documents: []
    };
    store.employees.unshift(newEmp);
    saveMockStore(store);
    return Promise.resolve({ data: newEmp });
  }

  // 3. Recruitment Vacancies
  if (url.includes('/recruitment/vacancies')) {
    if (method === 'get') {
      if (url.includes('/summary')) {
        return Promise.resolve({
          data: {
            total: store.vacancies.length,
            open: store.vacancies.filter(v => v.status === 'OPEN').length,
            closed: store.vacancies.filter(v => v.status === 'CLOSED').length
          }
        });
      }
      return Promise.resolve({ data: store.vacancies });
    }
    if (method === 'post') {
      const newVac = {
        id: Date.now(),
        vacancyCode: 'VAC-' + Math.floor(100 + Math.random() * 900),
        status: 'OPEN',
        ...parsedData,
        department: store.departments.find(d => d.id == parsedData.departmentId) || null
      };
      store.vacancies.unshift(newVac);
      saveMockStore(store);
      return Promise.resolve({ data: newVac });
    }
    if (method === 'patch' && url.includes('/close')) {
      const id = url.split('/')[3];
      const vac = store.vacancies.find(v => v.id == id);
      if (vac) vac.status = 'CLOSED';
      saveMockStore(store);
      return Promise.resolve({ data: vac });
    }
  }

  // 4. Attendance & Leaves
  if (url.includes('/attendance')) {
    if (url.includes('/record') && method === 'post') {
      const empIdParam = parsedData.employeeId;
      const emp = store.employees.find(e => e.employeeId === empIdParam || e.id == empIdParam);
      if (!emp) {
        return Promise.reject({ response: { status: 400, data: { message: 'Employee not found in registered records. Attendance can only be recorded for existing registered employees.' } } });
      }

      const attDate = parsedData.attendanceDate || new Date().toISOString().split("T")[0];
      let assignedShift = null;
      if (parsedData.shiftId) {
        assignedShift = store.shifts.find(s => s.id == parsedData.shiftId);
      }
      if (!assignedShift) {
        const asgn = store.assignments.find(a => (a.employee?.id === emp.id || a.employeeId == emp.id));
        if (asgn) {
          assignedShift = asgn.shift || store.shifts.find(s => s.id == asgn.shiftId);
        }
      }

      if (!assignedShift) {
        return Promise.reject({ response: { status: 400, data: { message: 'The employee is not assigned to any shift. An employee must have an assigned shift to determine working start and end time.' } } });
      }

      let status = (parsedData.status || 'PRESENT').toUpperCase();
      let workingHours = 0;

      if (parsedData.checkInTime && parsedData.checkOutTime) {
        const [inH, inM] = parsedData.checkInTime.split(':').map(Number);
        const [outH, outM] = parsedData.checkOutTime.split(':').map(Number);
        let mins = (outH * 60 + outM) - (inH * 60 + inM);
        if (mins < 0) mins += 24 * 60;
        workingHours = Number((mins / 60).toFixed(2));
      }

      if (status !== 'ABSENT' && status !== 'LEAVE') {
        const checkIn = parsedData.checkInTime;
        const checkOut = parsedData.checkOutTime;
        const shiftStart = assignedShift.startTime;
        const shiftEnd = assignedShift.endTime;

        let isLate = false;
        let isEarlyLeave = false;

        if (checkIn && shiftStart && checkIn > shiftStart) {
          isLate = true;
        }
        if (checkOut && shiftEnd && checkOut < shiftEnd) {
          isEarlyLeave = true;
        }

        if (isLate && !isEarlyLeave) {
          status = 'LATE';
        } else if (isEarlyLeave && !isLate) {
          status = 'EARLY_LEAVE';
        } else if (isLate && isEarlyLeave) {
          status = parsedData.status === 'EARLY_LEAVE' ? 'EARLY_LEAVE' : 'LATE';
        } else {
          status = 'PRESENT';
        }
      } else {
        workingHours = 0;
      }

      let record = store.attendances.find(a => (a.employee?.id === emp.id || a.employee?.employeeId === emp.employeeId) && a.attendanceDate === attDate);
      if (record) {
        record.shift = assignedShift;
        record.checkInTime = parsedData.checkInTime || null;
        record.checkOutTime = parsedData.checkOutTime || null;
        record.workingHours = workingHours;
        record.status = status;
        record.notes = parsedData.notes || 'Recorded';
      } else {
        record = {
          id: Date.now(),
          employee: emp,
          shift: assignedShift,
          attendanceDate: attDate,
          checkInTime: parsedData.checkInTime || null,
          checkOutTime: parsedData.checkOutTime || null,
          workingHours: workingHours,
          status: status,
          notes: parsedData.notes || 'Recorded'
        };
        store.attendances.unshift(record);
      }
      saveMockStore(store);
      return Promise.resolve({ data: record });
    }

    if (url.includes('/employee/') && url.includes('/shift')) {
      const parts = url.split('/');
      const empIdx = parts.indexOf('employee') + 1;
      const empId = parts[empIdx];
      const emp = store.employees.find(e => e.id == empId || e.employeeId === empId);
      const asgn = store.assignments.find(a => (a.employee?.id == empId || a.employeeId == empId));
      const shift = asgn ? (asgn.shift || store.shifts.find(s => s.id == asgn.shiftId)) : null;

      if (shift) {
        return Promise.resolve({
          data: {
            hasShift: true,
            shiftId: shift.id,
            shiftName: shift.shiftName,
            shiftCode: shift.shiftCode,
            startTime: shift.startTime,
            endTime: shift.endTime,
            workLocation: asgn.workLocation?.locationName || 'Main Logistics Terminal'
          }
        });
      }
      return Promise.resolve({
        data: {
          hasShift: false,
          message: 'No active shift assigned to this employee. Please assign a shift in Workforce Management first.'
        }
      });
    }

    if (url.includes('/employee/') && url.includes('/history')) {
      const parts = url.split('/');
      const empIdx = parts.indexOf('employee') + 1;
      const empId = parts[empIdx];
      const history = store.attendances.filter(a => a.employee?.id == empId || a.employee?.employeeId === empId);
      return Promise.resolve({ data: history });
    }

    if (url.includes('/check-in') && method === 'post') {
      const emp = store.employees[0] || null;
      const record = {
        id: Date.now(),
        employee: emp,
        attendanceDate: new Date().toISOString().split("T")[0],
        checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        checkOutTime: null,
        workingHours: 0,
        status: 'PRESENT',
        notes: parsedData.notes || 'Biometric check-in'
      };
      store.attendances.unshift(record);
      saveMockStore(store);
      return Promise.resolve({ data: record });
    }
    if (url.includes('/check-out') && method === 'post') {
      const today = new Date().toISOString().split("T")[0];
      const rec = store.attendances.find(a => a.attendanceDate === today);
      if (rec) {
        rec.checkOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        rec.workingHours = 8.0;
      }
      saveMockStore(store);
      return Promise.resolve({ data: rec });
    }
    if (url.includes('/today')) {
      const today = new Date().toISOString().split("T")[0];
      const rec = store.attendances.find(a => a.attendanceDate === today);
      return Promise.resolve({ data: rec || null });
    }
    if (url.includes('/records')) {
      let filtered = [...store.attendances];
      const queryParams = new URLSearchParams(url.split('?')[1] || '');
      const dateParam = queryParams.get('date');
      const deptParam = queryParams.get('departmentId');
      const statusParam = queryParams.get('status');
      const searchParam = queryParams.get('search');

      if (dateParam && dateParam !== 'ALL') {
        filtered = filtered.filter(a => a.attendanceDate === dateParam);
      }
      if (deptParam) {
        filtered = filtered.filter(a => a.employee?.department?.id == deptParam || a.employee?.departmentId == deptParam);
      }
      if (statusParam && statusParam !== 'ALL') {
        filtered = filtered.filter(a => (a.status || '').toUpperCase() === statusParam.toUpperCase());
      }
      if (searchParam) {
        const q = searchParam.toLowerCase();
        filtered = filtered.filter(a => {
          const empId = (a.employee?.employeeId || '').toLowerCase();
          const name = `${a.employee?.firstName || ''} ${a.employee?.lastName || ''}`.toLowerCase();
          return empId.includes(q) || name.includes(q);
        });
      }
      return Promise.resolve({ data: filtered });
    }
    if (url.includes('/leaves')) {
      if (method === 'get') {
        if (url.includes('status=PENDING')) {
          return Promise.resolve({ data: store.leaves.filter(l => l.status === 'PENDING') });
        }
        return Promise.resolve({ data: store.leaves });
      }
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || store.employees[0] || null;
        const newLeave = {
          id: Date.now(),
          employee: emp,
          status: 'PENDING',
          ...parsedData
        };
        store.leaves.unshift(newLeave);
        saveMockStore(store);
        return Promise.resolve({ data: newLeave });
      }
      if (method === 'put' && url.includes('/approve')) {
        const id = url.split('/')[3];
        const l = store.leaves.find(leave => leave.id == id);
        if (l) l.status = 'APPROVED';
        saveMockStore(store);
        return Promise.resolve({ data: l });
      }
      if (method === 'put' && url.includes('/reject')) {
        const id = url.split('/')[3];
        const l = store.leaves.find(leave => leave.id == id);
        if (l) l.status = 'REJECTED';
        saveMockStore(store);
        return Promise.resolve({ data: l });
      }
    }
    if (url.includes('/overtime')) {
      if (method === 'get') return Promise.resolve({ data: store.overtime });
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || null;
        const ot = { id: Date.now(), employee: emp, status: 'APPROVED', ...parsedData };
        store.overtime.unshift(ot);
        saveMockStore(store);
        return Promise.resolve({ data: ot });
      }
    }
    if (url.includes('/timesheets')) {
      if (method === 'get') return Promise.resolve({ data: store.timesheets });
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || null;
        const ts = {
          id: Date.now(),
          employee: emp,
          totalHours: (Number(parsedData.regularHours) || 0) + (Number(parsedData.overtimeHours) || 0),
          status: 'FINALIZED',
          ...parsedData
        };
        store.timesheets.unshift(ts);
        saveMockStore(store);
        return Promise.resolve({ data: ts });
      }
    }
  }

  // 5. Workforce Operations
  if (url.includes('/workforce')) {
    if (url.includes('/locations')) {
      if (method === 'get') return Promise.resolve({ data: store.workLocations });
      if (method === 'post') {
        const loc = { id: Date.now(), status: 'ACTIVE', ...parsedData };
        store.workLocations.unshift(loc);
        saveMockStore(store);
        return Promise.resolve({ data: loc });
      }
    }
    if (url.includes('/shifts')) {
      if (method === 'get') return Promise.resolve({ data: store.shifts });
      if (method === 'post') {
        const loc = store.workLocations.find(l => l.id == parsedData.workLocationId) || null;
        const sh = {
          id: Date.now(),
          shiftCode: 'SHF-' + Math.floor(100 + Math.random() * 900),
          workLocation: loc,
          assignedCount: 0,
          ...parsedData
        };
        store.shifts.unshift(sh);
        saveMockStore(store);
        return Promise.resolve({ data: sh });
      }
    }
    if (url.includes('/assignments')) {
      if (method === 'get') return Promise.resolve({ data: store.assignments });
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || null;
        const sh = store.shifts.find(s => s.id == parsedData.shiftId) || null;
        const asgn = {
          id: Date.now(),
          employee: emp,
          shift: sh,
          workLocation: sh ? sh.workLocation : null,
          status: 'ASSIGNED',
          ...parsedData
        };
        store.assignments.unshift(asgn);
        saveMockStore(store);
        return Promise.resolve({ data: asgn });
      }
    }
    if (url.includes('/plans')) {
      if (method === 'get') return Promise.resolve({ data: store.workforcePlans });
      if (method === 'post') {
        const p = { id: Date.now(), status: 'ACTIVE', ...parsedData };
        store.workforcePlans.unshift(p);
        saveMockStore(store);
        return Promise.resolve({ data: p });
      }
    }
    if (url.includes('/transfers')) {
      if (method === 'get') return Promise.resolve({ data: store.transfers });
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || null;
        const fromLoc = store.workLocations.find(l => l.id == parsedData.fromLocationId) || null;
        const toLoc = store.workLocations.find(l => l.id == parsedData.toLocationId) || null;
        const tr = { id: Date.now(), employee: emp, fromLocation: fromLoc, toLocation: toLoc, status: 'PENDING', ...parsedData };
        store.transfers.unshift(tr);
        saveMockStore(store);
        return Promise.resolve({ data: tr });
      }
    }
    if (url.includes('/replacements')) {
      if (method === 'get') return Promise.resolve({ data: store.replacements });
      if (method === 'post') {
        const rep = { id: Date.now(), status: 'APPROVED', ...parsedData };
        store.replacements.unshift(rep);
        saveMockStore(store);
        return Promise.resolve({ data: rep });
      }
    }
    if (url.includes('/meetings')) {
      if (method === 'get') return Promise.resolve({ data: store.meetings });
      if (method === 'post') {
        const m = { id: Date.now(), status: 'SCHEDULED', ...parsedData };
        store.meetings.unshift(m);
        saveMockStore(store);
        return Promise.resolve({ data: m });
      }
    }
    if (url.includes('/recalls')) {
      if (method === 'get') return Promise.resolve({ data: store.recalls });
      if (method === 'post') {
        const rc = { id: Date.now(), status: 'ACTIVE', ...parsedData };
        store.recalls.unshift(rc);
        saveMockStore(store);
        return Promise.resolve({ data: rc });
      }
    }
    if (url.includes('/my-schedule')) {
      const empUser = store.users.find(u => u.role === 'EMPLOYEE') || store.users[0];
      const emp = store.employees.find(e => e.userId === empUser?.id) || store.employees[0];
      const myAssignments = store.assignments.filter(a => a.employee?.id === emp?.id || a.employeeId == emp?.id);
      const schedule = myAssignments.map(a => {
        const sh = a.shift || store.shifts.find(s => s.id == a.shiftId) || {};
        return {
          assignmentId: a.id,
          assignmentDate: a.assignmentDate || sh.shiftDate,
          status: a.status || 'ASSIGNED',
          shiftId: sh.id,
          shiftName: sh.shiftName || 'Operational Shift',
          shiftCode: sh.shiftCode || 'SHF-01',
          startTime: sh.startTime || '08:00',
          endTime: sh.endTime || '16:00',
          workLocation: a.workLocation?.locationName || sh.workLocation?.locationName || 'Main Hub',
          address: a.workLocation?.address || sh.workLocation?.address || 'Terminal Yard'
        };
      });
      return Promise.resolve({ data: schedule });
    }
    if (url.includes('/operational-dashboard')) {
      const shiftsWithStatus = store.shifts.map(s => {
        const asgCount = store.assignments.filter(a => (a.shift?.id === s.id || a.shiftId == s.id) && a.status === 'ASSIGNED').length;
        const req = s.requiredEmployees || 5;
        let st = 'UNDERSTAFFED';
        if (asgCount === req) st = 'FULLY_STAFFED';
        else if (asgCount > req) st = 'OVERSTAFFED';
        return {
          shiftId: s.id,
          shiftName: s.shiftName,
          shiftDate: s.shiftDate,
          requiredStaff: req,
          assignedStaff: asgCount,
          remainingStaff: Math.max(0, req - asgCount),
          status: st,
          locationName: s.workLocation?.locationName || 'Main Terminal',
          startTime: s.startTime,
          endTime: s.endTime
        };
      });
      return Promise.resolve({
        data: {
          date: new Date().toISOString().split("T")[0],
          metrics: {
            totalShifts: store.shifts.length,
            totalRequiredStaff: store.shifts.reduce((acc, s) => acc + (s.requiredEmployees || 5), 0),
            totalAssignedStaff: store.assignments.filter(a => a.status === 'ASSIGNED').length,
            remainingStaffNeeded: Math.max(0, store.shifts.reduce((acc, s) => acc + (s.requiredEmployees || 5), 0) - store.assignments.filter(a => a.status === 'ASSIGNED').length),
            understaffedShifts: shiftsWithStatus.filter(s => s.status === 'UNDERSTAFFED').length,
            fullyStaffedShifts: shiftsWithStatus.filter(s => s.status === 'FULLY_STAFFED').length,
            overstaffedShifts: shiftsWithStatus.filter(s => s.status === 'OVERSTAFFED').length,
            employeesOnLeave: store.leaves?.filter(l => l.status === 'APPROVED')?.length || 0,
            pendingTransfers: store.transfers?.filter(t => t.status === 'PENDING' || t.status === 'REQUESTED')?.length || 0
          },
          shifts: shiftsWithStatus,
          attendanceSummary: {
            totalScheduled: store.assignments.length,
            present: store.attendances.filter(a => a.status === 'PRESENT').length,
            late: store.attendances.filter(a => a.status === 'LATE').length,
            notMarked: 0,
            absent: store.attendances.filter(a => a.status === 'ABSENT').length,
            notScheduledAlerts: 0
          },
          unscheduledAlerts: []
        }
      });
    }
    if (url.includes('/attendance-monitoring')) {
      const scheduledRoster = store.assignments.map(a => {
        const emp = a.employee || store.employees.find(e => e.id == a.employeeId) || {};
        const sh = a.shift || store.shifts.find(s => s.id == a.shiftId) || {};
        const att = store.attendances.find(at => at.employee?.id === emp.id);
        return {
          shiftId: sh.id,
          shiftName: sh.shiftName || 'Operational Shift',
          shiftHours: `${sh.startTime || '08:00'} - ${sh.endTime || '16:00'}`,
          location: sh.workLocation?.locationName || 'General',
          employeeId: emp.id,
          employeeCode: emp.employeeId || `EMP-${emp.id}`,
          employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`,
          department: emp.department?.name || 'General',
          checkInTime: att ? att.checkInTime : null,
          reconciledStatus: att ? att.status : 'NOT_MARKED',
          note: att ? 'Check-in registered' : 'Awaiting check-in'
        };
      });
      return Promise.resolve({
        data: {
          date: new Date().toISOString().split("T")[0],
          graceMinutes: 15,
          summary: {
            totalScheduled: store.assignments.length,
            present: store.attendances.filter(a => a.status === 'PRESENT').length,
            late: store.attendances.filter(a => a.status === 'LATE').length,
            notMarked: 0,
            absent: store.attendances.filter(a => a.status === 'ABSENT').length,
            notScheduledAlerts: 0
          },
          scheduledRoster,
          unscheduledAlerts: []
        }
      });
    }
    if (url.includes('/available-employees')) {
      const available = store.employees.slice(0, 5).map((e, idx) => ({
        employeeId: e.id,
        employeeCode: e.employeeId || `EMP-${e.id}`,
        employeeName: `${e.firstName} ${e.lastName}`,
        department: e.department?.name || 'Operations',
        position: e.position?.title || 'Associate',
        currentWeeklyHours: 16.0 + (idx * 8.0),
        shiftsThisWeek: 2 + idx,
        score: Math.round((95.0 - (idx * 6.5)) * 10.0) / 10.0,
        reasons: ['No shift conflicts', 'Not on leave', idx === 0 ? 'Lowest weekly workload' : 'Fair workload distribution']
      }));
      return Promise.resolve({ data: available });
    }
    if (url.includes('/replacement-suggestions')) {
      const suggestions = store.employees.slice(1, 6).map((e, idx) => ({
        employeeId: e.id,
        employeeCode: e.employeeId || `EMP-${e.id}`,
        employeeName: `${e.firstName} ${e.lastName}`,
        department: e.department?.name || 'Operations',
        position: e.position?.title || 'Associate',
        currentWeeklyHours: 16.0 + (idx * 8.0),
        shiftsThisWeek: 2 + idx,
        score: Math.round((98.0 - (idx * 5.0)) * 10.0) / 10.0,
        reasons: ['No shift conflicts', 'Not on leave', 'Same department', 'Fair workload']
      }));
      return Promise.resolve({ data: suggestions });
    }
    if (url.includes('/confirm-replacement') && method === 'post') {
      const { originalEmployeeId, replacementEmployeeId, reason } = parsedData;
      const origEmp = store.employees.find(e => e.id == originalEmployeeId);
      const repEmp = store.employees.find(e => e.id == replacementEmployeeId);
      const repRecord = {
        id: Date.now(),
        originalEmployee: origEmp,
        replacementEmployee: repEmp,
        replacementDate: new Date().toISOString().split("T")[0],
        reason: reason || 'Replacement confirmed',
        status: 'COMPLETED'
      };
      store.replacements.unshift(repRecord);
      saveMockStore(store);
      return Promise.resolve({
        data: {
          message: 'Replacement confirmed successfully.',
          originalEmployee: origEmp ? `${origEmp.firstName} ${origEmp.lastName}` : 'Original',
          replacementEmployee: repEmp ? `${repEmp.firstName} ${repEmp.lastName}` : 'Replacement',
          status: 'COMPLETED'
        }
      });
    }
    if (url.includes('/transfers') && url.includes('/action') && method === 'put') {
      const parts = url.split('/');
      const actionIdx = parts.indexOf('action');
      const trId = parts[actionIdx - 1];
      const tr = store.transfers.find(t => t.id == trId);
      if (tr) {
        tr.status = (parsedData.status || 'APPROVED').toUpperCase();
        tr.adminRemarks = parsedData.adminRemarks || '';
        saveMockStore(store);
      }
      return Promise.resolve({ data: tr || {} });
    }
    if (url.includes('/daily-monitoring')) {
      return Promise.resolve({
        data: {
          date: new Date().toISOString().split("T")[0],
          totalEmployees: store.employees.length,
          totalLocations: store.workLocations.length,
          todayShifts: store.shifts.length,
          activeAssignments: store.assignments,
          pendingTransfers: store.transfers.filter(t => t.status === 'PENDING').length,
          activeRecalls: store.recalls.filter(r => r.status === 'ACTIVE').length,
          recentMeetings: store.meetings,
          locations: store.workLocations
        }
      });
    }
  }

  // 6. Performance & KPIs
  if (url.includes('/performance')) {
    if (url.includes('/kpis')) {
      if (method === 'get') return Promise.resolve({ data: store.kpis });
      if (method === 'post') {
        const k = { id: Date.now(), status: 'ACTIVE', ...parsedData };
        store.kpis.unshift(k);
        saveMockStore(store);
        return Promise.resolve({ data: k });
      }
    }
    if (url.includes('/evaluations')) {
      if (method === 'get') return Promise.resolve({ data: store.evaluations });
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || null;
        const ev = { id: Date.now(), employee: emp, evaluationDate: new Date().toISOString().split("T")[0], ...parsedData };
        store.evaluations.unshift(ev);
        saveMockStore(store);
        return Promise.resolve({ data: ev });
      }
    }
    if (url.includes('/feedbacks')) {
      if (method === 'get') return Promise.resolve({ data: store.supervisorFeedbacks });
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || null;
        const fb = { id: Date.now(), employee: emp, submittedAt: new Date().toISOString(), ...parsedData };
        store.supervisorFeedbacks.unshift(fb);
        saveMockStore(store);
        return Promise.resolve({ data: fb });
      }
    }
    if (url.includes('/goals')) {
      if (method === 'get') return Promise.resolve({ data: store.goals });
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || null;
        const g = { id: Date.now(), employee: emp, status: 'IN_PROGRESS', ...parsedData };
        store.goals.unshift(g);
        saveMockStore(store);
        return Promise.resolve({ data: g });
      }
    }
  }

  // 7. Payroll & Benefits
  if (url.includes('/payroll')) {
    if (url.includes('/benefits')) {
      if (method === 'get') return Promise.resolve({ data: store.benefits });
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || null;
        const b = { id: Date.now(), employee: emp, status: 'ACTIVE', ...parsedData };
        store.benefits.unshift(b);
        saveMockStore(store);
        return Promise.resolve({ data: b });
      }
    }
    if (url.includes('/payrolls') || url.includes('/runs')) {
      return Promise.resolve({ data: store.payrolls });
    }
    if (url.includes('/process') && method === 'post') {
      const month = parsedData.month || parsedData.payrollMonth || 1;
      const year = parsedData.year || parsedData.payrollYear || 2026;
      let totalGross = 0;
      let totalNet = 0;
      let totalOvertime = 0;
      let totalDeductions = 0;

      store.employees.forEach(emp => {
        const base = Number(emp.baseSalary) || 0;
        const epf = base * 0.08;
        totalGross += base;
        totalDeductions += epf;
        totalNet += (base - epf);
      });

      const newPr = {
        id: Date.now(),
        periodName: parsedData.periodName || `Month ${month}/${year}`,
        payrollMonth: month,
        payrollYear: year,
        totalGross,
        totalNet,
        totalOvertime,
        totalDeductions,
        employeeCount: store.employees.length,
        status: 'COMPLETED',
        processedDate: new Date().toISOString().split("T")[0]
      };
      store.payrolls.unshift(newPr);
      saveMockStore(store);
      return Promise.resolve({ data: newPr });
    }
    if (url.includes('/payslips')) {
      return Promise.resolve({ data: store.payslips });
    }
    if (url.includes('/reports/summary')) {
      const cumulativeGross = store.payrolls.reduce((sum, p) => sum + (p.totalGross || 0), 0);
      const cumulativeNet = store.payrolls.reduce((sum, p) => sum + (p.totalNet || 0), 0);
      const cumulativeOT = store.payrolls.reduce((sum, p) => sum + (p.totalOvertime || 0), 0);
      return Promise.resolve({
        data: {
          totalCycles: store.payrolls.length,
          cumulativeGrossDisbursed: cumulativeGross,
          cumulativeNetDisbursed: cumulativeNet,
          cumulativeOvertimeDisbursed: cumulativeOT,
          payrolls: store.payrolls
        }
      });
    }
  }

  // 8. Compliance & Policies
  if (url.includes('/compliance')) {
    if (url.includes('/policies')) {
      if (method === 'get') return Promise.resolve({ data: store.policies });
      if (method === 'post') {
        const pol = { id: Date.now(), policyCode: parsedData.policyCode || ('POL-' + Math.floor(100 + Math.random() * 900)), status: 'ACTIVE', ...parsedData };
        store.policies.unshift(pol);
        saveMockStore(store);
        return Promise.resolve({ data: pol });
      }
    }
    if (url.includes('/acknowledgements')) {
      if (method === 'get') return Promise.resolve({ data: store.acknowledgements });
      if (method === 'post') {
        const ack = { id: Date.now(), employeeId: parsedData.employeeId, policyId: parsedData.policyId, acknowledgedAt: new Date().toISOString(), status: 'ACKNOWLEDGED' };
        store.acknowledgements.unshift(ack);
        saveMockStore(store);
        return Promise.resolve({ data: ack });
      }
    }
    if (url.includes('/warnings')) {
      if (method === 'get') return Promise.resolve({ data: store.warnings });
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || null;
        const w = { id: Date.now(), employee: emp, status: 'ACTIVE', ...parsedData };
        store.warnings.unshift(w);
        saveMockStore(store);
        return Promise.resolve({ data: w });
      }
    }
    if (url.includes('/disciplinary')) {
      if (method === 'get') return Promise.resolve({ data: store.disciplinary });
      if (method === 'post') {
        const emp = store.employees.find(e => e.id == parsedData.employeeId) || null;
        const d = { id: Date.now(), employee: emp, status: 'RECORDED', ...parsedData };
        store.disciplinary.unshift(d);
        saveMockStore(store);
        return Promise.resolve({ data: d });
      }
    }
    if (url.includes('/summary')) {
      const overallRate = store.policies.length > 0
        ? Math.round((store.acknowledgements.length / store.policies.length) * 100)
        : 100;
      return Promise.resolve({
        data: {
          totalEmployees: store.employees.length,
          totalPolicies: store.policies.length,
          totalAcknowledgements: store.acknowledgements.length,
          activeWarnings: store.warnings.length,
          overallComplianceRate: overallRate
        }
      });
    }
  }

  // 9. Admin & IT Coordinator
  if (url.includes('/admin')) {
    if (url.includes('/users')) {
      if (method === 'get') return Promise.resolve({ data: store.users });
      if (method === 'post') {
        const u = { id: Date.now(), active: true, ...parsedData };
        store.users.unshift(u);
        saveMockStore(store);
        return Promise.resolve({ data: u });
      }
      if (method === 'patch' && url.includes('/toggle-status')) {
        const id = url.split('/')[3];
        const u = store.users.find(user => user.id == id);
        if (u) u.active = !u.active;
        saveMockStore(store);
        return Promise.resolve({ data: u });
      }
    }
    if (url.includes('/audit-logs')) return Promise.resolve({ data: store.auditLogs });
    if (url.includes('/backups')) {
      if (method === 'get') return Promise.resolve({ data: store.backups });
      if (method === 'post') {
        const b = { id: Date.now(), backupName: 'LWS_BACKUP_' + Date.now() + '.sql', backupType: 'FULL_DATABASE', fileSize: '0.1 MB', status: 'SUCCESS', triggeredBy: 'IT_COORDINATOR', createdAt: new Date().toISOString() };
        store.backups.unshift(b);
        saveMockStore(store);
        return Promise.resolve({ data: b });
      }
    }
    if (url.includes('/tickets')) {
      if (method === 'get') return Promise.resolve({ data: store.tickets });
      if (method === 'post') {
        const t = { id: Date.now(), ticketNumber: 'TKT-' + (1000 + store.tickets.length), status: 'OPEN', ...parsedData };
        store.tickets.unshift(t);
        saveMockStore(store);
        return Promise.resolve({ data: t });
      }
      if (method === 'patch') {
        const id = url.split('/')[3];
        const t = store.tickets.find(tick => tick.id == id);
        if (t) Object.assign(t, parsedData);
        saveMockStore(store);
        return Promise.resolve({ data: t });
      }
    }
    if (url.includes('/dashboard')) {
      return Promise.resolve({
        data: {
          totalUsers: store.users.length,
          activeUsers: store.users.filter(u => u.active).length,
          inactiveUsers: store.users.filter(u => !u.active).length,
          totalTickets: store.tickets.length,
          openTickets: store.tickets.filter(t => t.status === 'OPEN').length,
          recentBackups: store.backups,
          systemHealth: 'OPTIMAL',
          lastBackupTime: store.backups[0]?.createdAt || 'None'
        }
      });
    }
  }

  // 10. Notifications
  if (url.includes('/notifications')) {
    if (method === 'get') return Promise.resolve({ data: store.notifications });
    if (method === 'patch' && url.includes('/read')) {
      const id = url.split('/')[2];
      const n = store.notifications.find(notif => notif.id == id);
      if (n) n.read = true;
      saveMockStore(store);
      return Promise.resolve({ data: { message: "Marked as read" } });
    }
  }

  return Promise.resolve({ data: [] });
}

export default apiClient;
