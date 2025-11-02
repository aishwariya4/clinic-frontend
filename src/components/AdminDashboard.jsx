// src/pages/AdminDashboard.jsx
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, APP } from "../config";

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("adminToken");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

/* ---------------------- Local date & slot helpers ---------------------- */
function isoLocal(y, mZeroBased, d) {
  const mm = String(mZeroBased + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
function todayIsoLocal() {
  const t = new Date();
  return isoLocal(t.getFullYear(), t.getMonth(), t.getDate());
}

const SLOT_MINUTES = 30;
const DAY_START = "09:00";
const DAY_END = "17:00";

const pad2 = (n) => String(n).padStart(2, "0");
const toHHMM = (min) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
const parseHHMM = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};
/** returns ["09:00","09:30",...,"16:30"] */
function buildTimeGrid(startHHMM = DAY_START, endHHMM = DAY_END, stepMin = SLOT_MINUTES) {
  const start = parseHHMM(startHHMM);
  const end = parseHHMM(endHHMM);
  const out = [];
  for (let t = start; t <= end - stepMin; t += stepMin) out.push(toHHMM(t));
  return out;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const adminToken = localStorage.getItem("adminToken");

  useEffect(() => {
    if (!adminToken) navigate("/admin/login", { replace: true });
  }, [adminToken, navigate]);

  // session (display only)
  const admin = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("adminUser") || "{}"); }
    catch { return {}; }
  }, []);

  // state
  const [stats, setStats] = useState({ totalDoctors: 0, approvedDoctors: 0, pendingApprovals: 0, totalPatients: 0 });
  const [unapprovedDoctors, setUnapprovedDoctors] = useState([]);
  const [approvedDoctors, setApprovedDoctors] = useState([]);

  // activity (kept as-is; UI not shown here)
  const [groupedRows, setGroupedRows] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [doctorLogs, setDoctorLogs] = useState({});
  const [singleDoctorRows, setSingleDoctorRows] = useState([]);

  // filters & pagination (for logs)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("all");

  // flags/errors
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errors, setErrors] = useState({ stats: "", doctors: "", logs: "" });
  const [lastUpdated, setLastUpdated] = useState(null);

  // toast/banner
  const [banner, setBanner] = useState("");
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(""), 2200);
    return () => clearTimeout(t);
  }, [banner]);
  function note(msg) { setBanner(msg); }

  // modal (dates/slots) — logic kept for future use
  const [datesModalOpen, setDatesModalOpen] = useState(false);
  const [datesModalDoctor, setDatesModalDoctor] = useState(null);
  const [datesSet, setDatesSet] = useState(new Set());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [activeDay, setActiveDay] = useState("");               // "YYYY-MM-DD"
  const [selectedTimes, setSelectedTimes] = useState(new Set()); // Set("HH:MM")

  // Doctor Requests
  const [reqs, setReqs] = useState([]);
  const [reqsLoading, setReqsLoading] = useState(false);
  const [reqsErr, setReqsErr] = useState("");
  const [reqStatusFilter, setReqStatusFilter] = useState("pending"); // pending|approved|rejected|all
  const [reqDoctorFilter, setReqDoctorFilter] = useState("all");
  const [decision, setDecision] = useState({
    open: false,
    id: null,
    action: "approve", // approve | reject
    note: "",
    busy: false,
    error: "",
  });

  // AbortControllers
  const ctlStats = useRef();
  const ctlDoctors = useRef();
  const ctlLogs = useRef();

  // 09:00–17:00 grid, 30-min steps (ends at 16:30)
  const SLOT_GRID = useMemo(() => buildTimeGrid(DAY_START, DAY_END, SLOT_MINUTES), []);

  /* --------------------------- API --------------------------- */
  const fetchDashboardStats = async () => {
    ctlStats.current?.abort();
    ctlStats.current = new AbortController();
    setLoadingStats(true);
    setErrors((e) => ({ ...e, stats: "" }));
    try {
      const { data } = await api.get("/admins/dashboard-stats", { signal: ctlStats.current.signal });
      setStats({
        totalDoctors: data?.totalDoctors ?? 0,
        approvedDoctors: data?.approvedDoctors ?? 0,
        pendingApprovals: data?.pendingApprovals ?? 0,
        totalPatients: data?.totalPatients ?? 0,
      });
    } catch (e) {
      if (e.code !== "ERR_CANCELED")
        setErrors((err) => ({ ...err, stats: e?.response?.data?.message || "Failed to load stats" }));
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchDoctors = async () => {
    ctlDoctors.current?.abort();
    ctlDoctors.current = new AbortController();
    setLoadingDoctors(true);
    setErrors((e) => ({ ...e, doctors: "" }));
    try {
      const [unapprovedRes, approvedRes] = await Promise.all([
        api.get("/admins/unapproved-doctors", { signal: ctlDoctors.current.signal }),
        api.get("/admins/approved-doctors", { signal: ctlDoctors.current.signal }),
      ]);
      setUnapprovedDoctors(Array.isArray(unapprovedRes.data) ? unapprovedRes.data : []);
      setApprovedDoctors(Array.isArray(approvedRes.data) ? approvedRes.data : []);
    } catch (e) {
      if (e.code !== "ERR_CANCELED")
        setErrors((err) => ({ ...err, doctors: e?.response?.data?.message || "Failed to load doctors" }));
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Logs (kept intact)
  const loadGroupedLogs = async () => {
    ctlLogs.current?.abort();
    ctlLogs.current = new AbortController();
    setLoadingLogs(true);
    setErrors((e) => ({ ...e, logs: "" }));
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: "10", group_by: "doctor_latest" });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const { data } = await api.get(`/admins/activity-logs?${params.toString()}`, { signal: ctlLogs.current.signal });
      setGroupedRows(data?.logs || []);
      setTotalPages(data?.totalPages || 1);
    } catch (e) {
      if (e.code !== "ERR_CANCELED")
        setErrors((err) => ({ ...err, logs: e?.response?.data?.message || "Failed to load logs" }));
      setGroupedRows([]); setTotalPages(1);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadSingleDoctorLogs = async (docId) => {
    ctlLogs.current?.abort();
    ctlLogs.current = new AbortController();
    setLoadingLogs(true);
    setErrors((e) => ({ ...e, logs: "" }));
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: "10", doctor: String(docId) });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const { data } = await api.get(`/admins/activity-logs?${params.toString()}`, { signal: ctlLogs.current.signal });
      setSingleDoctorRows(data?.logs || []);
      setTotalPages(data?.totalPages || 1);
    } catch (e) {
      if (e.code !== "ERR_CANCELED")
        setErrors((err) => ({ ...err, logs: e?.response?.data?.message || "Failed to load logs" }));
      setSingleDoctorRows([]); setTotalPages(1);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadDoctorLogsOnDemand = async (docId) => {
    if (doctorLogs[docId]) return;
    try {
      const params = new URLSearchParams({ page: "1", limit: "50", doctor: String(docId) });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const { data } = await api.get(`/admins/activity-logs?${params.toString()}`);
      setDoctorLogs((m) => ({ ...m, [docId]: data?.logs || [] }));
    } catch {
      setDoctorLogs((m) => ({ ...m, [docId]: [] }));
    }
  };

  const approveDoctor = async (id) => {
    try {
      await api.put(`/admins/approve-doctor/${id}`);
      await Promise.all([fetchDoctors(), fetchDashboardStats()]);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to approve doctor");
    }
  };

  const initialLoad = async () => {
    await Promise.all([fetchDashboardStats(), fetchDoctors()]);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    initialLoad();
    return () => {
      ctlStats.current?.abort();
      ctlDoctors.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setExpanded({});
    if (selectedDoctor === "all") loadGroupedLogs();
    else loadSingleDoctorLogs(selectedDoctor);
    return () => ctlLogs.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, fromDate, toDate, selectedDoctor]);

  const refreshAll = async () => {
    await initialLoad();
    if (selectedDoctor === "all") await loadGroupedLogs();
    else await loadSingleDoctorLogs(selectedDoctor);
    await fetchDoctorRequests(); // also refresh requests
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login", { replace: true });
  };

  const handleDownloadLogs = async () => {
    const rows = selectedDoctor === "all" ? groupedRows : singleDoctorRows;
    if (!rows?.length) return alert("No logs available for this page/filters.");

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
    a.download = `doctor_logs_${selectedDoctor !== "all" ? selectedDoctor : "all"}_page-${currentPage}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  /* ---------- Dates & Slots (kept for future UI) ---------- */
  const todayISO = todayIsoLocal();

  const manageDatesForDoctor = async (doc) => {
    try {
      const { data } = await api.get(`/admins/doctor/${doc.id}/slot-days`, { params: { include_past: true } });
      const arr = Array.isArray(data) ? data : [];
      setDatesSet(new Set(arr));

      const future = arr.filter(d => d >= todayISO);
      const chosen = arr.includes(todayISO) ? todayISO : (future[0] || arr[arr.length - 1] || todayISO);
      const d = new Date(chosen);
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
      setActiveDay(chosen);
      await loadSlotsFor(doc.id, chosen);
    } catch {
      setDatesSet(new Set());
      const t = new Date();
      setViewYear(t.getFullYear()); setViewMonth(t.getMonth());
      setActiveDay(todayISO);
      if (doc?.id) await loadSlotsFor(doc.id, todayISO);
    }
    setDatesModalDoctor(doc);
    setDatesModalOpen(true);
  };

  const closeDatesModal = () => {
    setDatesModalOpen(false);
    setDatesModalDoctor(null);
    setDatesSet(new Set());
    setActiveDay("");
    setSelectedTimes(new Set());
  };

  const [bookedTimes, setBookedTimes] = useState(new Set());
  const loadSlotsFor = async (doctorId, isoDay) => {
    if (!doctorId || !isoDay) return [];
    try {
      const { data } = await api.get(`/admins/doctor/${doctorId}/slots`, { params: { day: isoDay } });
      const arr = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
      const hhmm = arr
        .map((r) => {
          const val = typeof r === "string" ? r : (r?.start_time ?? r?.start);
          const s = String(val || "");
          return /^\d{2}:\d{2}/.test(s) ? s.slice(0, 5) : null;
        })
        .filter(Boolean);
      setSelectedTimes(new Set(hhmm));
      setBookedTimes(new Set(arr.filter(r => r?.is_booked).map(r => String(r.start_time || r.start).slice(0,5))));
      return arr;
    } catch {
      setSelectedTimes(new Set());
      setBookedTimes(new Set());
      return [];
    }
  };

  const handleDayClick = async (iso) => {
    if (iso < todayISO) return; // block past days
    setDatesSet((prev) => {
      const n = new Set(prev);
      n.has(iso) ? n.delete(iso) : n.add(iso);
      return n;
    });
    setActiveDay(iso);
    if (datesModalDoctor?.id) await loadSlotsFor(datesModalDoctor.id, iso);
  };

  function toggleTime(hhmm) {
    if (!activeDay) return;
    if (bookedTimes.has(hhmm)) { note("Booked slots can't be changed"); return; }
    setSelectedTimes(prev => {
      const n = new Set(prev);
      n.has(hhmm) ? n.delete(hhmm) : n.add(hhmm);
      return n;
    });
  }

  const [saving, setSaving] = useState(false);
  const saveDatesForDoctor = async () => {
    if (!datesModalDoctor) return;
    if (!activeDay) {
      alert("Pick a date first.");
      return;
    }
    try {
      setSaving(true);
      await api.put(`/admins/doctor/${datesModalDoctor.id}/slots`, {
        day: activeDay,
        times: Array.from(selectedTimes).sort(),
        capacity: 1,
      });
      await loadSlotsFor(datesModalDoctor.id, activeDay); // refresh grid
      note("✔ Slots saved");
      closeDatesModal();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to save dates/slots");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = async (docId) => {
    setExpanded((m) => ({ ...m, [docId]: !m[docId] }));
    if (!doctorLogs[docId]) await loadDoctorLogsOnDemand(docId);
  };

  /* -------------------- Doctor Requests (fetch) -------------------- */
  const fetchDoctorRequests = async () => {
    setReqsLoading(true);
    setReqsErr("");
    try {
      const params = new URLSearchParams();
      if (reqStatusFilter !== "all") params.set("status", reqStatusFilter);
      if (reqDoctorFilter !== "all") params.set("doctor_id", String(reqDoctorFilter));
      const { data } = await api.get(`/admins/doctor-requests?${params.toString()}`);
      setReqs(Array.isArray(data) ? data : data?.rows || []);
    } catch (e) {
      setReqsErr(e?.response?.data?.message || "Failed to load doctor requests.");
      setReqs([]);
    } finally {
      setReqsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqStatusFilter, reqDoctorFilter]);

  const openDecision = (row, action) => {
    setDecision({
      open: true,
      id: row.id,
      action,
      note: "",
      busy: false,
      error: "",
    });
  };

  const submitDecision = async () => {
    if (!decision.id) return;
    const act = decision.action; // avoid stale closure on state change
    try {
      setDecision((d) => ({ ...d, busy: true, error: "" }));
      if (act === "approve") {
        await api.post(`/admins/doctor-requests/${decision.id}/approve`, {
          note: decision.note || "",
          decision_note: decision.note || "",
        });
      } else {
        await api.post(`/admins/doctor-requests/${decision.id}/reject`, {
          note: decision.note || "",
          decision_note: decision.note || "",
        });
      }
      setDecision({ open: false, id: null, action: "approve", note: "", busy: false, error: "" });
      await fetchDoctorRequests();
      note(`✔ Request ${act}d`);
    } catch (e) {
      setDecision((d) => ({
        ...d,
        busy: false,
        error: e?.response?.data?.message || `Failed to ${act} request.`,
      }));
    }
  };

  const statusBadgeStyle = (st) => ({
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "capitalize",
    background:
      st === "pending" ? "#fff7ed" : st === "approved" ? "#dcfce7" : "#fee2e2",
    border:
      st === "pending" ? "1px solid #fdba74" : st === "approved" ? "1px solid #86efac" : "1px solid #fca5a5",
    color:
      st === "pending" ? "#c2410c" : st === "approved" ? "#166534" : "#dc2626",
  });

  const prettyPayload = (p) => {
    try {
      const s = typeof p === "string" ? p : JSON.stringify(p);
      return s.length > 120 ? s.slice(0, 118) + "…" : s;
    } catch {
      return String(p || "");
    }
  };

  /* ------------------------------- UI ------------------------------- */
  return (
    <>
      <style>{`
        :root {
          --brand: #4B4BFF;
          --ink: #0f172a;
          --muted: #667085;
          --bg: #f8fafc;
          --card: #ffffff;
          --border: #e2e8f0;
          --primary-gradient: linear-gradient(135deg, #4B4BFF, #0066FF);
          --danger: #dc2626;
          --success: #16a34a;
          --warning: #d97706;
        }
        .admin-wrap { background: var(--bg); min-height: 100vh; padding: 0; }
        .admin-container { max-width: 1400px; margin: 0 auto; padding: 0 20px; }

        /* Header */
        .admin-header { background: white; border-bottom: 1px solid var(--border); padding: 20px 0; margin-bottom: 30px; }
        .admin-topbar { display: flex; align-items: center; justify-content: space-between; }
        .admin-title { display: flex; align-items: center; gap: 12px; }
        .admin-title h1 { font-size: 28px; font-weight: 800; color: var(--ink); margin: 0; }
        .admin-badge { background: var(--primary-gradient); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .admin-actions { display: flex; align-items: center; gap: 12px; }
        .last-updated { color: var(--muted); font-size: 14px; }

        /* Buttons */
        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 10px; border: 1px solid var(--border); background: white; color: var(--ink); font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-size: 14px; }
        .btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .btn-primary { background: var(--primary-gradient); color: white; border: none; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(75, 75, 255, 0.3); }
        .btn-danger { background: var(--danger); color: white; border: none; }
        .btn-danger:hover { background: #b91c1c; transform: translateY(-1px); }
        .btn-sm { padding: 8px 12px; font-size: 12px; }

        /* Stats Grid */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(16, 24, 40, 0.08); border: 1px solid var(--border); transition: all 0.3s ease; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(16, 24, 40, 0.12); }
        .stat-title { color: var(--muted); font-size: 14px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 32px; font-weight: 800; color: var(--brand); margin: 0; line-height: 1; }
        .stat-skeleton { height: 24px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: loading 1.5s infinite; border-radius: 6px; margin-top: 8px; }
        @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* Sections */
        .section { background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(16, 24, 40, 0.08); border: 1px solid var(--border); margin-bottom: 30px; }
        .section-header { display: flex; align-items: center; justify-content: between; margin-bottom: 24px; }
        .section-title { font-size: 20px; font-weight: 700; color: var(--ink); margin: 0; display: flex; align-items: center; gap: 10px; }
        .section-title::before { content: ''; display: block; width: 4px; height: 20px; background: var(--primary-gradient); border-radius: 2px; }
        .section-actions { margin-left: auto; display: flex; align-items: center; gap: 12px; }

        /* Tables */
        .table-container { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
        .table { width: 100%; border-collapse: collapse; background: white; }
        .table th { background: #f8fafc; padding: 16px; text-align: left; font-weight: 600; color: var(--ink); border-bottom: 1px solid var(--border); font-size: 14px; }
        .table td { padding: 16px; border-bottom: 1px solid var(--border); color: var(--ink); font-size: 14px; }
        .table tr:last-child td { border-bottom: none; }
        .table tr:hover { background: #f8fafc; }

        /* Badges & Chips */
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: rgba(75, 75, 255, 0.1); color: var(--brand); border: 1px solid rgba(75, 75, 255, 0.2); }
        .chip { padding: 4px 10px; border-radius: 12px; font-size: 12px; background: #eef2ff; color: #3730a3; border: 1px solid #e0e7ff; font-weight: 500; }

        /* Filters */
        .filters { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .filter-group { display: flex; align-items: center; gap: 8px; }
        .filter-label { color: var(--muted); font-size: 14px; font-weight: 500; }
        .filter-select { padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: white; font-size: 14px; min-width: 120px; }

        /* Empty States */
        .empty-state { text-align: center; padding: 40px 20px; color: var(--muted); }
        .empty-state-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
        .empty-state h3 { font-size: 18px; margin: 0 0 8px; color: var(--ink); }
        .empty-state p { margin: 0; font-size: 14px; }

        /* Admin Info */
        .admin-info { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f0f4ff; border-radius: 12px; border: 1px solid #e0e7ff; }
        .admin-avatar { width: 48px; height: 48px; background: var(--primary-gradient); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 600; }
        .admin-details h3 { margin: 0 0 4px; font-size: 16px; color: var(--ink); }
        .admin-details p { margin: 0; color: var(--muted); font-size: 14px; }

        /* Responsive */
        @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) {
          .admin-container { padding: 0 16px; }
          .admin-topbar { flex-direction: column; align-items: flex-start; gap: 16px; }
          .admin-actions { width: 100%; justify-content: space-between; }
          .stats-grid { grid-template-columns: 1fr; }
          .section { padding: 20px; }
          .filters { flex-direction: column; align-items: flex-start; }
          .table-container { border-radius: 8px; }
          .table th, .table td { padding: 12px 8px; }
        }
        @media (max-width: 480px) {
          .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .section-actions { margin-left: 0; width: 100%; justify-content: space-between; }
        }
      `}</style>

      <div className="admin-wrap">
        <div className="admin-container">
          {/* Header */}
          <header className="admin-header">
            <div className="admin-topbar">
              <div className="admin-title">
                <h1>{APP.name} Admin</h1>
                <span className="admin-badge">Dashboard</span>
              </div>

              <div className="admin-actions">
                {lastUpdated && (
                  <span className="last-updated">
                    Last updated: {lastUpdated.toLocaleString()}
                  </span>
                )}
                <button className="btn" onClick={refreshAll}>🔄 Refresh</button>
                <button className="btn btn-danger" onClick={handleLogout}>🚪 Logout</button>
              </div>
            </div>
          </header>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3 className="stat-title">Total Doctors</h3>
              {loadingStats ? <div className="stat-skeleton" /> :
                errors.stats ? <div style={{ color: "var(--danger)", fontSize: "14px" }}>{errors.stats}</div> :
                <div className="stat-value">{stats.totalDoctors ?? 0}</div>}
            </div>

            <div className="stat-card">
              <h3 className="stat-title">Approved Doctors</h3>
              {loadingStats ? <div className="stat-skeleton" /> :
                errors.stats ? <div style={{ color: "var(--danger)", fontSize: "14px" }}>{errors.stats}</div> :
                <div className="stat-value">{stats.approvedDoctors ?? 0}</div>}
            </div>

            <div className="stat-card">
              <h3 className="stat-title">Pending Approvals</h3>
              {loadingStats ? <div className="stat-skeleton" /> :
                errors.stats ? <div style={{ color: "var(--danger)", fontSize: "14px" }}>{errors.stats}</div> :
                <div className="stat-value">{stats.pendingApprovals ?? 0}</div>}
            </div>

            <div className="stat-card">
              <h3 className="stat-title">Total Patients</h3>
              {loadingStats ? <div className="stat-skeleton" /> :
                errors.stats ? <div style={{ color: "var(--danger)", fontSize: "14px" }}>{errors.stats}</div> :
                <div className="stat-value">{stats.totalPatients ?? 0}</div>}
            </div>
          </div>

          {/* Admin Info */}
          <div className="section">
            <h2 className="section-title">Admin Profile</h2>
            <div className="admin-info">
              <div className="admin-avatar">{admin?.username?.[0]?.toUpperCase() || "A"}</div>
              <div className="admin-details">
                <h3>{admin?.username || "Administrator"}</h3>
                <p>{admin?.email || "System Administrator"}</p>
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Pending Doctor Approvals</h2>
              <div className="section-actions">
                {loadingDoctors && <span style={{ color: "var(--muted)", fontSize: "14px" }}>Loading…</span>}
                {errors.doctors && <span style={{ color: "var(--danger)", fontSize: "14px" }}>{errors.doctors}</span>}
                <button className="btn btn-sm" onClick={fetchDoctors}>Refresh</button>
              </div>
            </div>

            {!unapprovedDoctors?.length ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍⚕️</div>
                <h3>No Pending Approvals</h3>
                <p>All doctors have been approved</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Specialization</th>
                      <th style={{ width: "140px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unapprovedDoctors.map((d) => (
                      <tr key={d.id}>
                        <td><div style={{ fontWeight: "600" }}>{d.name}</div></td>
                        <td>{d.email}</td>
                        <td><span className="badge">{d.specialization}</span></td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => approveDoctor(d.id)}>
                            ✅ Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Doctor Requests */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Doctor Requests</h2>
              <div className="section-actions">
                {reqsLoading && <span style={{ color: "var(--muted)", fontSize: "14px" }}>Loading…</span>}
                {reqsErr && <span style={{ color: "var(--danger)", fontSize: "14px" }}>{reqsErr}</span>}
                <button className="btn btn-sm" onClick={fetchDoctorRequests}>Refresh</button>
              </div>
            </div>

            <div className="filters">
              <div className="filter-group">
                <span className="filter-label">Status:</span>
                <select className="filter-select" value={reqStatusFilter} onChange={(e) => setReqStatusFilter(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
              </div>

              <div className="filter-group">
                <span className="filter-label">Doctor:</span>
                <select className="filter-select" value={reqDoctorFilter} onChange={(e) => setReqDoctorFilter(e.target.value)}>
                  <option value="all">All Doctors</option>
                  {approvedDoctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {!reqs.length ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>No Requests Found</h3>
                <p>No doctor requests match your current filters</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Created</th>
                      <th>Doctor</th>
                      <th>Type</th>
                      <th>Target</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Decision Note</th>
                      <th style={{ width: "160px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reqs.map((r) => {
                      const doctorName = r.doctor_name || approvedDoctors.find(d => d.id === r.doctor_id)?.name || `#${r.doctor_id}`;
                      const target =
                        r.kind === "leave_day"
                          ? (r.payload?.day || "—")
                          : (r.kind === "cancel_slot" || r.kind === "cancel_slots")
                          ? `${r.payload?.day || "—"} ${r.payload?.start_time || ""}-${r.payload?.end_time || ""}`
                          : (r.kind === "shift_slot" || r.kind === "shift_slots")
                          ? `${r.payload?.day || "—"} ${r.payload?.from || ""}→${r.payload?.to || ""}`
                          : <span className="chip">{prettyPayload(r.payload)}</span>;

                      return (
                        <tr key={r.id}>
                          <td>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                          <td><div style={{ fontWeight: "600" }}>{doctorName}</div></td>
                          <td><span className="badge">{r.kind}</span></td>
                          <td>{target}</td>
                          <td style={{ whiteSpace: "pre-wrap", maxWidth: "200px" }}>{r.reason || "—"}</td>
                          <td><span style={statusBadgeStyle(r.status)}>{r.status || "pending"}</span></td>
                          <td>{r.decision_note || "—"}</td>
                          <td>
                            {r.status === "pending" ? (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button className="btn btn-primary btn-sm" onClick={() => openDecision(r, "approve")}>Approve</button>
                                <button className="btn btn-sm" onClick={() => openDecision(r, "reject")}>Reject</button>
                              </div>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
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
        </div>
      </div>

      {/* ------------ Decision Modal (Approve/Reject) ------------ */}
      {decision.open && (
        <Modal onClose={() => setDecision((d) => ({ ...d, open: false }))}>
          <h3 style={{ marginTop: 0, marginBottom: 12, textTransform: "capitalize" }}>
            {decision.action} request
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Decision note (optional, visible to doctor)</div>
              <textarea
                rows={4}
                className="btn"
                style={{ width: "100%", borderColor: "#ddd" }}
                value={decision.note}
                onChange={(e) => setDecision((d) => ({ ...d, note: e.target.value }))}
                placeholder="Add a brief note for the doctor…"
              />
            </label>
            {decision.error && <div style={{ color: "crimson" }}>{decision.error}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <button className="btn" onClick={() => setDecision((d) => ({ ...d, open: false }))}>Cancel</button>
            <button className="btn btn-primary" disabled={decision.busy} onClick={submitDecision}>
              {decision.busy ? "Submitting…" : (decision.action === "approve" ? "Approve" : "Reject")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ---------------- Small inline Modal component ---------------- */
function Modal({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(940px, 96vw)",
          background: "#fff",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            border: "1px solid #e7e7e7",
            background: "#fff",
            borderRadius: 999,
            width: 32,
            height: 32,
            cursor: "pointer",
          }}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export default AdminDashboard;
