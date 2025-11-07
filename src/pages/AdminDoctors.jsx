// pages/AdminDoctors.jsx
import axios from "axios";
import { useEffect, useMemo, useState, Fragment } from "react";
import { API_BASE } from "../config";
import { useNavigate } from "react-router-dom";

/* ---------------------- helpers (local date utils) ---------------------- */
function ymdLocal(y, mZeroBased, d) {
  const mm = String(mZeroBased + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
function todayLocal() {
  const t = new Date();
  return ymdLocal(t.getFullYear(), t.getMonth(), t.getDate());
}
function parseYMD(iso) {
  const [yy, mm] = (iso || "").split("-").map(Number);
  return { year: yy || new Date().getFullYear(), month: (mm ? mm - 1 : new Date().getMonth()) };
}

/* ---------------------- time slot helpers ---------------------- */
const SLOT_MINUTES = 30;
const DAY_START = "09:00";
const DAY_END = "17:00";

const pad2 = (n) => String(n).padStart(2, "0");
const toHHMM = (min) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
const parseHHMM = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};
/** ["09:00","09:30",...,"16:30"] */
function buildTimeGrid(startHHMM = DAY_START, endHHMM = DAY_END, stepMin = SLOT_MINUTES) {
  const start = parseHHMM(startHHMM);
  const end = parseHHMM(endHHMM);
  const out = [];
  for (let t = start; t <= end - stepMin; t += stepMin) out.push(toHHMM(t));
  return out;
}
// In your Admin doctor scheduling component (e.g., AdminDoctor.jsx)
function handleSave() {
  if (!selectedDays.length) {
    toast.warn("Please select at least one date before choosing times.");
    return;
  }
  if (!selectedTimes.length && !slotRange) {
    toast.warn("Please select at least one time or a time range.");
    return;
  }

  const body = {
  // whatever you already send:
  days: selectedDays,            // or month/weekdays
  times: selectedTimes,          // or slot_range
  replace,
  capacity,
  // add this line:
  commit: true
};

  api.put(`/api/admins/doctor/${doctorId}/slots`, body)
    .then(({data}) => toast.success(`Saved: ${data.inserted} added, ${data.deleted} removed on ${data.total_days} day(s).`))
    .catch((e) => toast.error(e?.response?.data?.message || "Save failed"));
}

/* ---------------------- axios client ---------------------- */
const api = axios.create({ baseURL: API_BASE, withCredentials: true });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ---------------------- extracted helpers/components ---------------------- */
function SmallPager({ currentPage, totalPages, setCurrentPage }) {
  return (
    <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
      <button className="btn btn-ghost" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
        ← Previous
      </button>
      <span style={{ margin: "0 16px", fontSize: "14px", color: "#6b7280" }}>
        Page {currentPage} of {totalPages}
      </span>
      <button className="btn btn-ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
        Next →
      </button>
    </div>
  );
}

function LogsPills({ logs }) {
  if (!logs?.length) return <div className="empty-state">No activity logs found</div>;
  return (
    <div className="logs-pills-container">
      {logs.map((l) => (
        <div key={l.id} className="log-pill">
          <span className="log-action">{l.action}</span>
          <span className="log-timestamp">{new Date(l.timestamp).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function GroupedRow({ row, isOpen, onToggle, full }) {
  return (
    <Fragment>
      <tr className="doctor-row">
        <td>
          <div className="doctor-info">
            <div className="avatar-small">{(row.doctor_name || "").split(" ").map(s => s[0]).slice(0,2).join("")}</div>
            <div>
              <div className="doctor-name">{row.doctor_name}</div>
            </div>
          </div>
        </td>
        <td><span className="action-badge">{row.action}</span></td>
        <td className="timestamp">{new Date(row.timestamp).toLocaleString()}</td>
        <td>
          <button className="btn btn-outline btn-sm" onClick={() => onToggle(row.doctor_id)}>
            {isOpen ? "▲ Hide Logs" : "▼ View All"}
          </button>
        </td>
      </tr>
      {isOpen && (
        <tr className="expanded-row">
          <td colSpan={4}>
            <div className="expanded-content">
              <LogsPills logs={full} />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

/** ==== MOVED OUTSIDE: DoctorActivityLogsCard ==== */
function DoctorActivityLogsCard({ approvedDoctors }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // data
  const [groupedRows, setGroupedRows] = useState([]);   // latest per doctor
  const [singleRows, setSingleRows] = useState([]);     // one doctor
  const [expanded, setExpanded] = useState({});
  const [doctorLogs, setDoctorLogs] = useState({});     // cache for expanded rows

  // fetchers
  const loadGrouped = async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "10",
        group_by: "doctor_latest",
      });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const { data } = await api.get(`/admins/activity-logs?${params.toString()}`);
      setGroupedRows(Array.isArray(data?.logs) ? data.logs : []);
      setTotalPages(Number(data?.totalPages || 1));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load logs");
      setGroupedRows([]); setTotalPages(1);
    } finally { setLoading(false); }
  };

  const loadSingle = async (doctorId) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "10",
        doctor: String(doctorId),
      });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const { data } = await api.get(`/admins/activity-logs?${params.toString()}`);
      setSingleRows(Array.isArray(data?.logs) ? data.logs : []);
      setTotalPages(Number(data?.totalPages || 1));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load logs");
      setSingleRows([]); setTotalPages(1);
    } finally { setLoading(false); }
  };

  const loadDoctorLogsOnDemand = async (doctorId) => {
    if (doctorLogs[doctorId]) return;
    try {
      const params = new URLSearchParams({ page: "1", limit: "50", doctor: String(doctorId) });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const { data } = await api.get(`/admins/activity-logs?${params.toString()}`);
      setDoctorLogs((m) => ({ ...m, [doctorId]: data?.logs || [] }));
    } catch {
      setDoctorLogs((m) => ({ ...m, [doctorId]: [] }));
    }
  };

  useEffect(() => {
    setExpanded({});
    if (selectedDoctor === "all") loadGrouped();
    else loadSingle(selectedDoctor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, fromDate, toDate, selectedDoctor]);

  const toggleExpand = async (docId) => {
    setExpanded((m) => ({ ...m, [docId]: !m[docId] }));
    await loadDoctorLogsOnDemand(docId);
  };

  const handleDownload = () => {
    const rows = selectedDoctor === "all" ? groupedRows : singleRows;
    if (!rows?.length) return;

    const csv = [
      ["Doctor", "Action", "Timestamp"],
      ...rows.map((l) => [
        (l.doctor_name || "").replace(/,/g, " "),
        (l.action || "").replace(/,/g, " "),
        new Date(l.timestamp).toISOString(),
      ]),
    ].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `doctor-activity-logs_${selectedDoctor}.csv`;
    a.click();
  };

  return (
    <div className="card activity-logs-card">
      <div className="card-header">
        <h3>Doctor Activity Logs</h3>
        <div className="card-subtitle">Track doctor actions and system interactions</div>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <div className="filter-group">
          <label className="filter-label">From Date</label>
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => { setCurrentPage(1); setFromDate(e.target.value); }}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">To Date</label>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => { setCurrentPage(1); setToDate(e.target.value); }}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Doctor</label>
          <select
            value={selectedDoctor}
            onChange={(e) => { setCurrentPage(1); setSelectedDoctor(e.target.value); }}
            className="filter-select"
          >
            <option value="all">All Doctors</option>
            {approvedDoctors.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.name}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary download-btn" onClick={handleDownload}>
          <span className="btn-icon">📥</span>
          Export CSV
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          Loading activity logs...
        </div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : selectedDoctor !== "all" ? (
        !singleRows.length ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            No activity logs for this selection
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Action</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {singleRows.map((l) => (
                    <tr key={l.id} className="data-row">
                      <td>
                        <div className="doctor-info">
                          <div className="avatar-small">{(l.doctor_name || "").split(" ").map(s => s[0]).slice(0,2).join("")}</div>
                          <span>{l.doctor_name}</span>
                        </div>
                      </td>
                      <td><span className="action-badge">{l.action}</span></td>
                      <td className="timestamp">{new Date(l.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SmallPager currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
          </>
        )
      ) : !groupedRows.length ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          No activity logs for this selection
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table grouped-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Recent Action</th>
                  <th>Timestamp</th>
                  <th style={{ width: "140px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((row) => (
                  <GroupedRow
                    key={row.doctor_id}
                    row={row}
                    isOpen={!!expanded[row.doctor_id]}
                    onToggle={toggleExpand}
                    full={doctorLogs[row.doctor_id] || []}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <SmallPager currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
        </>
      )}
    </div>
  );
}

/* ----------------------------- MAIN PAGE ----------------------------- */
export default function AdminDoctors() {
  const navigate = useNavigate();

  // 🔐 Redirect to admin login if there's no admin token
  useEffect(() => {
    const t = localStorage.getItem("adminToken");
    if (!t) navigate("/admin/login", { replace: true });
  }, [navigate]);

  if (!localStorage.getItem("adminToken")) return null;

  const [unapprovedDoctors, setUnapprovedDoctors] = useState([]);
  const [approvedDoctors, setApprovedDoctors] = useState([]);
  const [approvedAll, setApprovedAll] = useState([]);
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Modal / calendar state
  const [datesModalOpen, setDatesModalOpen] = useState(false);
  const [datesModalDoctor, setDatesModalDoctor] = useState(null);
  const [datesSet, setDatesSet] = useState(new Set());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // times editor
  const [activeDay, setActiveDay] = useState(null);
  const [timeSetByDay, setTimeSetByDay] = useState({});

  // View-slots modal (read-only)
  const [slotsModalOpen, setSlotsModalOpen] = useState(false);
  const [slotsModalDoctor, setSlotsModalDoctor] = useState(null);
  const [slotsModalDays, setSlotsModalDays] = useState([]);
  const [slotsModalDay, setSlotsModalDay] = useState("");
  const [slotsRows, setSlotsRows] = useState([]);

  // banner / toast
  const [banner, setBanner] = useState("");
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(""), 2200);
    return () => clearTimeout(t);
  }, [banner]);
  function note(msg) { setBanner(msg); }

  const timeGrid = useMemo(() => buildTimeGrid(DAY_START, DAY_END, SLOT_MINUTES), []);

  /* ---------- endpoints ---------- */
  const endpoints = useMemo(
    () => ({
      unapproved: "/admins/unapproved-doctors",
      approved: "/admins/approved-doctors",
      approve: (id) => `/admins/approve-doctor/${id}`,
      datesGet: (id) => `/admins/doctor/${id}/slot-days`,
      datesPut:   null,
      slotsGet: (id) => `/admins/doctor/${id}/slots`,
      slotsPut: (id) => `/admins/doctor/${id}/slots`,
      slotDays: (id) => `/admins/doctor/${id}/slot-days`,
    }),
    []
  );

  /* ---------- data fetch ---------- */
  useEffect(() => { refreshLists(); }, []); // eslint-disable-line

  const refreshLists = async () => {
    setLoading(true);
    setError("");
    try {
      const [unap, ap] = await Promise.all([api.get(endpoints.unapproved), api.get(endpoints.approved)]);
      const unapRows = Array.isArray(unap.data) ? unap.data : [];
      const apRows = Array.isArray(ap.data) ? ap.data : [];
      setUnapprovedDoctors(unapRows);
      setApprovedAll(apRows);
      if (query) {
        setApprovedDoctors(
          apRows.filter((p) =>
            `${p.name||""} ${p.email||""} ${p.specialization||""}`.toLowerCase().includes(query)
          )
        );
      } else {
        setApprovedDoctors(apRows);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load doctor lists. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doctorId) => {
    setApprovingId(doctorId);
    setError("");
    try {
      await api.put(endpoints.approve(doctorId));
      await refreshLists();
    } catch (err) {
      console.error(err);
      setError("Could not approve doctor. Please try again.");
    } finally {
      setApprovingId(null);
    }
  };

  /* ---------- modal open/close ---------- */
  const manageDatesForDoctor = async (doc) => {
    const todayISO = todayLocal();
    try {
      const { data } = await api.get(endpoints.slotDays(doc.id));
      const future = (Array.isArray(data) ? data : [])
        .map(String)
        .map(d => d.slice(0,10))
        .filter((d) => d >= todayISO);
      setDatesSet(new Set(future));

      const baseISO = future[0] || todayISO;
      const { year, month } = parseYMD(baseISO);
      setViewYear(year);
      setViewMonth(month);

      setActiveDay(baseISO);
      await loadSlotsFor(doc.id, baseISO);
    } catch {
      const t = new Date();
      setDatesSet(new Set());
      setViewYear(t.getFullYear());
      setViewMonth(t.getMonth());
      setActiveDay(todayISO);
      setTimeSetByDay(prev => ({ ...prev, [todayISO]: (prev[todayISO] || new Set()) }));
      if (doc?.id) await loadSlotsFor(doc.id, todayISO);
    }
    setDatesModalDoctor(doc);
    setDatesModalOpen(true);
  };

  const closeDatesModal = () => {
    setDatesModalOpen(false);
    setDatesModalDoctor(null);
    setDatesSet(new Set());
    setActiveDay(null);
    setTimeSetByDay({});
    setBanner("");
  };

  /* ---------- slots (editor) ---------- */
  async function loadSlotsFor(doctorId, isoDay) {
    if (!doctorId || !isoDay) return;
    try {
      const { data } = await api.get(endpoints.slotsGet(doctorId), {
        params: { day: isoDay, _: Date.now() },
      });

      const arr =
        Array.isArray(data?.rows) ? data.rows :
        Array.isArray(data)       ? data      : [];

      const hhmm = arr
        .map((r) => {
          const v = r?.start_time ?? r?.start ?? r?.time ?? r;
          const s = String(v || "");
          return /^\d{2}:\d{2}/.test(s) ? s.slice(0, 5) : null;
        })
        .filter(Boolean);

      setTimeSetByDay((prev) => ({ ...prev, [isoDay]: new Set(hhmm) }));
    } catch {
      setTimeSetByDay((prev) => ({ ...prev, [isoDay]: new Set() }));
    }
  }

  /* ---------- save (editor) ---------- */
const saveDatesForDoctor = async () => {
  if (!datesModalDoctor) return;

  const todayISO = todayLocal();
  const days = Array.from(datesSet).filter((d) => d >= todayISO).sort();
  if (!days.length) { alert("Select at least one date."); return; }
  if (!activeDay)   { alert("Pick a date first."); return; }

  // Build per-day entries and KEEP ONLY those that have times
  const payloads = days.map((iso) => ({
    day: iso,
    times: Array.from((timeSetByDay[iso] ?? new Set())).sort(),
  })).filter((e) => e.times.length > 0);

  if (!payloads.length) {
    alert("Select at least one time for at least one selected date.");
    return;
  }

  try {
    setSaving(true);
    await Promise.all(
      payloads.map((p) =>
        api.put(endpoints.slotsPut(datesModalDoctor.id), {
          day: p.day,
          times: p.times,
          capacity: 1,
          replace: true, // remove unselected, unbooked slots
          commit: true   // ✅ required by backend
        })
      )
    );
    alert("Saved successfully");
    closeDatesModal();
    refreshLists();
  } catch (e) {
    console.error(e);
    alert(e?.response?.data?.message || "Failed to save dates/slots");
  } finally {
    setSaving(false);
  }
};


  /* ---------- calendar click (editor) ---------- */
  const onCalendarToggle = async (iso) => {
    const todayISO = todayLocal();
    if (iso < todayISO) return;

    setDatesSet((prev) => {
      const n = new Set(prev);
      if (n.has(iso)) {
        n.delete(iso);
        setTimeSetByDay((prevSlots) => {
          const copy = { ...prevSlots };
          delete copy[iso];
          return copy;
        });
      } else {
        n.add(iso);
        setTimeSetByDay((prev) => ({ ...prev, [iso]: (prev[iso] || new Set()) }));
      }
      return n;
    });

    setActiveDay(iso);
    if (datesModalDoctor?.id) await loadSlotsFor(datesModalDoctor.id, iso);
  };

  function toggleTime(isoDay, hhmm) {
    if (!isoDay) return;
    setTimeSetByDay((prev) => {
      const next = { ...prev };
      const set = new Set(next[isoDay] || []);
      if (set.has(hhmm)) set.delete(hhmm);
      else set.add(hhmm);
      next[isoDay] = set;
      return next;
    });
  }

  function toggleTimeWithGuard(day, hhmm) {
    toggleTime(day, hhmm);
  }

  /* ---------- view-slots modal (read-only table) ---------- */
  async function openSlotsModal(doctor) {
    setSlotsModalOpen(true);
    setSlotsModalDoctor(doctor);
    setSlotsRows([]);
    setSlotsModalDays([]);
    setSlotsModalDay("");

    try {
      const { data } = await api.get(endpoints.slotDays(doctor.id), { params: { _: Date.now() }});
      const days = (Array.isArray(data) ? data : [])
        .map(d => String(d).slice(0,10))
        .filter(Boolean)
        .sort();
      setSlotsModalDays(days);
      const first = days[0] || "";
      setSlotsModalDay(first);
      if (first) await loadSlotsTable(doctor.id, first, doctor.name);
    } catch (e) {
      console.error("openSlotsModal:", e);
      alert(e?.response?.data?.message || "Failed to load slot days for this doctor.");
    }
  }
  async function loadSlotsTable(doctorId, isoDay, doctorName = "") {
    try {
      const { data } = await api.get(endpoints.slotsGet(doctorId), {
        params: { day: isoDay, _: Date.now() },
      });
      const arr = Array.isArray(data) ? data : [];
      const rows = arr.map((r) => ({
        doctor_id: Number(r?.doctor_id ?? doctorId) || doctorId,
        doctor_name: doctorName || "",
        day: String(r?.day || isoDay).slice(0, 10),
        start_time: String(r?.start_time || r?.start || "").slice(0, 5) || "-",
      }));
      setSlotsRows(rows);
    } catch (e) {
      console.error("loadSlotsTable:", e);
      setSlotsRows([]);
      alert(e?.response?.data?.message || "Failed to load slots for the selected day.");
    }
  }

  function closeSlotsModal() {
    setSlotsModalOpen(false);
    setSlotsModalDoctor(null);
    setSlotsModalDays([]);
    setSlotsModalDay("");
    setSlotsRows([]);
  }

  /* ----------------------------- UI ----------------------------- */
  return (
    <main className="admin-doctors-wrap">
      <style>{`
        :root {
          --primary: #2563eb;
          --primary-dark: #1d4ed8;
          --secondary: #64748b;
          --success: #10b981;
          --warning: #f59e0b;
          --error: #ef4444;
          --background: #f8fafc;
          --surface: #ffffff;
          --border: #e2e8f0;
          --text: #1e293b;
          --text-light: #64748b;
          --radius: 12px;
          --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .admin-doctors-wrap {
          padding: 24px;
          background: var(--background);
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: var(--text);
        }

        .page-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .page-subtitle {
          color: var(--text-light);
          font-size: 16px;
          margin-top: 4px;
        }

        .card {
          background: var(--surface);
          border-radius: var(--radius);
          padding: 24px;
          box-shadow: var(--shadow);
          border: 1px solid var(--border);
          margin-bottom: 20px;
        }

        .card-header {
          margin-bottom: 20px;
        }

        .card-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 4px 0;
        }

        .card-subtitle {
          color: var(--text-light);
          font-size: 14px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: var(--surface);
          padding: 20px;
          border-radius: var(--radius);
          border-left: 4px solid var(--primary);
          box-shadow: var(--shadow);
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }

        .stat-label {
          color: var(--text-light);
          font-size: 14px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid transparent;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .btn-primary {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .btn-primary:hover {
          background: var(--primary-dark);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #f1f5f9;
          color: var(--text);
          border-color: var(--border);
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .btn-outline {
          background: transparent;
          border-color: var(--border);
          color: var(--text);
        }

        .btn-outline:hover {
          background: #f8fafc;
          border-color: var(--primary);
        }

        .btn-ghost {
          background: transparent;
          border-color: transparent;
          color: var(--text);
        }

        .btn-ghost:hover {
          background: #f1f5f9;
        }

        .btn-sm {
          padding: 8px 12px;
          font-size: 13px;
        }

        .btn-icon {
          font-size: 16px;
        }

        .search-box {
          padding: 12px 16px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          width: 100%;
          max-width: 300px;
          background: var(--surface);
        }

        .search-box:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .data-table th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: var(--text-light);
          border-bottom: 1px solid var(--border);
        }

        .data-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }

        .data-row:hover {
          background: #f8fafc;
        }

        .doctor-row {
          background: var(--surface);
        }

        .expanded-row {
          background: #f8fafc;
        }

        .expanded-content {
          padding: 16px;
          background: white;
          border-radius: 8px;
          margin: 8px 0;
          border: 1px solid var(--border);
        }

        .doctor-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 12px;
        }

        .doctor-name {
          font-weight: 600;
          color: var(--text);
        }

        .doctor-email {
          font-size: 12px;
          color: var(--text-light);
        }

        .specialization-badge {
          background: #dbeafe;
          color: var(--primary);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .action-badge {
          background: #ecfdf5;
          color: #047857;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .timestamp {
          color: var(--text-light);
          font-size: 13px;
        }

        .filters-row {
          display: flex;
          gap: 16px;
          align-items: end;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-light);
        }

        .filter-input, .filter-select {
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          background: var(--surface);
        }

        .filter-input:focus, .filter-select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .download-btn {
          margin-left: auto;
        }

        .table-container {
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }

        .loading-state {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 40px;
          justify-content: center;
          color: var(--text-light);
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top: 2px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-light);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        .error-state {
          background: #fef2f2;
          color: var(--error);
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #fecaca;
        }

        .logs-pills-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .log-pill {
          display: flex;
          justify-content: between;
          align-items: center;
          padding: 12px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .log-action {
          font-weight: 500;
          color: var(--text);
        }

        .log-timestamp {
          color: var(--text-light);
          font-size: 12px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .main-grid {
            grid-template-columns: 1fr;
          }
        }

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .action-card {
          background: var(--surface);
          padding: 20px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
        }

        .action-card h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .action-card p {
          margin: 0;
          color: var(--text-light);
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
          border-radius: var(--radius);
          padding: 24px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-light);
          padding: 4px;
        }

        .modal-close:hover {
          color: var(--text);
        }

        .calendar-container {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 24px;
        }

        .time-slots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 8px;
          margin-top: 16px;
        }

        .time-slot {
          padding: 8px;
          border: 1px solid var(--border);
          border-radius: 6px;
          text-align: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .time-slot.selected {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .time-slot:hover {
          border-color: var(--primary);
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Doctor Management</h1>
          <div className="page-subtitle">Manage doctor approvals, schedules, and activity logs</div>
        </div>
        <button className="btn btn-secondary" onClick={refreshLists}>
          <span className="btn-icon">🔄</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-state" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{unapprovedDoctors.length}</div>
          <div className="stat-label">Pending Approvals</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{approvedDoctors.length}</div>
          <div className="stat-label">Approved Doctors</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{approvedAll.length}</div>
          <div className="stat-label">Total Doctors</div>
        </div>
      </div>

      <div className="main-grid">
        {/* Left column: Pending approvals + approved list */}
        <div>
          {/* Pending Approvals Card */}
          <div className="card">
            <div className="card-header">
              <h3>Pending Approvals</h3>
              <div className="card-subtitle">Doctors awaiting admin approval to join the platform</div>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                Loading pending approvals...
              </div>
            ) : !unapprovedDoctors?.length ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                No pending approvals
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Specialization</th>
                      <th style={{ width: '140px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unapprovedDoctors.map((d) => (
                      <tr key={d.id} className="data-row">
                        <td>
                          <div className="doctor-info">
                            <div className="avatar">
                              {(d.name || "").split(" ").map(s => s[0]).slice(0,2).join("")}
                            </div>
                            <div>
                              <div className="doctor-name">{d.name}</div>
                              <div className="doctor-email">{d.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="specialization-badge">{d.specialization}</span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${approvingId === d.id ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleApprove(d.id)}
                            disabled={approvingId === d.id}
                            style={{ width: '100%' }}
                          >
                            {approvingId === d.id ? (
                              <>
                                <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                                Approving...
                              </>
                            ) : (
                              'Approve Doctor'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Approved Doctors Card */}
          <div className="card">
            <div className="card-header">
              <h3>Approved Doctors</h3>
              <div className="card-subtitle">Doctors with active schedules and patient appointments</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <input
                className="search-box"
                placeholder="Search doctors by name, email, or specialization..."
                value={query}
                onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  setQuery(q);
                  if (!q) setApprovedDoctors(approvedAll);
                  else {
                    setApprovedDoctors(
                      approvedAll.filter((p) =>
                        `${p.name||""} ${p.email||""} ${p.specialization||""}`.toLowerCase().includes(q)
                      )
                    );
                  }
                }}
              />
              <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                {approvedDoctors.length} doctors found
              </div>
            </div>

            {approvedDoctors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👨‍⚕️</div>
                No approved doctors found
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Specialization</th>
                      <th style={{ width: '200px' }}>Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedDoctors.map((doctor) => (
                      <tr key={doctor.id} className="data-row">
                        <td>
                          <div className="doctor-info">
                            <div className="avatar">
                              {(doctor.name || "").split(" ").map(s => s[0]).slice(0,2).join("")}
                            </div>
                            <div>
                              <div className="doctor-name">{doctor.name}</div>
                              <div className="doctor-email">{doctor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="specialization-badge">{doctor.specialization}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-outline btn-sm" 
                              onClick={() => manageDatesForDoctor(doctor)}
                            >
                              📅 Schedule
                            </button>
                            <button 
                              className="btn btn-outline btn-sm" 
                              onClick={() => openSlotsModal(doctor)}
                            >
                              👁️ View Slots
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: quick info / activity logs */}
        <aside>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h3>Quick Actions</h3>
            </div>
            <div className="quick-actions">
              <button className="btn btn-secondary" onClick={refreshLists}>
                🔄 Refresh All Data
              </button>
              <button className="btn btn-outline" onClick={() => { alert("Export not implemented yet"); }}>
                📊 Export Doctors CSV
              </button>
            </div>
          </div>

          {/* Activity logs card */}
          <DoctorActivityLogsCard approvedDoctors={approvedDoctors} />
        </aside>
      </div>

      {/* Manage Dates Modal */}
      {datesModalOpen && datesModalDoctor && (
        <div className="modal-overlay" onClick={closeDatesModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Manage Schedule — Dr. {datesModalDoctor.name}
              </h2>
              <button className="modal-close" onClick={closeDatesModal}>×</button>
            </div>

            <div className="calendar-container">
              {/* Calendar */}
              <div>
                <AdminCalendar
                  year={viewYear}
                  month={viewMonth}
                  minISO={todayLocal()}
                  onPrev={() => {
                    const d = new Date(viewYear, viewMonth, 1);
                    d.setMonth(d.getMonth() - 1);
                    setViewYear(d.getFullYear());
                    setViewMonth(d.getMonth());
                  }}
                  onNext={() => {
                    const d = new Date(viewYear, viewMonth, 1);
                    d.setMonth(d.getMonth() + 1);
                    setViewYear(d.getFullYear());
                    setViewMonth(d.getMonth());
                  }}
                  selected={datesSet}
                  onToggle={onCalendarToggle}
                />
              </div>

              {/* Time Slots */}
              <div>
                <h3 style={{ marginBottom: '16px' }}>
                  {activeDay ? `Time slots for ${activeDay}` : "Select a date to manage time slots"}
                </h3>

                {activeDay ? (
                  <>
                    {!((timeSetByDay[activeDay] || new Set()).size) && (
                      <div className="empty-state" style={{ padding: '20px', marginBottom: '16px' }}>
                        No time slots assigned for <strong>{activeDay}</strong>. Click time slots below to add availability.
                      </div>
                    )}

                    {banner && (
                      <div style={{
                        padding: '12px',
                        background: '#fffbeb',
                        border: '1px solid #fcd34d',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        color: '#92400e'
                      }}>
                        {banner}
                      </div>
                    )}

                    <div className="time-slots-grid">
                      {timeGrid.map((hhmm) => {
                        const selectedForDay = timeSetByDay[activeDay] || new Set();
                        const isOn = selectedForDay.has(hhmm);
                        return (
                          <div
                            key={hhmm}
                            className={`time-slot ${isOn ? 'selected' : ''}`}
                            onClick={() => toggleTimeWithGuard(activeDay, hhmm)}
                            title={isOn ? "Click to remove" : "Click to add"}
                          >
                            {hhmm}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: '16px' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={async () => {
                          if (!confirm(`Clear ALL time slots for ${activeDay}?`)) return;
                          try {
                            await api.put(endpoints.slotsPut(datesModalDoctor.id), {
                              day: activeDay,
                              times: [],
                              capacity: 1
                            });
                            setTimeSetByDay(prev => {
                              const n = { ...prev };
                              delete n[activeDay];
                              return n;
                            });
                            setDatesSet(prev => {
                              const copy = new Set(prev);
                              copy.delete(activeDay);
                              return copy;
                            });
                            note(`✔ Cleared ${activeDay}`);
                          } catch (e) {
                            console.error(e);
                            alert(e?.response?.data?.message || "Failed to clear day");
                          }
                        }}
                      >
                        🗑️ Clear This Day
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    Select a date from the calendar to manage time slots
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-ghost" onClick={closeDatesModal}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={saveDatesForDoctor} 
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                    Saving...
                  </>
                ) : (
                  'Save Schedule'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Slots Modal */}
      {slotsModalOpen && slotsModalDoctor && (
        <div className="modal-overlay" onClick={closeSlotsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Available Slots — Dr. {slotsModalDoctor.name}
              </h2>
              <button className="modal-close" onClick={closeSlotsModal}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
              <label style={{ fontWeight: '500' }}>Select Date:</label>
              <select
                value={slotsModalDay}
                onChange={async (e) => {
                  const v = e.target.value;
                  setSlotsModalDay(v);
                  if (v) await loadSlotsTable(slotsModalDoctor.id, v, slotsModalDoctor.name);
                  else setSlotsRows([]);
                }}
                className="filter-select"
                style={{ minWidth: '200px' }}
              >
                {slotsModalDays.length === 0 ? (
                  <option value="">No available dates</option>
                ) : (
                  slotsModalDays.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))
                )}
              </select>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor ID</th>
                    <th>Doctor Name</th>
                    <th>Date</th>
                    <th>Start Time</th>
                  </tr>
                </thead>
                <tbody>
                  {slotsRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
                        No slots available for this date
                      </td>
                    </tr>
                  ) : (
                    slotsRows.map((r, idx) => (
                      <tr key={idx} className="data-row">
                        <td>{r.doctor_id}</td>
                        <td>{r.doctor_name}</td>
                        <td>{r.day || "-"}</td>
                        <td>
                          <span className="specialization-badge" style={{ background: '#ecfdf5', color: '#047857' }}>
                            {r.start_time || "-"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={closeSlotsModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- Calendar + Modal ---------- */

function AdminCalendar({ year, month, onPrev, onNext, selected, onToggle, minISO }) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const header = `${first.toLocaleString(undefined, { month: "long" })} ${year}`;

  const grid = [];
  for (let i = 0; i < startDay; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);

  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '12px', 
      padding: '16px',
      border: '1px solid var(--border)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '16px' 
      }}>
        <button className="btn btn-ghost btn-sm" onClick={onPrev}>‹ Previous</button>
        <strong style={{ fontSize: '16px', fontWeight: '600' }}>{header}</strong>
        <button className="btn btn-ghost btn-sm" onClick={onNext}>Next ›</button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '4px', 
        marginBottom: '8px',
        color: 'var(--text-light)',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} style={{ textAlign: 'center', padding: '8px' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {grid.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const iso = ymdLocal(year, month, d);
          const disabled = minISO && iso < minISO;
          const isSelected = !disabled && selected?.has?.(iso);
          return (
            <div
              key={iso}
              style={{
                padding: '12px 8px',
                textAlign: 'center',
                borderRadius: '8px',
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: disabled ? '#f8fafc' : isSelected ? '#dbeafe' : 'white',
                color: disabled ? '#cbd5e1' : isSelected ? 'var(--primary)' : 'var(--text)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '14px',
              }}
              onClick={() => !disabled && onToggle(iso)}
              title={disabled ? "Past date" : isSelected ? "Deselect date" : "Select date"}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}