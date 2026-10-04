import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  TrendingUp,
  Plus,
  Target,
  Award,
  Eye,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  Check,
  Search,
  BookOpen,
  Filter,
  BarChart2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export const KPIManagement = () => {
  const navigate = useNavigate();

  // Primary top navigation: 'kpis' (KPI Management) | 'results' (KPI Results)
  const [activeTab, setActiveTab] = useState('kpis');

  // Core Data
  const [kpis, setKpis] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for KPI Management Table
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ----------------------------------------------------
  // HELPER: Initial 10 Questions for Fixed MCQ Model
  // ----------------------------------------------------
  const createEmptyMcqQuestions = () =>
    Array.from({ length: 10 }, (_, i) => ({
      questionText: '',
      displayOrder: i + 1,
      correctOptionIndex: 0, // default first radio option
      options: [
        { optionText: '', displayOrder: 1 },
        { optionText: '', displayOrder: 2 },
        { optionText: '', displayOrder: 3 },
        { optionText: '', displayOrder: 4 }
      ]
    }));

  // ----------------------------------------------------
  // CREATE / EDIT KPI WIZARD STATE
  // ----------------------------------------------------
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState('CREATE'); // 'CREATE' | 'EDIT'
  const [editingKpiId, setEditingKpiId] = useState(null);
  const [selectedKpiType, setSelectedKpiType] = useState('MCQ_ASSESSMENT'); // 'MCQ_ASSESSMENT' | 'WORKSHOP'
  const [wizardStep, setWizardStep] = useState(1); // For MCQ: 1=Basic, 2..11=Questions 1..10, 12=Participants. For Workshop: 1=Basic, 2=Details, 3=Participants
  const [wizardError, setWizardError] = useState('');
  const [wizardLoading, setWizardLoading] = useState(false);

  // Form data for Basic & Workshop details
  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
    passMark: 50,
    startDate: '',
    endDate: '',
    instructions: '',
    status: 'ACTIVE',
    // Workshop specific
    workshopTitle: '',
    description: '',
    workshopDate: '',
    startTime: '09:00',
    endTime: '17:00',
    location: '',
    trainer: '',
    maxScore: '100'
  });

  const [mcqQuestions, setMcqQuestions] = useState(createEmptyMcqQuestions);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [participantDeptFilter, setParticipantDeptFilter] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');

  // ----------------------------------------------------
  // ROW ACTIONS STATE
  // ----------------------------------------------------
  // View Details Modal
  const [viewKpi, setViewKpi] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Participants Modal (Specific KPI)
  const [participantsKpi, setParticipantsKpi] = useState(null);
  const [participantsList, setParticipantsList] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [drawerSelectedIds, setDrawerSelectedIds] = useState([]);

  // Workshop Scoring Modal
  const [scoringAssignment, setScoringAssignment] = useState(null);
  const [scoreForm, setScoreForm] = useState({ attendance: 'PRESENT', score: '', remarks: '' });
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState('');

  // Delete Modal
  const [deleteKpi, setDeleteKpi] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ----------------------------------------------------
  // KPI RESULTS TAB STATE
  // ----------------------------------------------------
  const [selectedResultKpiId, setSelectedResultKpiId] = useState('');
  const [resultsSummary, setResultsSummary] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Result Detail Modal (Question breakdown)
  const [selectedDetailAssignmentId, setSelectedDetailAssignmentId] = useState(null);
  const [resultDetailData, setResultDetailData] = useState(null);
  const [resultDetailLoading, setResultDetailLoading] = useState(false);

  // ----------------------------------------------------
  // FETCH CORE DATA
  // ----------------------------------------------------
  const fetchData = async () => {
    try {
      setLoading(true);
      const [kpisRes, deptsRes, empsRes] = await Promise.all([
        apiClient.get('/performance/kpis'),
        apiClient.get('/employees/departments'),
        apiClient.get('/employees')
      ]);
      setKpis(kpisRes.data || []);
      setDepartments(deptsRes.data || []);
      setAllEmployees((empsRes.data || []).filter(e => e.employmentStatus === 'Active' || e.employmentStatus === 'Probation'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ----------------------------------------------------
  // FETCH RESULTS SUMMARY WHEN KPI CHANGES IN RESULTS TAB
  // ----------------------------------------------------
  const fetchResultsSummary = async (kpiId) => {
    if (!kpiId) {
      setResultsSummary(null);
      return;
    }
    try {
      setResultsLoading(true);
      const res = await apiClient.get(`/performance/kpis/${kpiId}/results-summary`);
      setResultsSummary(res.data);
    } catch (err) {
      console.error(err);
      setResultsSummary(null);
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'results') {
      if (!selectedResultKpiId && kpis.length > 0) {
        setSelectedResultKpiId(kpis[0].id.toString());
        fetchResultsSummary(kpis[0].id);
      } else if (selectedResultKpiId) {
        fetchResultsSummary(selectedResultKpiId);
      }
    }
  }, [activeTab, selectedResultKpiId]);

  // ----------------------------------------------------
  // WIZARD CONTROLS & SUBMISSION
  // ----------------------------------------------------
  const handleOpenCreate = () => {
    setWizardMode('CREATE');
    setEditingKpiId(null);
    setSelectedKpiType('MCQ_ASSESSMENT');
    setWizardStep(1);
    setWizardError('');
    setFormData({
      name: '',
      departmentId: '',
      passMark: 50,
      startDate: new Date().toISOString().substring(0, 10),
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10),
      instructions: 'Please answer all 10 questions carefully. Each question carries 10 marks (100 total marks).',
      status: 'ACTIVE',
      workshopTitle: '',
      description: '',
      workshopDate: new Date().toISOString().substring(0, 10),
      startTime: '09:00',
      endTime: '17:00',
      location: 'Training Center A, Port City Office',
      trainer: 'Senior HR Trainer',
      maxScore: '100'
    });
    setMcqQuestions(createEmptyMcqQuestions());
    setSelectedParticipantIds([]);
    setWizardOpen(true);
  };

  const handleOpenEdit = async (kpi) => {
    setWizardMode('EDIT');
    setEditingKpiId(kpi.id);
    setSelectedKpiType(kpi.kpiType === 'WORKSHOP' ? 'WORKSHOP' : 'MCQ_ASSESSMENT');
    setWizardStep(1);
    setWizardError('');

    setFormData({
      name: kpi.name || '',
      departmentId: kpi.department?.id ? kpi.department.id.toString() : '',
      passMark: kpi.passMark || 50,
      startDate: kpi.startDate || '',
      endDate: kpi.endDate || '',
      instructions: kpi.instructions || '',
      status: kpi.status || 'ACTIVE',
      workshopTitle: kpi.workshop?.title || kpi.name || '',
      description: kpi.workshop?.description || kpi.description || '',
      workshopDate: kpi.workshop?.workshopDate || kpi.startDate || '',
      startTime: kpi.workshop?.startTime ? kpi.workshop.startTime.substring(0, 5) : '09:00',
      endTime: kpi.workshop?.endTime ? kpi.workshop.endTime.substring(0, 5) : '17:00',
      location: kpi.workshop?.location || '',
      trainer: kpi.workshop?.trainer || '',
      maxScore: kpi.maxScore?.toString() || '100'
    });

    if (kpi.kpiType === 'MCQ_ASSESSMENT') {
      try {
        const qRes = await apiClient.get(`/performance/kpis/${kpi.id}/questions`);
        const existingQs = qRes.data || [];
        if (existingQs.length === 10) {
          const formatted = existingQs.map((q, idx) => {
            const correctIdx = q.options?.findIndex(o => o.correct);
            return {
              questionText: q.questionText || '',
              displayOrder: idx + 1,
              correctOptionIndex: correctIdx >= 0 ? correctIdx : 0,
              options: (q.options || []).map((o, oIdx) => ({
                optionText: o.optionText || '',
                displayOrder: oIdx + 1
              }))
            };
          });
          setMcqQuestions(formatted);
        } else {
          setMcqQuestions(createEmptyMcqQuestions());
        }
      } catch (err) {
        setMcqQuestions(createEmptyMcqQuestions());
      }
    }

    setWizardOpen(true);
  };

  // Validate Basic Details
  const validateBasicDetails = () => {
    if (!formData.name.trim()) return 'Assessment / KPI Name is required.';
    if (!formData.startDate) return 'Start Date is required.';
    if (!formData.endDate) return 'Due / End Date is required.';
    if (new Date(formData.startDate) > new Date(formData.endDate)) return 'Start Date cannot be after Due Date.';
    if (selectedKpiType === 'MCQ_ASSESSMENT') {
      const pm = parseInt(formData.passMark);
      if (isNaN(pm) || pm < 1 || pm > 100) return 'Pass Mark must be a valid percentage between 1% and 100%.';
    }
    return '';
  };

  // Validate MCQ Question
  const validateMcqQuestion = (qIndex) => {
    const q = mcqQuestions[qIndex];
    if (!q.questionText.trim()) return `Question ${qIndex + 1} text is required.`;
    for (let i = 0; i < 4; i++) {
      if (!q.options[i].optionText.trim()) {
        return `Answer option ${i + 1} for Question ${qIndex + 1} cannot be blank.`;
      }
    }
    if (q.correctOptionIndex === null || q.correctOptionIndex === undefined) {
      return `Please select the correct answer for Question ${qIndex + 1}.`;
    }
    return '';
  };

  // Publish MCQ Wizard
  const handlePublishMcq = async () => {
    setWizardLoading(true);
    setWizardError('');
    try {
      const payload = {
        name: formData.name.trim(),
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
        passMark: parseInt(formData.passMark) || 50,
        startDate: formData.startDate,
        endDate: formData.endDate,
        instructions: formData.instructions,
        status: formData.status,
        questions: mcqQuestions.map((q, idx) => ({
          questionText: q.questionText.trim(),
          displayOrder: idx + 1,
          options: q.options.map((opt, oIdx) => ({
            optionText: opt.optionText.trim(),
            displayOrder: oIdx + 1,
            correct: q.correctOptionIndex === oIdx
          }))
        })),
        assignedEmployeeIds: selectedParticipantIds
      };

      if (wizardMode === 'EDIT' && editingKpiId) {
        await apiClient.put(`/performance/kpis/${editingKpiId}/mcq-wizard`, payload);
      } else {
        await apiClient.post('/performance/kpis/mcq-wizard', payload);
      }

      setWizardOpen(false);
      fetchData();
    } catch (err) {
      setWizardError(err.response?.data?.message || 'Error publishing MCQ assessment.');
    } finally {
      setWizardLoading(false);
    }
  };

  // Publish Workshop Wizard
  const handlePublishWorkshop = async () => {
    setWizardLoading(true);
    setWizardError('');
    try {
      const payload = {
        name: formData.name.trim(),
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        instructions: formData.instructions,
        status: formData.status,
        title: formData.workshopTitle.trim() || formData.name.trim(),
        description: formData.description,
        workshopDate: formData.workshopDate,
        startTime: formData.startTime + ':00',
        endTime: formData.endTime + ':00',
        location: formData.location.trim(),
        trainer: formData.trainer.trim(),
        maxScore: parseFloat(formData.maxScore) || 100,
        assignedEmployeeIds: selectedParticipantIds
      };

      await apiClient.post('/performance/kpis/workshop-wizard', payload);
      setWizardOpen(false);
      fetchData();
    } catch (err) {
      setWizardError(err.response?.data?.message || 'Error publishing workshop.');
    } finally {
      setWizardLoading(false);
    }
  };

  // ----------------------------------------------------
  // PARTICIPANTS SCREEN (SPECIFIC KPI)
  // ----------------------------------------------------
  const handleOpenParticipants = async (kpi) => {
    setParticipantsKpi(kpi);
    setIsParticipantsModalOpen(true);
    setShowAssignDrawer(false);
    setDrawerSelectedIds([]);
    try {
      setParticipantsLoading(true);
      const res = await apiClient.get(`/performance/kpis/${kpi.id}/assignments`);
      setParticipantsList(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleRemoveParticipant = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this participant?')) return;
    try {
      await apiClient.delete(`/performance/assignments/${assignmentId}`);
      if (participantsKpi) {
        const res = await apiClient.get(`/performance/kpis/${participantsKpi.id}/assignments`);
        setParticipantsList(res.data || []);
      }
      fetchData();
    } catch (err) {
      alert('Error removing participant: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAddDrawerParticipants = async () => {
    if (drawerSelectedIds.length === 0) return;
    try {
      await apiClient.post(`/performance/kpis/${participantsKpi.id}/assignments`, {
        employeeIds: drawerSelectedIds
      });
      setShowAssignDrawer(false);
      setDrawerSelectedIds([]);
      const res = await apiClient.get(`/performance/kpis/${participantsKpi.id}/assignments`);
      setParticipantsList(res.data || []);
      fetchData();
    } catch (err) {
      alert('Error assigning employees: ' + (err.response?.data?.message || err.message));
    }
  };

  // Workshop scoring submit
  const handleScoreWorkshopSubmit = async (e) => {
    e.preventDefault();
    setScoreLoading(true);
    setScoreError('');
    try {
      await apiClient.post(`/performance/assignments/${scoringAssignment.id}/score-workshop`, {
        attendance: scoreForm.attendance,
        score: scoreForm.attendance === 'ABSENT' ? 0 : parseFloat(scoreForm.score),
        remarks: scoreForm.remarks
      });
      setScoringAssignment(null);
      if (participantsKpi) {
        const res = await apiClient.get(`/performance/kpis/${participantsKpi.id}/assignments`);
        setParticipantsList(res.data || []);
      }
    } catch (err) {
      setScoreError(err.response?.data?.message || 'Error recording workshop score.');
    } finally {
      setScoreLoading(false);
    }
  };

  // ----------------------------------------------------
  // DELETE KPI
  // ----------------------------------------------------
  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/performance/kpis/${deleteKpi.id}`);
      setIsDeleteModalOpen(false);
      setDeleteKpi(null);
      fetchData();
    } catch (err) {
      alert('Error deleting KPI: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  // ----------------------------------------------------
  // VIEW ASSIGNMENT RESULT DETAILS (MCQ BREAKDOWN)
  // ----------------------------------------------------
  const handleOpenResultDetails = async (assignmentId) => {
    setSelectedDetailAssignmentId(assignmentId);
    setResultDetailLoading(true);
    try {
      const res = await apiClient.get(`/performance/assignments/${assignmentId}/result-details`);
      setResultDetailData(res.data);
    } catch (err) {
      alert('Error loading result breakdown: ' + (err.response?.data?.message || err.message));
    } finally {
      setResultDetailLoading(false);
    }
  };

  // ----------------------------------------------------
  // FILTERED KPI DATA
  // ----------------------------------------------------
  const filteredKpis = kpis.filter((kpi) => {
    const matchesDept = !filterDepartment || kpi.department?.id?.toString() === filterDepartment;
    const matchesType = !filterType || kpi.kpiType === filterType;
    const matchesSearch = !searchQuery.trim() ||
      kpi.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kpi.department?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesType && matchesSearch;
  });

  // Calculate top KPI stats
  const activeKpisCount = kpis.filter(k => k.status === 'ACTIVE').length;
  const totalAssignedStaff = kpis.reduce((sum, k) => sum + (k.assignments?.length || 0), 0);
  const totalCompletedActivities = kpis.reduce((sum, k) => {
    return sum + (k.assignments ? k.assignments.filter(a => a.status === 'COMPLETED').length : 0);
  }, 0);

  // Columns for main KPI table
  const kpiColumns = [
    {
      header: 'KPI Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Created by {row.createdBy?.username || 'HR Admin'}
          </div>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'kpiType',
      render: (row) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: row.kpiType === 'MCQ_ASSESSMENT' ? '#eff6ff' : row.kpiType === 'WORKSHOP' ? '#fdf2f8' : '#f1f5f9',
            color: row.kpiType === 'MCQ_ASSESSMENT' ? '#1d4ed8' : row.kpiType === 'WORKSHOP' ? '#be185d' : '#475569'
          }}
        >
          {row.kpiType === 'MCQ_ASSESSMENT' ? 'MCQ Assessment' : row.kpiType === 'WORKSHOP' ? 'Workshop' : 'Manual Score'}
        </span>
      )
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => <span>{row.department?.name || 'All Departments'}</span>
    },
    {
      header: 'Period',
      render: (row) => (
        <div style={{ fontSize: '0.78rem', color: '#475569' }}>
          {row.startDate || '—'} to {row.endDate || '—'}
        </div>
      )
    },
    {
      header: 'Participants',
      render: (row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={() => handleOpenParticipants(row)}
        >
          <Users size={12} />
          <span>{row.assignments?.length || 0} Staff</span>
        </button>
      )
    },
    {
      header: 'Benchmark',
      render: (row) => (
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
          {row.kpiType === 'MCQ_ASSESSMENT' ? `${row.passMark || 50}% Pass` : `Max: ${row.maxScore || 100}`}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'ACTIVE'} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 7px', fontSize: '0.75rem' }}
            title="View KPI Details"
            onClick={() => { setViewKpi(row); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 7px', fontSize: '0.75rem' }}
            title="Edit Assessment"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 7px', fontSize: '0.75rem', color: '#2563eb' }}
            title="View Results"
            onClick={() => {
              setSelectedResultKpiId(row.id.toString());
              setActiveTab('results');
            }}
          >
            <BarChart2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 7px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete KPI"
            onClick={() => { setDeleteKpi(row); setIsDeleteModalOpen(true); }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Performance & KPI Management
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Structured 10-Question MCQ assessments and hands-on workshops with automatic scoring and pass/fail derivation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} />
            <span>Create KPI</span>
          </button>
        </div>
      </div>

      {/* CLEAN NAVIGATION TABS: ONLY KPI MANAGEMENT & KPI RESULTS */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', gap: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('kpis')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 4px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'kpis' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'kpis' ? '2px solid #2563eb' : '2px solid transparent'
          }}
        >
          KPI Management
        </button>

        <button
          onClick={() => setActiveTab('results')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 4px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'results' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'results' ? '2px solid #2563eb' : '2px solid transparent'
          }}
        >
          KPI Results
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '5px 10px' }}
            onClick={() => navigate('/performance/evaluations')}
          >
            Go to Performance Reviews →
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '5px 10px' }}
            onClick={() => navigate('/performance/goals')}
          >
            Go to Employee Goals →
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: KPI MANAGEMENT DIRECTORY */}
      {/* ==================================================== */}
      {activeTab === 'kpis' && (
        <div>
          {/* STATS SUMMARY CARDS */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <StatCard
              title="Active KPIs"
              value={`${activeKpisCount} Active`}
              subtitle="Published benchmarks"
              icon={TrendingUp}
              color="#3b82f6"
            />
            <StatCard
              title="Assigned Employees"
              value={`${totalAssignedStaff} Staff`}
              subtitle="Across active programs"
              icon={Users}
              color="#10b981"
            />
            <StatCard
              title="Completed Activities"
              value={`${totalCompletedActivities} Submissions`}
              subtitle="Evaluated & graded"
              icon={CheckCircle2}
              color="#8b5cf6"
            />
            <StatCard
              title="Assessment Model"
              value="Fixed 10-MCQ"
              subtitle="10 Qs × 10 Marks = 100"
              icon={Target}
              color="#f59e0b"
            />
          </div>

          {/* FILTER BAR */}
          <div className="card" style={{ marginBottom: '1rem', padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="form-control"
                style={{ width: '200px' }}
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                className="form-control"
                style={{ width: '180px' }}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All KPI Types</option>
                <option value="MCQ_ASSESSMENT">MCQ Assessment</option>
                <option value="WORKSHOP">Workshop</option>
              </select>

              <input
                type="text"
                className="form-control"
                style={{ flex: 1, minWidth: '220px' }}
                placeholder="Search KPIs by title or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* KPI TABLE */}
          <div className="card">
            <DataTable
              columns={kpiColumns}
              data={filteredKpis}
              loading={loading}
              searchPlaceholder="Filter table..."
            />
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: KPI RESULTS */}
      {/* ==================================================== */}
      {activeTab === 'results' && (
        <div>
          {/* KPI SELECTOR */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: '100px' }}>
                Select KPI:
              </div>
              <select
                className="form-control"
                style={{ flex: 1, minWidth: '260px' }}
                value={selectedResultKpiId}
                onChange={(e) => {
                  setSelectedResultKpiId(e.target.value);
                  fetchResultsSummary(e.target.value);
                }}
              >
                {kpis.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({k.kpiType === 'MCQ_ASSESSMENT' ? 'MCQ' : 'Workshop'} • Pass Mark: {k.passMark || 50}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {resultsLoading ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Loading results summary...
            </div>
          ) : resultsSummary ? (
            <div>
              {/* RESULTS SUMMARY STATS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>{resultsSummary.totalAssigned || 0}</div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Completed</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#16a34a' }}>{resultsSummary.completed || 0}</div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pending</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b' }}>{resultsSummary.notCompleted || 0}</div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Average Score</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2563eb' }}>
                    {resultsSummary.averageScore ? `${Number(resultsSummary.averageScore).toFixed(1)}%` : '—'}
                  </div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Highest Score</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#059669' }}>
                    {resultsSummary.highestScore ? `${Number(resultsSummary.highestScore).toFixed(1)}` : '—'}
                  </div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#065f46' }}>Passed (≥ {resultsSummary.passMark || 50}%)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#047857' }}>{resultsSummary.passCount || 0}</div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center', background: '#fef2f2', borderColor: '#fecaca' }}>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>Failed (&lt; {resultsSummary.passMark || 50}%)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b91c1c' }}>{resultsSummary.failCount || 0}</div>
                </div>
              </div>

              {/* RESULTS TABLE */}
              <div className="card">
                <DataTable
                  columns={[
                    {
                      header: 'Employee ID',
                      accessor: 'employee',
                      render: (row) => <span>{row.employee?.employeeId || `EMP-${row.employee?.id}`}</span>
                    },
                    {
                      header: 'Employee Name',
                      accessor: 'employee',
                      render: (row) => (
                        <div style={{ fontWeight: 600 }}>
                          {row.employee?.firstName} {row.employee?.lastName}
                        </div>
                      )
                    },
                    {
                      header: 'Correct',
                      accessor: 'correctAnswers',
                      render: (row) => (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>
                          {row.correctAnswers !== undefined ? `${row.correctAnswers} / 10` : '—'}
                        </span>
                      )
                    },
                    {
                      header: 'Wrong',
                      accessor: 'wrongAnswers',
                      render: (row) => (
                        <span style={{ color: '#dc2626' }}>
                          {row.wrongAnswers !== undefined ? `${row.wrongAnswers} / 10` : '—'}
                        </span>
                      )
                    },
                    {
                      header: 'Score /100',
                      accessor: 'score',
                      render: (row) => (
                        <strong>{Number(row.score || 0).toFixed(1)}</strong>
                      )
                    },
                    {
                      header: 'Percentage',
                      accessor: 'percentage',
                      render: (row) => <span>{Number(row.percentage || 0).toFixed(1)}%</span>
                    },
                    {
                      header: 'Grade',
                      accessor: 'grade',
                      render: (row) => <StatusBadge status={row.grade} />
                    },
                    {
                      header: 'Pass/Fail',
                      render: (row) => {
                        // Pass/Fail evaluated using configured pass mark
                        const passThreshold = resultsSummary?.passMark != null ? resultsSummary.passMark : 50;
                        const isPass = (row.score || 0) >= passThreshold;
                        return isPass ? (
                          <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            PASS
                          </span>
                        ) : (
                          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            FAIL
                          </span>
                        );
                      }
                    },
                    {
                      header: 'Completed Date',
                      render: (row) => (
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {row.evaluatedAt ? row.evaluatedAt.substring(0, 10) : '—'}
                        </span>
                      )
                    },
                    {
                      header: 'Actions',
                      render: (row) => (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleOpenResultDetails(row.assignment?.id || row.id)}
                        >
                          View Details
                        </button>
                      )
                    }
                  ]}
                  data={resultsSummary.results || []}
                  searchPlaceholder="Filter result participants..."
                />
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              Select a KPI above to inspect employee results and scoring breakdown.
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* RESPONSIVE CREATE / EDIT WIZARD MODAL (850 - 1000px) */}
      {/* ==================================================== */}
      <Modal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title={
          selectedKpiType === 'MCQ_ASSESSMENT'
            ? `${wizardMode === 'EDIT' ? 'Edit' : 'Create'} MCQ Assessment — Step ${wizardStep} of 12`
            : `${wizardMode === 'EDIT' ? 'Edit' : 'Create'} Workshop — Step ${wizardStep} of 3`
        }
      >
        <div style={{ maxWidth: '920px', width: '100%', minWidth: 'min(100%, 780px)' }}>
          {wizardError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {wizardError}
            </div>
          )}

          {/* MCQ STEP 1 / WORKSHOP STEP 1: BASIC DETAILS */}
          {wizardStep === 1 && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Assessment Type *</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="kpiType"
                      value="MCQ_ASSESSMENT"
                      checked={selectedKpiType === 'MCQ_ASSESSMENT'}
                      disabled={wizardMode === 'EDIT'}
                      onChange={() => setSelectedKpiType('MCQ_ASSESSMENT')}
                    />
                    MCQ Assessment (10 Questions Fixed)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="kpiType"
                      value="WORKSHOP"
                      checked={selectedKpiType === 'WORKSHOP'}
                      disabled={wizardMode === 'EDIT'}
                      onChange={() => setSelectedKpiType('WORKSHOP')}
                    />
                    Workshop
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">KPI Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Q4 Safety Compliance Assessment"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    className="form-control"
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  >
                    <option value="">All Departments (Company-wide)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedKpiType === 'MCQ_ASSESSMENT' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Pass Mark (%) *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      className="form-control"
                      placeholder="e.g. 50"
                      value={formData.passMark}
                      onChange={(e) => setFormData({ ...formData, passMark: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Due Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {selectedKpiType === 'WORKSHOP' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value, workshopDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Due / End Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Instructions</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Instructions for participating employees..."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                />
              </div>

              {selectedKpiType === 'MCQ_ASSESSMENT' && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div><strong>Format:</strong> 10 Questions Fixed</div>
                  <div><strong>Answers:</strong> 4 Radio Options Each</div>
                  <div><strong>Scoring:</strong> 10 Marks / Question</div>
                  <div><strong>Total Score:</strong> 100 Marks</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setWizardOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const err = validateBasicDetails();
                    if (err) {
                      setWizardError(err);
                      return;
                    }
                    setWizardError('');
                    setWizardStep(2);
                  }}
                >
                  {selectedKpiType === 'MCQ_ASSESSMENT' ? 'Continue to Question 1 →' : 'Continue to Workshop Details →'}
                </button>
              </div>
            </div>
          )}

          {/* MCQ STEPS 2 to 11: QUESTIONS 1 to 10 */}
          {selectedKpiType === 'MCQ_ASSESSMENT' && wizardStep >= 2 && wizardStep <= 11 && (
            <div>
              {/* Question Navigation Bar (1..10 Pills) */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
                  const stepNum = num + 1;
                  const isCurrent = wizardStep === stepNum;
                  const isFilled = mcqQuestions[num - 1].questionText.trim().length > 0;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        // Allow clicking to jump
                        setWizardError('');
                        setWizardStep(stepNum);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: isCurrent ? '#2563eb' : isFilled ? '#a7f3d0' : '#e2e8f0',
                        background: isCurrent ? '#2563eb' : isFilled ? '#ecfdf5' : '#fff',
                        color: isCurrent ? '#fff' : isFilled ? '#065f46' : '#64748b',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      Q{num}
                    </button>
                  );
                })}
              </div>

              {(() => {
                const qIdx = wizardStep - 2; // 0 to 9
                const q = mcqQuestions[qIdx];

                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                        Question {qIdx + 1} of 10
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        10 Marks • Select 1 Correct Answer
                      </span>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label">Question Text *</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder={`Enter question ${qIdx + 1} text...`}
                        value={q.questionText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMcqQuestions((prev) => {
                            const updated = [...prev];
                            updated[qIdx].questionText = val;
                            return updated;
                          });
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label" style={{ marginBottom: '8px' }}>
                        Answer Options & Correct Answer Selection *
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: q.correctOptionIndex === optIdx ? '2px solid #2563eb' : '1px solid #e2e8f0',
                              background: q.correctOptionIndex === optIdx ? '#eff6ff' : '#fff'
                            }}
                          >
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={q.correctOptionIndex === optIdx}
                              onChange={() => {
                                setMcqQuestions((prev) => {
                                  const updated = [...prev];
                                  updated[qIdx].correctOptionIndex = optIdx;
                                  return updated;
                                });
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: 600, color: '#475569', minWidth: '70px' }}>
                              Option {optIdx + 1}:
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              placeholder={`Answer text for option ${optIdx + 1}...`}
                              value={opt.optionText}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMcqQuestions((prev) => {
                                  const updated = [...prev];
                                  updated[qIdx].options[optIdx].optionText = val;
                                  return updated;
                                });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setWizardError('');
                          setWizardStep(wizardStep - 1);
                        }}
                      >
                        ← Back
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          const err = validateMcqQuestion(qIdx);
                          if (err) {
                            setWizardError(err);
                            return;
                          }
                          setWizardError('');
                          setWizardStep(wizardStep + 1);
                        }}
                      >
                        {qIdx === 9 ? 'Continue to Participants →' : `Save & Next (Q${qIdx + 2}) →`}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* MCQ STEP 12 / WORKSHOP STEP 3: ASSIGN PARTICIPANTS */}
          {((selectedKpiType === 'MCQ_ASSESSMENT' && wizardStep === 12) ||
            (selectedKpiType === 'WORKSHOP' && wizardStep === 3)) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                    Assign Eligible Participants
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Select active employees to take this assessment immediately upon publishing
                  </span>
                </div>
                <div style={{ fontWeight: 600, color: '#2563eb' }}>
                  Selected: {selectedParticipantIds.length} Staff
                </div>
              </div>

              {/* Filter controls */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                <select
                  className="form-control"
                  style={{ width: '200px' }}
                  value={participantDeptFilter}
                  onChange={(e) => setParticipantDeptFilter(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Search staff by name or code..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                />

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={() => {
                    const eligible = allEmployees
                      .filter((emp) => !participantDeptFilter || emp.department?.id?.toString() === participantDeptFilter)
                      .map((emp) => emp.id);
                    setSelectedParticipantIds(Array.from(new Set([...selectedParticipantIds, ...eligible])));
                  }}
                >
                  Select All
                </button>
              </div>

              {/* Employees checklist table */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#334155' }}>
                      <th style={{ width: '36px', padding: '8px' }}></th>
                      <th style={{ padding: '8px' }}>Employee Code</th>
                      <th style={{ padding: '8px' }}>Full Name</th>
                      <th style={{ padding: '8px' }}>Department</th>
                      <th style={{ padding: '8px' }}>Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEmployees
                      .filter((emp) => !participantDeptFilter || emp.department?.id?.toString() === participantDeptFilter)
                      .filter((emp) => {
                        if (!participantSearch.trim()) return true;
                        const s = participantSearch.toLowerCase();
                        return (
                          (emp.firstName && emp.firstName.toLowerCase().includes(s)) ||
                          (emp.lastName && emp.lastName.toLowerCase().includes(s)) ||
                          (emp.employeeId && emp.employeeId.toLowerCase().includes(s))
                        );
                      })
                      .map((emp) => {
                        const isChecked = selectedParticipantIds.includes(emp.id);
                        return (
                          <tr
                            key={emp.id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: isChecked ? '#eff6ff' : '#fff',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              setSelectedParticipantIds((prev) =>
                                isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                              );
                            }}
                          >
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                              />
                            </td>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{emp.employeeId || `EMP-${emp.id}`}</td>
                            <td style={{ padding: '8px' }}>{emp.firstName} {emp.lastName}</td>
                            <td style={{ padding: '8px' }}>{emp.department?.name || '—'}</td>
                            <td style={{ padding: '8px' }}>{emp.position?.title || '—'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setWizardStep(wizardStep - 1)}
                  disabled={wizardLoading}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={selectedKpiType === 'MCQ_ASSESSMENT' ? handlePublishMcq : handlePublishWorkshop}
                  disabled={wizardLoading}
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  {wizardLoading
                    ? 'Publishing Assessment...'
                    : selectedKpiType === 'MCQ_ASSESSMENT'
                    ? 'Publish MCQ Assessment'
                    : 'Publish Workshop'}
                </button>
              </div>
            </div>
          )}

          {/* WORKSHOP STEP 2: WORKSHOP DETAILS */}
          {selectedKpiType === 'WORKSHOP' && wizardStep === 2 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Workshop Title *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Forklift Operation & Port Safety Workshop"
                    value={formData.workshopTitle}
                    onChange={(e) => setFormData({ ...formData, workshopTitle: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Workshop Date *</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={formData.workshopDate}
                    onChange={(e) => setFormData({ ...formData, workshopDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Time *</label>
                  <input
                    type="time"
                    required
                    className="form-control"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Time *</label>
                  <input
                    type="time"
                    required
                    className="form-control"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Maximum Score *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="form-control"
                    value={formData.maxScore}
                    onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Colombo Port Dockyard Workshop 3"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trainer / Lead *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Captain Sunimal Silva"
                    value={formData.trainer}
                    onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Workshop Description</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Hands-on skills, practical safety drills..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setWizardStep(1)}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (!formData.workshopTitle.trim()) {
                      setWizardError('Workshop title is required.');
                      return;
                    }
                    if (!formData.workshopDate) {
                      setWizardError('Workshop date is required.');
                      return;
                    }
                    if (!formData.location.trim()) {
                      setWizardError('Location is required.');
                      return;
                    }
                    if (!formData.trainer.trim()) {
                      setWizardError('Trainer is required.');
                      return;
                    }
                    setWizardError('');
                    setWizardStep(3);
                  }}
                >
                  Continue to Participants →
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ==================================================== */}
      {/* PARTICIPANTS MODAL FOR SPECIFIC KPI */}
      {/* ==================================================== */}
      <Modal
        isOpen={isParticipantsModalOpen}
        onClose={() => setIsParticipantsModalOpen(false)}
        title={`Participants: ${participantsKpi?.name || ''}`}
      >
        <div style={{ maxWidth: '850px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {participantsList.length} staff enrolled in this activity
            </span>

            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setShowAssignDrawer(!showAssignDrawer)}
            >
              <Plus size={14} />
              <span>{showAssignDrawer ? 'Hide Add Staff' : 'Add Employees'}</span>
            </button>
          </div>

          {/* Drawer to add staff */}
          {showAssignDrawer && (
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>
                Enroll Additional Employees:
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '10px' }}>
                {allEmployees
                  .filter(e => !participantsList.some(p => p.employee?.id === e.id))
                  .map(emp => (
                    <label
                      key={emp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={drawerSelectedIds.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDrawerSelectedIds([...drawerSelectedIds, emp.id]);
                          } else {
                            setDrawerSelectedIds(drawerSelectedIds.filter(id => id !== emp.id));
                          }
                        }}
                      />
                      <span><strong>{emp.employeeId}</strong> — {emp.firstName} {emp.lastName} ({emp.department?.name})</span>
                    </label>
                  ))}
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                disabled={drawerSelectedIds.length === 0}
                onClick={handleAddDrawerParticipants}
              >
                Enroll Selected ({drawerSelectedIds.length})
              </button>
            </div>
          )}

          {participantsLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading participants...</div>
          ) : (
            <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#334155' }}>
                    <th style={{ padding: '8px' }}>Employee</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px' }}>Assigned Date</th>
                    <th style={{ padding: '8px' }}>Score</th>
                    <th style={{ padding: '8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsList.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>
                        {p.employee?.firstName} {p.employee?.lastName}
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.employee?.employeeId} · {p.employee?.department?.name}</div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <StatusBadge status={p.status || 'PENDING'} />
                      </td>
                      <td style={{ padding: '8px', color: '#64748b' }}>
                        {p.assignedAt ? p.assignedAt.substring(0, 10) : '—'}
                      </td>
                      <td style={{ padding: '8px' }}>
                        {p.result ? (
                          <strong>{Number(p.result.score || 0).toFixed(1)} / {p.result.maxScore || 100}</strong>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Pending</span>
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {participantsKpi?.kpiType === 'WORKSHOP' && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                              onClick={() => {
                                setScoringAssignment(p);
                                setScoreForm({
                                  attendance: p.status === 'ABSENT' ? 'ABSENT' : 'PRESENT',
                                  score: p.result?.score?.toString() || '',
                                  remarks: p.result?.remarks || ''
                                });
                                setScoreError('');
                              }}
                            >
                              Score Workshop
                            </button>
                          )}
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '0.72rem', color: '#ef4444' }}
                            title="Remove assignment"
                            onClick={() => handleRemoveParticipant(p.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {participantsList.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        No participants assigned to this KPI yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setIsParticipantsModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================================================== */}
      {/* WORKSHOP SCORING MODAL */}
      {/* ==================================================== */}
      {scoringAssignment && (
        <Modal
          isOpen={true}
          onClose={() => setScoringAssignment(null)}
          title={`Score Workshop: ${scoringAssignment.employee?.firstName} ${scoringAssignment.employee?.lastName}`}
        >
          <form onSubmit={handleScoreWorkshopSubmit}>
            {scoreError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '12px', fontSize: '0.85rem' }}>
                {scoreError}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Attendance Status *</label>
              <select
                className="form-control"
                value={scoreForm.attendance}
                onChange={(e) => setScoreForm({ ...scoreForm, attendance: e.target.value })}
              >
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT (Score = 0)</option>
              </select>
            </div>

            {scoreForm.attendance === 'PRESENT' && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Score (Max: {participantsKpi?.maxScore || 100}) *</label>
                <input
                  type="number"
                  min="0"
                  max={participantsKpi?.maxScore || 100}
                  step="0.5"
                  required
                  className="form-control"
                  value={scoreForm.score}
                  onChange={(e) => setScoreForm({ ...scoreForm, score: e.target.value })}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Remarks</label>
              <textarea
                className="form-control"
                rows={2}
                value={scoreForm.remarks}
                onChange={(e) => setScoreForm({ ...scoreForm, remarks: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setScoringAssignment(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={scoreLoading}>
                {scoreLoading ? 'Saving...' : 'Save Score'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ==================================================== */}
      {/* RESULT QUESTION BREAKDOWN MODAL */}
      {/* ==================================================== */}
      {selectedDetailAssignmentId && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDetailAssignmentId(null)}
          title={`Assessment Breakdown: ${resultDetailData?.employeeName || 'Staff'}`}
        >
          {resultDetailLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading breakdown...</div>
          ) : resultDetailData ? (
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem' }}>
                <div>Score: <strong>{Number(resultDetailData.score || 0).toFixed(1)} / {resultDetailData.maxScore}</strong></div>
                <div>Grade: <StatusBadge status={resultDetailData.grade} /></div>
                <div>Correct: <strong style={{ color: '#16a34a' }}>{resultDetailData.correctAnswers}</strong> / Wrong: <strong style={{ color: '#dc2626' }}>{resultDetailData.wrongAnswers}</strong></div>
              </div>

              {resultDetailData.questions?.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: q.correct ? '#bbf7d0' : '#fecaca',
                    background: q.correct ? '#f0fdf4' : '#fef2f2',
                    marginBottom: '8px',
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    Q{idx + 1}: {q.questionText}
                  </div>
                  <div>Your Answer: <strong>{q.selectedOptionText}</strong> {q.correct ? '✓' : '✗'}</div>
                  {!q.correct && (
                    <div style={{ color: '#047857' }}>Correct Answer: <strong>{q.correctOptionText}</strong></div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </Modal>
      )}

      {/* ==================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ==================================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete KPI"
      >
        {deleteKpi && (
          <div>
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete KPI <strong>{deleteKpi.name}</strong>?
            </p>
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b', marginBottom: '18px' }}>
              ⚠️ Deleting this KPI will remove all its questions, employee assignments, and assessment submissions.
            </div>
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

      {/* ==================================================== */}
      {/* VIEW DETAILS MODAL */}
      {/* ==================================================== */}
      {viewKpi && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`KPI Details: ${viewKpi.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
              <div><span style={{ color: '#64748b' }}>Type:</span> <strong>{viewKpi.kpiType}</strong></div>
              <div><span style={{ color: '#64748b' }}>Department:</span> <strong>{viewKpi.department?.name || 'All'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Benchmark / Pass Mark:</span> <strong>{viewKpi.passMark ? `${viewKpi.passMark}%` : viewKpi.targetValue}</strong></div>
              <div><span style={{ color: '#64748b' }}>Period:</span> <strong>{viewKpi.startDate} to {viewKpi.endDate}</strong></div>
              <div><span style={{ color: '#64748b' }}>Enrolled Staff:</span> <strong>{viewKpi.assignments?.length || 0} Staff</strong></div>
              <div><span style={{ color: '#64748b' }}>Status:</span> <StatusBadge status={viewKpi.status} /></div>
            </div>

            {viewKpi.instructions && (
              <div>
                <strong style={{ color: '#334155' }}>Instructions:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{viewKpi.instructions}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
