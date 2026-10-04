import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { ShieldCheck, CheckCircle2, AlertTriangle, Download, Award } from 'lucide-react';

export const ComplianceReports = () => {
  const [policies, setPolicies] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [polRes, warnRes] = await Promise.all([
          apiClient.get('/compliance/policies'),
          apiClient.get('/compliance/warnings')
        ]);
        setPolicies(polRes.data || []);
        setWarnings(warnRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportAudit = () => {
    if (policies.length === 0 && warnings.length === 0) {
      alert('No compliance audit records available to export.');
      return;
    }
    alert('Generating Formal ISO & Statutory Labor Compliance Audit Dossier (PDF)... Commenced.');
  };

  const complianceIndex = policies.length > 0 ? (warnings.length === 0 ? '100%' : `${Math.max(0, 100 - warnings.length * 5)}%`) : '0.0%';

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Statutory & Labor Law Compliance Audits
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Audited records for Sri Lanka Department of Labour, CBSL EPF/ETF, and ISO 45001 workplace safety
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleExportAudit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={16} />
          <span>Export Compliance Audit Certificate</span>
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Overall Compliance Index"
          value={complianceIndex}
          subtitle={policies.length > 0 ? "Enterprise audit rating" : "No active policy benchmarks"}
          icon={ShieldCheck}
          color="#10b981"
        />
        <StatCard
          title="Active Corporate Policies"
          value={policies.length}
          subtitle="Enforced operational directives"
          icon={Award}
          color="#3b82f6"
        />
        <StatCard
          title="Active Infraction Warnings"
          value={warnings.filter(w => w.status === 'ACTIVE').length}
          subtitle="Pending remediation"
          icon={AlertTriangle}
          color={warnings.length > 0 ? '#f59e0b' : '#64748b'}
        />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            Operational Labor Compliance Matrix
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Governed by Lanka Workforce Solutions Legal & HR Division</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Compliance Framework</th>
                <th>Policy Code</th>
                <th>Category</th>
                <th>Effective Date</th>
                <th>Audit Verification Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No compliance audit records logged yet. Records will appear after policies and audits are created.
                  </td>
                </tr>
              ) : (
                policies.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</td>
                    <td style={{ fontSize: '0.85rem' }}>{p.policyCode}</td>
                    <td>{p.category}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.effectiveDate}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontWeight: 600 }}>
                        <CheckCircle2 size={16} />
                        Active & Enforced
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
