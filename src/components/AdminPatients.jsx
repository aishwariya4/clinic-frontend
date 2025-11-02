// src/components/AdminPatients.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("adminToken");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default function AdminPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // modal state
  const [apptOpen, setApptOpen] = useState(false);
  const [apptPatient, setApptPatient] = useState(null);

  // appointments
  const [apptLoading, setApptLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);

  // waitlist
  const [waitLoading, setWaitLoading] = useState(false);
  const [waitlist, setWaitlist] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr("");

    api
      .get("/admins/patients", { params: { page, limit: pageSize } })
      .then((res) => {
        const data = res.data || {};
        if (!cancelled) {
          setPatients(Array.isArray(data.patients) ? data.patients : []);
          setTotalPages(data.totalPages || 1);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e?.response?.status === 401 ? "Unauthorized" : "Failed to load");
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [page]);

  const openAppointments = async (p) => {
    setApptPatient(p);
    setAppointments([]);
    setWaitlist([]);
    setApptOpen(true);

    setApptLoading(true);
    setWaitLoading(true);

    try {
      const [apptsRes, wlRes] = await Promise.all([
        api.get(`/admins/patients/${p.id}/appointments`, {
          params: { limit: 200, patient_id: p.id },
        }),
        api.get(`/admins/patients/${p.id}/waitlist`, {
          params: { patient_id: p.id },
        }),
      ]);

      const appts =
        (Array.isArray(apptsRes.data) && apptsRes.data) ||
        (Array.isArray(apptsRes.data?.appointments) && apptsRes.data.appointments) ||
        (Array.isArray(apptsRes.data?.rows) && apptsRes.data.rows) ||
        (Array.isArray(apptsRes.data?.data) && apptsRes.data.data) ||
        [];

      const wl =
        (Array.isArray(wlRes.data) && wlRes.data) ||
        (Array.isArray(wlRes.data?.waitlist) && wlRes.data.waitlist) ||
        [];

      setAppointments(appts);
      setWaitlist(wl);
    } catch (e) {
      console.error("Failed to load modal data", e);
      setAppointments([]);
      setWaitlist([]);
    } finally {
      setApptLoading(false);
      setWaitLoading(false);
    }
  };

  const closeAppointments = () => {
    setApptOpen(false);
    setApptPatient(null);
    setAppointments([]);
    setWaitlist([]);
  };

  return (
    <div className="admin-patients-container">
      <style>{`
        .admin-patients-container {
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 14px;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px;
          color: #64748b;
          gap: 12px;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-state {
          background: #fef2f2;
          color: #dc2626;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          margin-bottom: 16px;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .data-table th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .data-table td {
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #374151;
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .data-table tr:hover {
          background: #f8fafc;
        }

        .patient-code {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 13px;
          color: #6b7280;
          background: #f3f4f6;
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-block;
        }

        .patient-name {
          font-weight: 600;
          color: #1f2937;
        }

        .patient-email {
          color: #3b82f6;
          text-decoration: none;
          font-size: 14px;
        }

        .patient-email:hover {
          text-decoration: underline;
        }

        .join-date {
          color: #6b7280;
          font-size: 13px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
          border-color: #2563eb;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 20px;
          padding: 16px;
        }

        .pagination-info {
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        .empty-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .empty-subtitle {
          font-size: 14px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 1000px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .modal-subtitle {
          color: #64748b;
          font-size: 14px;
          margin-top: 4px;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #64748b;
          padding: 4px;
          border-radius: 6px;
        }

        .modal-close:hover {
          background: #f1f5f9;
          color: #374151;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 24px 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #f1f5f9;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
          display: inline-block;
        }

        .status-booked {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-completed {
          background: #dcfce7;
          color: #166534;
        }

        .status-cancelled {
          background: #fef2f2;
          color: #991b1b;
        }

        .status-no_show {
          background: #fef3c7;
          color: #92400e;
        }

        .compact-table {
          font-size: 13px;
        }

        .compact-table th {
          padding: 10px 12px;
          font-size: 11px;
        }

        .compact-table td {
          padding: 12px;
        }

        .doctor-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .doctor-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: 600;
        }

        .success-badge {
          background: #dcfce7;
          color: #166534;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Patient Management</h1>
        <div className="page-subtitle">View and manage registered patients and their appointments</div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            Loading patients...
          </div>
        ) : err ? (
          <div className="error-state">{err}</div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">No Patients Found</div>
            <div className="empty-subtitle">There are no registered patients in the system yet.</div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient Code</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined Date</th>
                    <th style={{ width: '140px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="patient-code" title={`DB ID: ${p.id}`}>
                          {p.patient_code || `PT${String(p.id ?? "").padStart(2, "0")}`}
                        </span>
                      </td>
                      <td>
                        <div className="patient-name">{p.name}</div>
                      </td>
                      <td>
                        <a href={`mailto:${p.email}`} className="patient-email">
                          {p.email}
                        </a>
                      </td>
                      <td>
                        <span className="join-date">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm" 
                          onClick={() => openAppointments(p)}
                          style={{ width: '100%' }}
                        >
                          <span>📅</span>
                          View Appointments
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button 
                className="btn" 
                disabled={page === 1} 
                onClick={() => setPage((v) => v - 1)}
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <button 
                className="btn" 
                disabled={page >= totalPages} 
                onClick={() => setPage((v) => v + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {apptOpen && (
        <div className="modal-overlay" onClick={closeAppointments}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Patient Appointments — {apptPatient?.name}
                </h2>
                <div className="modal-subtitle">
                  Patient Code: {apptPatient?.patient_code || `PT${String(apptPatient?.id ?? "").padStart(2, "0")}`}
                </div>
              </div>
              <button className="modal-close" onClick={closeAppointments}>
                ×
              </button>
            </div>

            {/* Appointments Section */}
            <div className="section-title">Appointment History</div>
            
            {apptLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                Loading appointments...
              </div>
            ) : appointments.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-icon">📊</div>
                <div className="empty-title">No Appointments Found</div>
                <div className="empty-subtitle">This patient has no appointment history.</div>
              </div>
            ) : (
              <>
                <StatusBars appointments={appointments} />
                <div className="table-container">
                  <table className="data-table compact-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Doctor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((a) => (
                        <tr key={a.id}>
                          <td>
                            {a.date
                              ? new Date(a.date).toLocaleDateString()
                              : a.starts_at
                              ? new Date(a.starts_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td>
                            <strong>
                              {toHHMM(a.time) || hhmmFromText(a.starts_at) || hhmmFromText(a.start_time) || "—"}
                            </strong>
                          </td>
                          <td>
                            <div className="doctor-info">
                              <div className="doctor-avatar">
                                {(a.doctor_name || 'DR').charAt(0)}
                              </div>
                              {a.doctor_name || a.doc_code || `Doctor #${a.doctor_id}`}
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge status-${(a.status || "booked").toLowerCase()}`}>
                              {a.status || "booked"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Waitlist Section */}
            <div className="section-title">Waitlist Entries</div>
            
            {waitLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                Loading waitlist...
              </div>
            ) : waitlist.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-icon">⏳</div>
                <div className="empty-title">No Waitlist Entries</div>
                <div className="empty-subtitle">This patient has no waitlist entries.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table compact-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Doctor</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Booked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map((w) => (
                      <tr key={w.id}>
                        <td>{w.date ? new Date(w.date).toLocaleDateString() : "—"}</td>
                        <td>
                          <strong>{w.time || hhmmFromText(w.start_time) || "—"}</strong>
                        </td>
                        <td>
                          <div className="doctor-info">
                            <div className="doctor-avatar">
                              {(w.doctor_name || 'DR').charAt(0)}
                            </div>
                            {w.doctor_name || w.doc_code || `Doctor #${w.doctor_id}`}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${w.status.toLowerCase()}`}>
                            {w.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {w.got_booked ? (
                            <span className="success-badge">✓ Booked</span>
                          ) : (
                            <span style={{ color: '#6b7280' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Email(v) {
  const s = v ? String(v) : "";
  return s ? <a href={`mailto:${s}`}>{s}</a> : "";
}

function hhmmFromText(t) {
  if (!t) return "";
  const m = String(t).match(/(\d{2}:\d{2})/);
  return m ? m[1] : "";
}

function toHHMM(t) {
  if (!t) return "";
  const s = String(t);
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
  return "";
}

function StatusBars({ appointments }) {
  const counts = appointments.reduce(
    (acc, a) => {
      const k = (a.status || "booked").toLowerCase();
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    { booked: 0, completed: 0, cancelled: 0, no_show: 0 }
  );
  const total =
    counts.booked + counts.completed + counts.cancelled + counts.no_show || 1;

  const statusColors = {
    booked: '#3b82f6',
    completed: '#10b981', 
    cancelled: '#ef4444',
    no_show: '#f59e0b'
  };

  const statusLabels = {
    booked: 'Booked',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show'
  };

  return (
    <div className="stats-grid">
      {Object.entries(counts).map(([key, value]) => {
        const percentage = Math.round((value / total) * 100);
        return (
          <div key={key} className="stat-card">
            <div className="stat-value" style={{ color: statusColors[key] }}>
              {value}
            </div>
            <div className="stat-label">{statusLabels[key]}</div>
            <div style={{ 
              marginTop: '8px', 
              height: '4px', 
              background: '#e2e8f0', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div 
                style={{ 
                  width: `${percentage}%`, 
                  height: '100%', 
                  background: statusColors[key],
                  transition: 'width 0.3s ease'
                }} 
              />
            </div>
            <div style={{ 
              fontSize: '11px', 
              color: '#64748b', 
              marginTop: '4px' 
            }}>
              {percentage}%
            </div>
          </div>
        );
      })}
    </div>
  );
}