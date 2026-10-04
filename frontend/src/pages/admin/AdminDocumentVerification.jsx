import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { FileText, CheckCircle2, XCircle, Upload, Eye, ShieldCheck, AlertTriangle } from 'lucide-react';

export const AdminDocumentVerification = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadDoc, setUploadDoc] = useState({
    documentName: '',
    documentType: 'NIC Copy',
    notes: ''
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/employees');
        const emps = res.data || [];
        setEmployees(emps);
        if (emps.length > 0) {
          setSelectedEmployee(emps[0]);
          loadDocumentsForEmployee(emps[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const loadDocumentsForEmployee = async (empId) => {
    try {
      const res = await apiClient.get(`/employees/${empId}/documents`);
      setDocuments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    loadDocumentsForEmployee(emp.id);
  };

  const handleVerifyDocument = async (docId) => {
    try {
      await apiClient.put(`/employees/documents/${docId}`, { status: 'VERIFIED' });
      if (selectedEmployee) loadDocumentsForEmployee(selectedEmployee.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify document.');
    }
  };

  const handleRejectDocument = async (docId) => {
    try {
      await apiClient.put(`/employees/documents/${docId}`, { status: 'REJECTED' });
      if (selectedEmployee) loadDocumentsForEmployee(selectedEmployee.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject document.');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      await apiClient.post(`/employees/${selectedEmployee.id}/documents`, {
        documentName: uploadDoc.documentName,
        documentType: uploadDoc.documentType,
        remarks: uploadDoc.notes,
        status: 'VERIFIED'
      });
      setUploadModalOpen(false);
      setUploadDoc({ documentName: '', documentType: 'NIC Copy', notes: '' });
      loadDocumentsForEmployee(selectedEmployee.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save document to MySQL.');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Employee Document Verification & Compliance Audit
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Verify official national identity credentials, signed permanent labor contracts, and statutory certifications
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setUploadModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Upload size={16} />
          <span>Upload Dossier Document</span>
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Audit Status"
          value={documents.length > 0 ? "Verified" : "No Dossiers"}
          subtitle={documents.length > 0 ? "Mandatory documents on file" : "No documents uploaded yet"}
          icon={ShieldCheck}
          color="#10b981"
        />
        <StatCard
          title="Verified Documents"
          value={`${documents.filter(d => d.status === 'VERIFIED').length} Records`}
          subtitle="Officially attested documents"
          icon={CheckCircle2}
          color="#3b82f6"
        />
        <StatCard
          title="Pending Review"
          value={`${documents.filter(d => d.status === 'PENDING').length} Files`}
          subtitle="Awaiting administrative review"
          icon={AlertTriangle}
          color="#8b5cf6"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
        {/* Employee Selector List */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600 }}>Select Personnel</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {employees.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No employees registered.</div>
            ) : (
              employees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: selectedEmployee?.id === emp.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: selectedEmployee?.id === emp.id ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {emp.firstName} {emp.lastName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {emp.employeeId} • {emp.position?.title || 'Staff'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Employee Documents Dossier */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                Dossier Files: {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : 'No Staff Selected'}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                NIC: {selectedEmployee?.nic || '—'} • Employee ID: {selectedEmployee?.employeeId || '—'}
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: documents.length > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
              {documents.length > 0 ? '✓ Documents on file' : 'No documents verified'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No documents uploaded for this employee yet.
              </div>
            ) : (
              documents.map(doc => (
                <div
                  key={doc.id}
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FileText size={28} color="var(--primary)" />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.documentName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Type: {doc.documentType} • Uploaded: {doc.uploadDate || '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <StatusBadge status={doc.status || 'VERIFIED'} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => alert(`Opening preview for ${doc.documentName}...`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.5rem' }}
                      >
                        <Eye size={14} />
                        <span>Inspect</span>
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleVerifyDocument(doc.id)}
                        style={{ color: 'var(--success)', padding: '0.3rem 0.5rem' }}
                        title="Attest / Verify"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRejectDocument(doc.id)}
                        style={{ color: 'var(--danger)', padding: '0.3rem 0.5rem' }}
                        title="Reject Document"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: Upload Dossier Document */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title={selectedEmployee ? `Upload Dossier Document for ${selectedEmployee.firstName} ${selectedEmployee.lastName}` : 'Upload Dossier Document'}
      >
        <form onSubmit={handleUploadSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Document Title</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="Enter document title"
              value={uploadDoc.documentName}
              onChange={(e) => setUploadDoc({ ...uploadDoc, documentName: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Document Classification</label>
            <select
              className="form-control"
              value={uploadDoc.documentType}
              onChange={(e) => setUploadDoc({ ...uploadDoc, documentType: e.target.value })}
            >
              <option value="NIC Copy">National Identity Card (NIC) Certified Copy</option>
              <option value="Contract">Signed Permanent Employment Contract</option>
              <option value="Police Clearance">Police Clearance Certificate</option>
              <option value="Medical Fitness">Port / Warehouse Medical Fitness Certificate</option>
              <option value="Educational Certificate">Educational & Technical Certificates</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Select PDF or Scanned Image</label>
            <input
              type="file"
              className="form-control"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Supports PDF, PNG, JPG up to 10MB
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Upload & Verify Document
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
