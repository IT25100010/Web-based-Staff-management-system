import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/common/DataTable';
import {
  Clock,
  MapPin,
  Users,
  Repeat,
  AlertTriangle,
  CalendarDays,
  ArrowRight,
  TrendingDown,
  Layers,
  Plus
} from 'lucide-react';

export const OperationsManagerDashboard = () => {
  const [data, setData] = useState({
    totalEmployees: 0,
    totalLocations: 0,
    todayShifts: 0,
    activeAssignments: [],
    pendingTransfers: 0,
    activeRecalls: 0,
    recentMeetings: [],
    locations: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOperationsData();
  }, []);

  const loadOperationsData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/workforce/daily-monitoring');
      setData(res.data || {});
    } catch (e) {
      console.error('Error loading operations data', e);
    } finally {
      setLoading(false);
    }
  };

  const assignmentColumns = [
    { header: 'Employee', accessor: 'employee', render: (r) => <span style={{ fontWeight: 600 }}>{r.employee?.firstName} {r.employee?.lastName} ({r.employee?.employeeId})</span> },
    { header: 'Work Location', accessor: 'workLocation', render: (r) => r.workLocation?.locationName || '—' },
    { header: 'Assigned Shift', accessor: 'shift', render: (r) => <span style={{ color: '#1e3a8a', fontWeight: 600 }}>{r.shift?.shiftName}</span> },
    { header: 'Date', accessor: 'assignmentDate' },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations Manager Dashboard</h1>
          <p className="page-description">
            Live workforce deployments, site assignments, shift staffing, transfers, and emergency recalls.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/workforce/assignments" className="btn btn-primary">
            <Plus size={16} /> Assign Employee
          </Link>
          <Link to="/workforce/recalls" className="btn btn-danger">
            <AlertTriangle size={16} /> Emergency Recall
          </Link>
        </div>
      </div>

      {/* Operations Stat Cards */}
      <div className="stat-grid">
        <StatCard title="Total Workforce" value={data.totalEmployees || 0} icon={Users} color="blue" subtext="Available staff pool" />
        <StatCard title="Today's Shifts" value={data.todayShifts || 0} icon={Clock} color="purple" subtext="Active scheduled shifts" />
        <StatCard title="Active Locations" value={data.totalLocations || 0} icon={MapPin} color="green" subtext="Operating logistics terminals" />
        <StatCard title="Pending Transfers" value={data.pendingTransfers || 0} icon={Repeat} color="amber" subtext="Site reassignments" />
        <StatCard title="Active Staff Recalls" value={data.activeRecalls || 0} icon={AlertTriangle} color="red" subtext="Urgent staff recalls" />
        <StatCard title="Workforce Shortage" value={data.workforceShortage ? `${data.workforceShortage} Associates` : 'None'} icon={TrendingDown} color="amber" subtext="Coverage variance" />
      </div>

      {/* Active Emergency Recall Alert Notice */}
      {data.activeRecalls > 0 && (
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.95rem' }}>
                ACTIVE EMERGENCY STAFF RECALL IN EFFECT
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#7f1d1d', marginTop: '2px' }}>
                Operational surge requires emergency shifts. Review the alert roster.
              </div>
            </div>
          </div>
          <Link to="/workforce/recalls" className="btn btn-danger btn-sm">
            View Directive
          </Link>
        </div>
      )}

      {/* Deployments and Shift Roster Overview */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Live Site Deployments & Shift Roster</h2>
            <p className="card-subtitle">Staff actively assigned to terminal operations today</p>
          </div>
          <Link to="/workforce/assignments" style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Manage Allocations <ArrowRight size={14} />
          </Link>
        </div>
        <DataTable
          columns={assignmentColumns}
          data={data.activeAssignments || []}
          searchPlaceholder="Search..."
          emptyMessage="No active shift assignments. Click 'Assign Employee' to deploy staff to a location."
        />
      </div>

      {/* Logistics Hubs Overview */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Regional Logistics Hubs & Capacities</h2>
            <p className="card-subtitle">Operational deployment centers</p>
          </div>
          <Link to="/workforce/locations" style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            All Locations <ArrowRight size={14} />
          </Link>
        </div>

        {data.locations && data.locations.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {data.locations.map(loc => (
              <div key={loc.id} style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>{loc.locationCode}</span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>{loc.locationName}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{loc.address}</p>
                  </div>
                  <StatusBadge status={loc.status} />
                </div>
                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569' }}>
                  <span>Capacity: <strong>{loc.capacity} Staff</strong></span>
                  <span>Contact: <strong>{loc.contactPerson}</strong></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            No work locations registered yet. Click 'All Locations' to register a logistics hub.
          </div>
        )}
      </div>
    </div>
  );
};
