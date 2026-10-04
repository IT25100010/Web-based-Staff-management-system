import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { FileText, Plus, Award, Star, Eye, Edit2, Trash2, Calendar, UserCheck, CheckCircle2, TrendingUp } from 'lucide-react';

export const PerformanceEvaluations = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterGrade, setFilterGrade] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal & Auto-calculation State
  const [modalOpen, setModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiSummary, setKpiSummary] = useState(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    evaluationPeriod: '',
    overallScore: 0,
    performanceGrade: 'Unsatisfactory',
    comments: '',
    recommendations: '',
    evaluationDate: ''
  });

  // View Modal
  const [viewEval, setViewEval] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editEval, setEditEval] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    evaluationPeriod: '',
    overallScore: 0,
    performanceGrade: '',
    comments: '',
    recommendations: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
  const [deleteEval, setDeleteEval] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [evalRes, empRes] = await Promise.all([
        apiClient.get('/performance/evaluations'),
        apiClient.get('/employees')
      ]);
      setEvaluations(evalRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When employee or period changes in Add Modal, fetch completed KPI results
  const handleEmployeeChange = async (empId, period = formData.evaluationPeriod) => {
    setFormData((prev) => ({ ...prev, employeeId: empId }));
    if (!empId) {
      setKpiSummary(null);
      setFormData((prev) => ({ ...prev, overallScore: 0, performanceGrade: 'Unsatisfactory' }));
      return;
    }

    try {
      setKpiLoading(true);
      setAddError('');
      const res = await apiClient.get(`/performance/evaluations/employee-kpis?employeeId=${empId}${period ? `&period=${encodeURIComponent(period)}` : ''}`);
      const data = res.data;
      setKpiSummary(data);

      const avgScore = Number(data.averageScore || data.overallScore || 0);
      const derivedGrade = data.derivedGrade || data.performanceGrade || deriveGradeFromScore(avgScore);

      setFormData((prev) => ({
        ...prev,
        overallScore: avgScore,
        performanceGrade: derivedGrade
      }));
    } catch (err) {
      console.error('Error fetching employee KPI results', err);
      setKpiSummary(null);
    } finally {
      setKpiLoading(false);
    }
  };

  const deriveGradeFromScore = (score) => {
    if (score >= 85) return 'Outstanding';
    if (score >= 70) return 'Meets Expectations';
    if (score >= 50) return 'Needs Improvement';
    return 'Unsatisfactory';
  };

  const handleOpenAddModal = () => {
    setKpiSummary(null);
    setAddError('');
    setFormData({
      employeeId: '',
      evaluationPeriod: '2026 Q3 Annual',
      overallScore: 0,
      performanceGrade: 'Unsatisfactory',
      comments: '',
      recommendations: '',
      evaluationDate: ''
    });
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await apiClient.post('/performance/evaluations', {
        employeeId: parseInt(formData.employeeId),
        evaluationPeriod: formData.evaluationPeriod,
        overallScore: parseFloat(formData.overallScore) || 0,
        performanceGrade: formData.performanceGrade,
        comments: formData.comments,
        recommendations: formData.recommendations
      });
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error recording evaluation');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = async (ev) => {
    setEditEval(ev);
    setEditError('');
    setEditForm({
      evaluationPeriod: ev.evaluationPeriod || '',
      overallScore: ev.overallScore || 0,
      performanceGrade: ev.performanceGrade || deriveGradeFromScore(ev.overallScore || 0),
      comments: ev.comments || '',
      recommendations: ev.recommendations || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/performance/evaluations/${editEval.id}`, {
        ...editForm,
        overallScore: parseFloat(editForm.overallScore) || 0,
        performanceGrade: deriveGradeFromScore(parseFloat(editForm.overallScore) || 0)
      });
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating evaluation');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (ev) => {
    setDeleteEval(ev);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/performance/evaluations/${deleteEval.id}`);
      setIsDeleteModalOpen(false);
      setDeleteEval(null);
      fetchData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting evaluation');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredEvaluations = evaluations.filter((ev) => {
    const matchesGrade = !filterGrade || ev.performanceGrade === filterGrade;
    const matchesSearch = !searchQuery.trim() ||
      (ev.employee?.firstName && ev.employee.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.employee?.lastName && ev.employee.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.employee?.employeeId && ev.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.evaluationPeriod && ev.evaluationPeriod.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGrade && matchesSearch;
  });

  const topPerformersCount = evaluations.filter(e =>
    e.performanceGrade === 'Outstanding' || e.performanceGrade === 'EXCEEDS_EXPECTATIONS'
  ).length;

  const needsDevelopmentCount = evaluations.filter(e =>
    e.performanceGrade === 'Needs Improvement' || e.performanceGrade === 'Unsatisfactory' || e.performanceGrade === 'NEEDS_IMPROVEMENT'
  ).length;

  const columns = [
    {
      header: 'Staff Member',
      accessor: 'employee',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.employee?.firstName} {row.employee?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.employee?.employeeId || `EMP-${row.employee?.id}`} • {row.employee?.department?.name || 'Dept'}
          </div>
        </div>
      )
    },
    {
      header: 'Appraisal Period',
      accessor: 'evaluationPeriod',
      render: (row) => <span style={{ fontWeight: 500 }}>{row.evaluationPeriod}</span>
    },
    {
      header: 'Score',
      accessor: 'overallScore',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, color: '#1e3a8a' }}>
          <Star size={15} fill="#f59e0b" color="#f59e0b" />
          <span>{Number(row.overallScore || 0).toFixed(1)} / 100</span>
        </div>
      )
    },
    {
      header: 'Performance Grade',
      accessor: 'performanceGrade',
      render: (row) => <StatusBadge status={row.performanceGrade} />
    },
    {
      header: 'Evaluator',
      render: (row) => row.evaluator?.username ? `${row.evaluator.username}` : 'HR / Operations Lead'
    },
    {
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewEval(row); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Evaluation"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Record"
            onClick={() => handleOpenDelete(row)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Employee Performance Reviews
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Appraisal reviews automatically connected to completed KPI results with calculated scores and derived grades
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} />
          <span>Conduct Performance Review</span>
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Finalized Reviews"
          value={`${evaluations.length} Reviews`}
          subtitle="Annual cycle evaluations"
          icon={FileText}
          color="#3b82f6"
        />
        <StatCard
          title="Top Performers"
          value={`${topPerformersCount} Staff`}
          subtitle="Outstanding performance"
          icon={Star}
          color="#10b981"
        />
        <StatCard
          title="Needs Development"
          value={`${needsDevelopmentCount} Staff`}
          subtitle="Needs coaching / support"
          icon={Award}
          color="#f59e0b"
        />
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '220px' }}
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
          >
            <option value="">All Performance Grades</option>
            <option value="Outstanding">Outstanding (85 - 100)</option>
            <option value="Meets Expectations">Meets Expectations (70 - 84)</option>
            <option value="Needs Improvement">Needs Improvement (50 - 69)</option>
            <option value="Unsatisfactory">Unsatisfactory (&lt; 50)</option>
          </select>

          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Search by staff name, ID, or appraisal period..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredEvaluations}
          loading={loading}
          searchPlaceholder="Filter evaluations..."
        />
      </div>

      {/* CONDUCT PERFORMANCE REVIEW MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Conduct Performance Review"
      >
        <form onSubmit={handleCreate}>
          {addError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {addError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Employee *</label>
              <select
                className="form-control"
                required
                value={formData.employeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
              >
                <option value="">Select employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeId || `EMP-${emp.id}`} — {emp.firstName} {emp.lastName} ({emp.department?.name || 'Dept'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Evaluation Period *</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. 2026 Q3 / Annual Review"
                value={formData.evaluationPeriod}
                onChange={(e) => {
                  setFormData({ ...formData, evaluationPeriod: e.target.value });
                  if (formData.employeeId) {
                    handleEmployeeChange(formData.employeeId, e.target.value);
                  }
                }}
              />
            </div>
          </div>

          {/* KPI PERFORMANCE SUMMARY (AUTO-LOADED) */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '1.25rem', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                KPI Performance Summary
              </div>
              {kpiLoading && (
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Loading KPI activities...</span>
              )}
            </div>

            {formData.employeeId ? (
              kpiSummary && kpiSummary.completedKpis && kpiSummary.completedKpis.length > 0 ? (
                <div>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', marginBottom: '12px' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                          <th style={{ padding: '6px 10px' }}>KPI Activity</th>
                          <th style={{ padding: '6px 10px' }}>Type</th>
                          <th style={{ padding: '6px 10px' }}>Score</th>
                          <th style={{ padding: '6px 10px' }}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kpiSummary.completedKpis.map((kpi, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>{kpi.kpiName}</td>
                            <td style={{ padding: '6px 10px', color: '#64748b' }}>{kpi.kpiType}</td>
                            <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e3a8a' }}>{Number(kpi.score || 0).toFixed(1)} / 100</td>
                            <td style={{ padding: '6px 10px' }}><StatusBadge status={kpi.grade} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculated metrics display */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 14px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#1e40af', textTransform: 'uppercase', fontWeight: 600 }}>Average KPI Score</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
                        {Number(formData.overallScore).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#1e40af', textTransform: 'uppercase', fontWeight: 600 }}>Performance Grade</span>
                      <div style={{ marginTop: '4px' }}>
                        <StatusBadge status={formData.performanceGrade} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', color: '#64748b', textAlign: 'center' }}>
                  No completed KPI activities found for this employee. Overall Score defaults to 0.0%.
                </div>
              )
            ) : (
              <div style={{ padding: '12px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', color: '#64748b', textAlign: 'center' }}>
                Select an employee above to calculate their KPI performance.
              </div>
            )}
          </div>

          {/* READ-ONLY DISPLAY OF CALCULATED SCORE & GRADE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Overall Score (Derived from KPIs) *</label>
              <input
                type="text"
                readOnly
                className="form-control"
                style={{ background: '#f8fafc', fontWeight: 700 }}
                value={`${Number(formData.overallScore).toFixed(1)} / 100`}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Performance Grade (Auto-Derived) *</label>
              <input
                type="text"
                readOnly
                className="form-control"
                style={{ background: '#f8fafc', fontWeight: 700 }}
                value={formData.performanceGrade}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Manager Comments *</label>
            <textarea
              className="form-control"
              required
              rows={3}
              placeholder="Appraisal observations and demonstrated work accomplishments during the review period..."
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Recommendations *</label>
            <textarea
              className="form-control"
              required
              rows={2}
              placeholder="Targeted developmental recommendations, promotion readiness, training..."
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={addLoading}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              {addLoading ? 'Saving...' : 'Finalize Review'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Performance Review Details">
        {viewEval && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
                  {viewEval.employee?.firstName} {viewEval.employee?.lastName}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {viewEval.employee?.employeeId} • {viewEval.employee?.department?.name}
                </span>
              </div>
              <StatusBadge status={viewEval.performanceGrade} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Review Period</span>
                <strong>{viewEval.evaluationPeriod}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Attained Score</span>
                <strong style={{ color: '#1e3a8a', fontSize: '1.1rem' }}>{viewEval.overallScore} / 100</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Review Date</span>
                <strong>{viewEval.evaluationDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Authorized Evaluator</span>
                <strong>{viewEval.evaluator?.username || 'Executive Evaluator'}</strong>
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', background: '#f8fafc' }}>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: '4px', fontSize: '0.85rem' }}>Manager Comments:</div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-line' }}>{viewEval.comments || 'No comments recorded.'}</p>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', background: '#f8fafc' }}>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: '4px', fontSize: '0.85rem' }}>Recommendations:</div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-line' }}>{viewEval.recommendations || 'No recommendations recorded.'}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Performance Review">
        {editEval && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}

            <div style={{ marginBottom: '1rem', padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
              Staff: <strong>{editEval.employee?.firstName} {editEval.employee?.lastName}</strong> ({editEval.employee?.employeeId})
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Evaluation Period *</label>
              <input
                type="text"
                required
                className="form-control"
                value={editForm.evaluationPeriod}
                onChange={(e) => setEditForm({ ...editForm, evaluationPeriod: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Manager Comments *</label>
              <textarea
                className="form-control"
                rows={3}
                required
                value={editForm.comments}
                onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Recommendations *</label>
              <textarea
                className="form-control"
                rows={2}
                required
                value={editForm.recommendations}
                onChange={(e) => setEditForm({ ...editForm, recommendations: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Review'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Performance Review">
        {deleteEval && (
          <div>
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete the performance review for <strong>{deleteEval.employee?.firstName} {deleteEval.employee?.lastName}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
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
