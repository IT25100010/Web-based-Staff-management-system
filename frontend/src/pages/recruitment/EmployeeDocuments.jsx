import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { FileText, Upload, CheckCircle, Clock, AlertCircle, Eye, Edit3, Trash2 } from 'lucide-react';

export const EmployeeDocuments = () => {
  const [searchParams] = useSearchParams();
  const initialEmpId = searchParams.get('employeeId') || '';

  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(initialEmpId);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedDoc, setSelectedDoc] = useState(null);

  const [form, setForm] = useState({
    documentName: '',
    documentType: 'NIC Copy',
    fileUrl: '',
    remarks: '',
    status: 'VERIFIED'
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmpId) {
      loadDocuments(selectedEmpId);
    }
  }, [selectedEmpId]);

  const loadEmployees = async () => {
    try {
      const res = await apiClient.get('/employees');
      const list = res.data || [];
      setEmployees(list);
      if (!selectedEmpId && list.length > 0) {
        setSelectedEmpId(String(list[0].id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDocuments = async (empId) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/employees/${empId}/documents`);
      setDocuments(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents from MySQL.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpload = () => {
    setForm({ documentName: '', documentType: 'NIC Copy', fileUrl: '', remarks: '', status: 'VERIFIED' });
    setError('');
    setIsUploadOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setSelectedDoc(doc);
    setForm({
      documentName: doc.documentName || '',
      documentType: doc.documentType || 'NIC Copy',
      fileUrl: doc.fileUrl || '',
      remarks: doc.remarks || '',
      status: doc.status || 'VERIFIED'
    });
    setError('');
    setIsEditOpen(true);
  };

  const handleOpenView = (doc) => {
    setSelectedDoc(doc);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (doc) => {
    setSelectedDoc(doc);
    setError('');
    setIsDeleteOpen(true);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post(`/employees/${selectedEmpId}/documents`, form);
      setIsUploadOpen(false);
      loadDocuments(selectedEmpId);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving document.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.put(`/employees/documents/${selectedDoc.id}`, form);
      setIsEditOpen(false);
      loadDocuments(selectedEmpId);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating document.');
    }
  };

  const handleDelete = async () => {
    setError('');
    try {
      await apiClient.delete(`/employees/documents/${selectedDoc.id}`);
      setIsDeleteOpen(false);
      loadDocuments(selectedEmpId);
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting document.');
    }
  };

  const currentEmployee = employees.find(e => String(e.id) === String(selectedEmpId));

  const columns = [
    {
      header: 'Document Title',
      accessor: 'documentName',
      render: (r) => <span style={{ fontWeight: 600 }}>{r.documentName}</span>
    },
    {
      header: 'Category / Type',
      accessor: 'documentType',
      render: (r) => <span style={{ color: '#1e3a8a', fontWeight: 600 }}>{r.documentType}</span>
    },
    {
      header: 'Upload Date',
      accessor: 'uploadDate',
      render: (r) => r.uploadDate ? String(r.uploadDate).split('T')[0] : '-'
    },
    {
      header: 'Verification Status',
      accessor: 'status',
      render: (r) => <StatusBadge status={r.status} />
    },
    { header: 'Remarks', accessor: 'remarks' },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => handleOpenView(r)}
            className="btn btn-secondary btn-sm"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleOpenEdit(r)}
            className="btn btn-secondary btn-sm"
            title="Edit Document"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => handleOpenDelete(r)}
            className="btn btn-secondary btn-sm"
            style={{ color: '#ef4444' }}
            title="Delete Document"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Document Governance</h1>
          <p className="page-description">
            Archive, verify, inspect digital dossiers, police reports, and employment contracts.
          </p>
        </div>
        <button onClick={handleOpenUpload} className="btn btn-primary" disabled={!selectedEmpId}>
          <Upload size={16} /> Upload New Document
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>Select Employee Dossier:</span>
          <select
            className="form-control"
            style={{ maxWidth: '400px' }}
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
          >
            <option value="">Select employee</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.employeeId} - {e.firstName} {e.lastName} ({e.department?.name || 'General'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              {currentEmployee ? `Archived Documents for ${currentEmployee.firstName} ${currentEmployee.lastName}` : 'Archived Documents'}
            </h2>
            <p className="card-subtitle">{currentEmployee ? `Employee ID: ${currentEmployee.employeeId} • Department: ${currentEmployee.department?.name || 'General'}` : 'Select an employee to inspect dossier'}</p>
          </div>
        </div>
        <DataTable columns={columns} data={documents} searchPlaceholder="Search documents by title or type..." />
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title={`Upload Document - ${currentEmployee?.firstName || 'Staff'} ${currentEmployee?.lastName || ''}`}>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label className="form-label">Document Title *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Enter document title"
              value={form.documentName}
              onChange={(e) => setForm({ ...form, documentName: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Document Category *</label>
              <select
                className="form-control"
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value })}
              >
                <option value="NIC Copy">NIC Copy / Passport</option>
                <option value="Contract">Signed Employment Contract</option>
                <option value="Police Report">Police Clearance Certificate</option>
                <option value="Medical Report">Medical Fitness Certificate</option>
                <option value="Certificate">Vocational / Forklift Certificate</option>
                <option value="Resume">Curriculum Vitae / Resume</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Verification Status *</label>
              <select
                className="form-control"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="VERIFIED">Verified Official</option>
                <option value="PENDING">Pending Verification</option>
                <option value="REJECTED">Rejected / Resubmission</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">File Path / Digital Scan Reference</label>
            <input
              type="text"
              className="form-control"
              placeholder="/uploads/dossiers/doc_ref.pdf"
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Verification Remarks & Notes</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Certified against original document..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsUploadOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Document Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Document - ${selectedDoc?.documentName}`}>
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">Document Title *</label>
            <input
              type="text"
              className="form-control"
              required
              value={form.documentName}
              onChange={(e) => setForm({ ...form, documentName: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Document Category *</label>
              <select
                className="form-control"
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value })}
              >
                <option value="NIC Copy">NIC Copy / Passport</option>
                <option value="Contract">Signed Employment Contract</option>
                <option value="Police Report">Police Clearance Certificate</option>
                <option value="Medical Report">Medical Fitness Certificate</option>
                <option value="Certificate">Vocational / Forklift Certificate</option>
                <option value="Resume">Curriculum Vitae / Resume</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Verification Status *</label>
              <select
                className="form-control"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="VERIFIED">Verified Official</option>
                <option value="PENDING">Pending Verification</option>
                <option value="REJECTED">Rejected / Resubmission</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">File Reference</label>
            <input
              type="text"
              className="form-control"
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Verification Remarks & Notes</label>
            <textarea
              className="form-control"
              rows="2"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Document
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Document Details">
        {selectedDoc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Document Title</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{selectedDoc.documentName}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Category</span>
              <div style={{ color: '#1e3a8a', fontWeight: 600 }}>{selectedDoc.documentType}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Verification Status</span>
              <div><StatusBadge status={selectedDoc.status} /></div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Remarks</span>
              <div style={{ color: '#334155' }}>{selectedDoc.remarks || 'No remarks recorded.'}</div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsViewOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Delete Document">
        <div>
          <p style={{ color: '#334155', marginBottom: '16px' }}>
            Are you sure you want to permanently delete document record <strong>{selectedDoc?.documentName}</strong>?
          </p>
          <div className="modal-footer">
            <button onClick={() => setIsDeleteOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn btn-danger" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
              Delete Document
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
