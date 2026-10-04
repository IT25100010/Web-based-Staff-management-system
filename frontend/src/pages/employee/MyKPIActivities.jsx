import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Award,
  Play,
  Eye,
  AlertCircle,
  HelpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  MapPin,
  User,
  Check,
  X
} from 'lucide-react';

export const MyKPIActivities = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed'

  // Assessment taking state
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [answers, setAnswers] = useState({}); // questionId -> optionId
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Result / Details Modal state
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultDetails, setResultDetails] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);

  // Workshop / Manual Info Modal state
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoAssignment, setInfoAssignment] = useState(null);
  const [workshopDetail, setWorkshopDetail] = useState(null);

  const fetchMyKpis = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/performance/my-kpis');
      setAssignments(res.data || []);
    } catch (err) {
      console.error('Error fetching employee KPI activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyKpis();
  }, []);

  const pendingList = assignments.filter(
    (a) => a.status === 'ASSIGNED' || a.status === 'IN_PROGRESS'
  );
  const completedList = assignments.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'ABSENT' || a.status === 'CANCELLED'
  );

  // 1. Start Assessment
  const handleStartAssessment = async (assignment) => {
    try {
      setAssessmentLoading(true);
      setSubmitError('');
      setAnswers({});
      setCurrentQuestionIndex(0);
      const res = await apiClient.get(`/performance/my-kpis/${assignment.id}`);
      setCurrentAssessment(res.data);
      setAssessmentModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load assessment questions.');
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleSubmitAssessment = async () => {
    if (!currentAssessment) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await apiClient.post(
        `/performance/my-kpis/${currentAssessment.assignmentId}/submit`,
        { answers }
      );
      setConfirmSubmitOpen(false);
      setAssessmentModalOpen(false);
      // Immediately open result view
      handleViewResult(currentAssessment.assignmentId);
      // Refresh assignments
      fetchMyKpis();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Error submitting assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. View Result Details
  const handleViewResult = async (assignmentId) => {
    try {
      setResultLoading(true);
      const res = await apiClient.get(`/performance/my-kpis/${assignmentId}/result`);
      setResultDetails(res.data);
      setResultModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load assessment result.');
    } finally {
      setResultLoading(false);
    }
  };

  // 3. View Workshop/Activity Info
  const handleViewInfo = async (assignment) => {
    setInfoAssignment(assignment);
    setWorkshopDetail(null);
    setInfoModalOpen(true);
    if (assignment.kpi?.kpiType === 'WORKSHOP' && assignment.kpi?.id) {
      try {
        const res = await apiClient.get(`/performance/kpis/${assignment.kpi.id}/workshop`);
        setWorkshopDetail(res.data);
      } catch (err) {
        console.error('Error fetching workshop details:', err);
      }
    }
  };

  const getKpiTypeBadge = (type) => {
    switch (type) {
      case 'MCQ_ASSESSMENT':
        return (
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: '#e0e7ff',
              color: '#3730a3'
            }}
          >
            MCQ Assessment
          </span>
        );
      case 'WORKSHOP':
        return (
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: '#fef3c7',
              color: '#92400e'
            }}
          >
            Workshop
          </span>
        );
      case 'MANUAL_SCORE':
        return (
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: '#f3e8ff',
              color: '#6b21a8'
            }}
          >
            Manual Score
          </span>
        );
      default:
        return <span>{type}</span>;
    }
  };

  const getGradeBadge = (grade) => {
    let bg = '#dcfce7';
    let color = '#15803d';
    if (grade === 'B') {
      bg = '#dbeafe';
      color = '#1d4ed8';
    } else if (grade === 'C') {
      bg = '#fef3c7';
      color = '#b45309';
    } else if (grade === 'D') {
      bg = '#ffedd5';
      color = '#c2410c';
    } else if (grade === 'F') {
      bg = '#fee2e2';
      color = '#b91c1c';
    }
    return (
      <span
        style={{
          display: 'inline-block',
          width: '28px',
          height: '28px',
          lineHeight: '28px',
          textAlign: 'center',
          borderRadius: '50%',
          fontWeight: 700,
          fontSize: '0.875rem',
          background: bg,
          color: color
        }}
      >
        {grade || '-'}
      </span>
    );
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">My KPI Activities & Assessments</h1>
          <p className="page-subtitle">
            Participate in allocated performance assessments, workshops, and review results.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <StatCard
          title="Total Assigned KPIs"
          value={assignments.length}
          icon={TrendingUp}
          color="primary"
        />
        <StatCard
          title="Pending Activities"
          value={pendingList.length}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Completed Assessments"
          value={completedList.length}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          title="Avg Achieved Score"
          value={
            completedList.length > 0 && completedList.some((a) => a.result?.score != null)
              ? (
                  completedList
                    .filter((a) => a.result?.score != null)
                    .reduce((sum, a) => sum + Number(a.result.score), 0) /
                  completedList.filter((a) => a.result?.score != null).length
                ).toFixed(1)
              : 'N/A'
          }
          icon={Award}
          color="info"
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.5rem'
        }}
      >
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: '0.95rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'pending' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'pending' ? '#2563eb' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Clock size={18} />
          <span>Pending Activities ({pendingList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          style={{
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: '0.95rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'completed' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'completed' ? '#2563eb' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={18} />
          <span>Completed & Results ({completedList.length})</span>
        </button>
      </div>

      {/* Content for Pending Tab */}
      {activeTab === 'pending' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading your assigned activities...
            </div>
          ) : pendingList.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1'
              }}
            >
              <CheckCircle2 size={40} color="#10b981" style={{ marginBottom: '10px' }} />
              <h3 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '6px' }}>
                All Caught Up!
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                You have no pending KPI activities or assessments awaiting submission.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {pendingList.map((item) => {
                const kpi = item.kpi || {};
                const isMcq = kpi.kpiType === 'MCQ_ASSESSMENT';
                const isWorkshop = kpi.kpiType === 'WORKSHOP';

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: isMcq
                        ? '4px solid #4f46e5'
                        : isWorkshop
                        ? '4px solid #f59e0b'
                        : '4px solid #9333ea'
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px'
                        }}
                      >
                        {getKpiTypeBadge(kpi.kpiType)}
                        <StatusBadge status={item.status} />
                      </div>

                      <h3
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 600,
                          color: '#1e293b',
                          marginBottom: '6px'
                        }}
                      >
                        {kpi.name}
                      </h3>

                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: '#64748b',
                          marginBottom: '12px',
                          lineHeight: '1.4'
                        }}
                      >
                        {kpi.description || 'No description provided.'}
                      </p>

                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '10px',
                          borderRadius: '6px',
                          fontSize: '0.825rem',
                          marginBottom: '14px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '4px'
                          }}
                        >
                          <span style={{ color: '#64748b' }}>Department:</span>
                          <span style={{ fontWeight: 500, color: '#334155' }}>
                            {kpi.department?.name || 'All Departments'}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '4px'
                          }}
                        >
                          <span style={{ color: '#64748b' }}>Target Benchmark:</span>
                          <span style={{ fontWeight: 500, color: '#334155' }}>
                            {kpi.targetValue || '-'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Due Date:</span>
                          <span style={{ fontWeight: 500, color: '#334155' }}>
                            {kpi.endDate || 'No deadline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isMcq ? (
                        <button
                          onClick={() => handleStartAssessment(item)}
                          disabled={assessmentLoading}
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            display: 'flex',
                            gap: '8px'
                          }}
                        >
                          <Play size={16} />
                          <span>Start Assessment</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleViewInfo(item)}
                          className="btn btn-secondary"
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            display: 'flex',
                            gap: '8px'
                          }}
                        >
                          <Eye size={16} />
                          <span>View Details</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content for Completed Tab */}
      {activeTab === 'completed' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading completed activities...
            </div>
          ) : completedList.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1'
              }}
            >
              <HelpCircle size={40} color="#94a3b8" style={{ marginBottom: '10px' }} />
              <h3 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '6px' }}>
                No Completed Records Yet
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Once you finish assessments or manager scores activities, your results appear here.
              </p>
            </div>
          ) : (
            <div className="card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>KPI Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Score / Max</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                    <th>Completed Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedList.map((item) => {
                    const kpi = item.kpi || {};
                    const res = item.result;
                    const isMcq = kpi.kpiType === 'MCQ_ASSESSMENT';

                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{kpi.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {kpi.department?.name || 'Company-Wide'}
                          </div>
                        </td>
                        <td>{getKpiTypeBadge(kpi.kpiType)}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>
                          {res?.score != null ? (
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                              {res.score} / {res.maxScore}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Awaiting score</span>
                          )}
                        </td>
                        <td>
                          {res?.percentage != null ? (
                            <span style={{ fontWeight: 600 }}>{res.percentage}%</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{getGradeBadge(res?.grade)}</td>
                        <td>
                          {item.completedAt
                            ? new Date(item.completedAt).toLocaleDateString()
                            : item.assignedAt
                            ? new Date(item.assignedAt).toLocaleDateString()
                            : '-'}
                        </td>
                        <td>
                          {isMcq && res ? (
                            <button
                              onClick={() => handleViewResult(item.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Eye size={14} />
                              <span>Review Answers</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleViewInfo(item)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Eye size={14} />
                              <span>View Details</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: MCQ Assessment Modal */}
      <Modal
        isOpen={assessmentModalOpen}
        onClose={() => {
          if (
            window.confirm(
              'Are you sure you want to exit? Your answers will not be submitted until you click Submit.'
            )
          ) {
            setAssessmentModalOpen(false);
          }
        }}
        title={currentAssessment?.kpiName || 'KPI MCQ Assessment'}
      >
        {currentAssessment && (
          <div>
            {/* Header info */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '1rem'
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#2563eb',
                    background: '#eff6ff',
                    padding: '4px 10px',
                    borderRadius: '6px'
                  }}
                >
                  Question {currentQuestionIndex + 1} of 10
                </span>
                <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Total: <strong>100 Marks</strong> (10 Marks / Question)
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: Object.keys(answers).length === 10 ? '#16a34a' : '#b45309',
                  background: Object.keys(answers).length === 10 ? '#dcfce7' : '#fef3c7',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}
              >
                Answered {Object.keys(answers).length} / 10
              </div>
            </div>

            {/* Instructions box */}
            {currentAssessment.instructions && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  color: '#475569'
                }}
              >
                <strong>Instructions:</strong> {currentAssessment.instructions}
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  marginBottom: '1rem',
                  fontSize: '0.875rem'
                }}
              >
                {submitError}
              </div>
            )}

            {/* Question Card */}
            {currentAssessment.questions && currentAssessment.questions.length > 0 && (
              <div>
                {(() => {
                  const q = currentAssessment.questions[currentQuestionIndex];
                  if (!q) return null;

                  return (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '1.25rem',
                        marginBottom: '1.25rem'
                      }}
                    >
                      <div
                        style={{
                          marginBottom: '1.25rem',
                          borderBottom: '1px solid #f1f5f9',
                          paddingBottom: '10px'
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                          Question {currentQuestionIndex + 1} of 10
                        </div>
                        <h4
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 600,
                            color: '#1e293b',
                            lineHeight: '1.4',
                            margin: 0
                          }}
                        >
                          {q.questionText}
                        </h4>
                      </div>

                      {/* Exactly 4 Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {q.options?.map((opt, optIndex) => {
                          const isSelected = answers[q.questionId] === opt.optionId;

                          return (
                            <label
                              key={opt.optionId}
                              onClick={() => handleSelectOption(q.questionId, opt.optionId)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 14px',
                                borderRadius: '6px',
                                border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                background: isSelected ? '#eff6ff' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input
                                type="radio"
                                name={`question_${q.questionId}`}
                                checked={isSelected}
                                onChange={() => handleSelectOption(q.questionId, opt.optionId)}
                                style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              <span
                                style={{
                                  fontSize: '0.9rem',
                                  color: isSelected ? '#1e40af' : '#334155',
                                  fontWeight: isSelected ? 600 : 400
                                }}
                              >
                                <strong>Answer {optIndex + 1}:</strong> {opt.optionText}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Progress Indicators & Navigation */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1rem',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  >
                    <ChevronLeft size={16} />
                    <span>Back</span>
                  </button>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {currentAssessment.questions.map((q, idx) => {
                      const isAnswered = answers[q.questionId] != null;
                      const isCurrent = idx === currentQuestionIndex;

                      return (
                        <button
                          key={q.questionId}
                          type="button"
                          onClick={() => setCurrentQuestionIndex(idx)}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '4px',
                            border: isCurrent
                              ? '2px solid #2563eb'
                              : isAnswered
                              ? '1px solid #10b981'
                              : '1px solid #cbd5e1',
                            background: isCurrent ? '#2563eb' : isAnswered ? '#ecfdf5' : '#ffffff',
                            color: isCurrent ? '#ffffff' : isAnswered ? '#059669' : '#64748b',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  {currentQuestionIndex < currentAssessment.questions.length - 1 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        setCurrentQuestionIndex((prev) =>
                          Math.min(currentAssessment.questions.length - 1, prev + 1)
                        )
                      }
                    >
                      <span>Next Question</span>
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={Object.keys(answers).length < 10}
                      onClick={() => setConfirmSubmitOpen(true)}
                      style={{
                        background: Object.keys(answers).length === 10 ? '#16a34a' : '#94a3b8',
                        borderColor: Object.keys(answers).length === 10 ? '#16a34a' : '#94a3b8',
                        color: '#fff',
                        cursor: Object.keys(answers).length === 10 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <span>Submit Assessment</span>
                    </button>
                  )}
                </div>

                {currentQuestionIndex === 9 && Object.keys(answers).length < 10 && (
                  <div
                    style={{
                      textAlign: 'right',
                      marginTop: '8px',
                      fontSize: '0.8rem',
                      color: '#b45309'
                    }}
                  >
                    All 10 questions must be answered before submission (Answered {Object.keys(answers).length} / 10).
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* CONFIRMATION DIALOG BEFORE SUBMISSION */}
      <Modal
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        title="Confirm Assessment Submission"
      >
        {currentAssessment && (
          <div>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <AlertCircle size={44} color="#16a34a" style={{ marginBottom: '10px' }} />
              <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '8px' }}>
                Submit Assessment?
              </h3>
              <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '14px' }}>
                You have answered all <strong>10 of 10</strong> questions.
                Once submitted, your assessment will be automatically marked out of <strong>100</strong> and your result will be permanently recorded.
              </p>
              <div
                style={{
                  padding: '8px 12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  color: '#15803d',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}
              >
                No further edits or re-submissions will be permitted after submission.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmSubmitOpen(false)}
              >
                Back & Review
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={handleSubmitAssessment}
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
              >
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Result Details / Review Answers */}
      <Modal
        isOpen={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title="Assessment Result & Review"
      >
        {resultDetails ? (
          <div>
            {/* Score summary banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '1.25rem'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                  {resultDetails.kpiName}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {getKpiTypeBadge(resultDetails.kpiType)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                    {resultDetails.score} / {resultDetails.maxScore}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {resultDetails.percentage}% Score
                  </div>
                </div>
                <div>{getGradeBadge(resultDetails.grade)}</div>
              </div>
            </div>

            {/* Remarks */}
            {resultDetails.remarks && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#1e40af',
                  marginBottom: '1.25rem'
                }}
              >
                <strong>Evaluation Feedback:</strong> {resultDetails.remarks}
              </div>
            )}

            {/* Question Breakdown (if MCQ) */}
            {resultDetails.questions && resultDetails.questions.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px' }}>
                  Question Breakdown
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {resultDetails.questions.map((item, idx) => (
                    <div
                      key={item.questionId}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        border: item.correct ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        background: item.correct ? '#f0fdf4' : '#fef2f2'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px'
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                          {idx + 1}. {item.questionText}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: item.correct ? '#dcfce7' : '#fee2e2',
                            color: item.correct ? '#15803d' : '#b91c1c'
                          }}
                        >
                          {item.correct ? 'Correct (+10 Marks)' : 'Incorrect (0 Marks)'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', marginBottom: '2px' }}>
                        <span style={{ color: '#64748b' }}>Your answer: </span>
                        <strong style={{ color: item.correct ? '#15803d' : '#b91c1c' }}>
                          {item.selectedOptionText}
                        </strong>
                      </div>

                      {!item.correct && (
                        <div style={{ fontSize: '0.85rem', color: '#15803d' }}>
                          <span>Correct answer: </span>
                          <strong>{item.correctOptionText}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResultModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            Loading result details...
          </div>
        )}
      </Modal>

      {/* MODAL 3: Activity / Workshop Info Modal */}
      <Modal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title="Activity Details"
      >
        {infoAssignment && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                  {infoAssignment.kpi?.name}
                </h3>
                {getKpiTypeBadge(infoAssignment.kpi?.kpiType)}
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.4' }}>
                {infoAssignment.kpi?.description || 'No description available.'}
              </p>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '1rem'
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  fontSize: '0.875rem'
                }}
              >
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Department</span>
                  <strong style={{ color: '#334155' }}>
                    {infoAssignment.kpi?.department?.name || 'All'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Target Benchmark</span>
                  <strong style={{ color: '#334155' }}>
                    {infoAssignment.kpi?.targetValue || '-'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Start Date</span>
                  <strong style={{ color: '#334155' }}>
                    {infoAssignment.kpi?.startDate || '-'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>End / Due Date</span>
                  <strong style={{ color: '#334155' }}>
                    {infoAssignment.kpi?.endDate || '-'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Max Possible Score</span>
                  <strong style={{ color: '#334155' }}>
                    {infoAssignment.kpi?.maxScore || 100}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Weightage</span>
                  <strong style={{ color: '#334155' }}>
                    {infoAssignment.kpi?.weightage || 20}%
                  </strong>
                </div>
              </div>
            </div>

            {workshopDetail && (
              <div
                style={{
                  background: '#fefce8',
                  border: '1px solid #fde047',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}
              >
                <h4
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#854d0e',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Calendar size={16} /> Workshop Session Details
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    fontSize: '0.85rem'
                  }}
                >
                  <div>
                    <span style={{ color: '#713f12' }}>Date:</span>{' '}
                    <strong>{workshopDetail.workshopDate || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#713f12' }}>Time:</span>{' '}
                    <strong>
                      {workshopDetail.startTime} - {workshopDetail.endTime}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#713f12' }}>Venue:</span>{' '}
                    <strong>{workshopDetail.location || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#713f12' }}>Trainer:</span>{' '}
                    <strong>{workshopDetail.trainer || '-'}</strong>
                  </div>
                </div>
              </div>
            )}

            {infoAssignment.kpi?.instructions && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                  Instructions:
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {infoAssignment.kpi?.instructions}
                </p>
              </div>
            )}

            {infoAssignment.result && (
              <div
                style={{
                  padding: '12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#15803d', fontWeight: 600 }}>Achieved Score:</span>
                  <span style={{ color: '#15803d', fontWeight: 700 }}>
                    {infoAssignment.result.score} / {infoAssignment.result.maxScore} (Grade:{' '}
                    {infoAssignment.result.grade})
                  </span>
                </div>
                {infoAssignment.result.remarks && (
                  <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '4px' }}>
                    Remarks: {infoAssignment.result.remarks}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInfoModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
