// src/components/DoctorDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doctorApi } from "../api";


/* Safe JSON parse */
function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ymd(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
function addDaysStr(start, n) {
  const d = new Date(start + "T00:00:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function hhmm(t) {
  // works for "09:00:00" or "09:00"
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** Build a simple 30-min grid for time selects (doctor-side UI only) */
function buildTimeGrid(start = "07:00", end = "20:00", stepMin = 30) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const out = [];
  for (let t = startMin; t <= endMin; t += stepMin) {
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    out.push(`${h}:${m}`);
  }
  return out;
}


function toHHMMSS(v) {
  if (!v) return "";
  const [h="00", m="00", s="00"] = String(v).split(":");
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// ---- compatibility shim for mixed backends ----
// DoctorDashboard.jsx
const KIND_FALLBACK = {
  leave_day:   "time_off_day",
  cancel_slot: "cancel_slots",
  shift_slot:  "shift_slots",
};


function massagePayload(kind, p = {}) {
  const out = { ...p };
  if (out.day) out.day = String(out.day).slice(0, 10);
  if (out.slot_id != null) out.slot_id = Number(out.slot_id);

  if (kind === "cancel_slot" || kind === "cancel") {
    const start = toHHMMSS(out.start_time || out.start);
    const end   = toHHMMSS(out.end_time   || out.end);
    out.start_time = start;
    out.end_time   = end;
    out.start = start; // legacy
    out.end   = end;
  }

  if (kind === "shift_slot" || kind === "shift") {
    const from = toHHMMSS(out.from || out.start || out.start_time);
    const to   = toHHMMSS(out.to   || out.end   || out.end_time);
    out.from = from;
    out.to   = to;
    out.start_time = from; // alt names some servers expect
    out.end_time   = to;
    out.start = from;
    out.end   = to;
  }
  return out;
}

function formatReqTarget(r) {
  const p = r?.payload || {};
  const day = (p.day || "").slice(0, 10);
  const t = (x) => String(x || "").slice(0, 5);

  if (r.kind === "leave_day") {
    return `${day} (day off)`;
  }
  if (r.kind === "cancel_slot" || r.kind === "cancel_slots") {
    return `${day} ${t(p.start_time)}–${t(p.end_time)}  #${p.slot_id}`;
  }
  if (r.kind === "shift_slot" || r.kind === "shift_slots") {
    return `${day} ${t(p.from)} → ${t(p.to)}  #${p.slot_id}`;
  }
  return (
    <code style={{ background:"#f5f5f5", padding:"2px 6px", borderRadius:6 }}>
      {JSON.stringify(p)}
    </code>
  );
}


async function postDoctorRequest(kind, payload, reason) {
  const p1 = massagePayload(kind, payload);
  try {
    return await doctorApi.post(`/doctors/me/requests`, { kind, payload: p1, reason });
  } catch (e) {
    const status = e?.response?.status;
    const msg = (e?.response?.data?.message || "").toLowerCase();
    // If backend rejects the new kind names, retry with the legacy ones.
    if (status === 400 && msg.includes("invalid kind")) {
      const alt = KIND_FALLBACK[kind];
      if (alt) {
        const p2 = massagePayload(alt, payload);
        return await doctorApi.post(`/doctors/me/requests`, { kind: alt, payload: p2, reason });
      }
    }
    throw e;
  }
}



export default function DoctorDashboard() {
  const navigate = useNavigate();

  // derive logged in doctor & token
  const doctor = useMemo(() => readJSON("doctorUser"), []);
  const token = localStorage.getItem("doctorToken");

  // appointments state
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // slots state (read-only)
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsErr, setSlotsErr] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);

  // --- Doctor requests state ---
  const [myReqs, setMyReqs] = useState([]);
  const [reqsLoading, setReqsLoading] = useState(false);
  const [reqsErr, setReqsErr] = useState("");

  // Request dialog state
  const [reqDlg, setReqDlg] = useState({
    open: false,
    kind: "leave_day", // leave_day | cancel_slot | shift_slot
    payload: {},       // e.g. { day } / { slot_id, day, start_time, end_time } / { slot_id, day, from, to }
    reason: "",
    busy: false,
    error: "",
  });

  // redirect if not logged in
  useEffect(() => {
    if (!doctor || !doctor.id || !token) {
      navigate("/doctor/login", { replace: true });
    }
  }, [doctor, token, navigate]);

  // load appointments + log "logged in"
  useEffect(() => {
    let alive = true;

    async function run() {
      if (!doctor?.id || !token) return;

      try {
        const { data } = await doctorApi.get(`/doctors/${doctor.id}/appointments`);
        if (!alive) return;

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.appointments)
          ? data.appointments
          : [];
        setAppointments(list);
      } catch (e) {
        if (!alive) return;
        setErr("Failed to load appointments.");
      } finally {
        if (alive) setLoading(false);
      }

      // best-effort activity log (ignore errors)
      try {
        await doctorApi.post(`/doctors/activity`, {
          doctor_id: doctor.id,
          action: "logged in",
        });
      } catch {}
    }

    run();
    return () => {
      alive = false;
    };
  }, [doctor?.id, token]);

  // load my read-only slots (next 14 days)
  useEffect(() => {
    let alive = true;
    async function loadSlots() {
      if (!token) return;
      setSlotsLoading(true);
      setSlotsErr("");

      const from = ymd(new Date());
      const to = addDaysStr(from, 14);

      try {
        const { data } = await doctorApi.get(`/doctors/me/slots`, {
          params: { from, to, only_free: onlyOpen ? "true" : "false" },
        });
        if (!alive) return;
        setSlots(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setSlotsErr("Failed to load availability.");
      } finally {
        if (alive) setSlotsLoading(false);
      }
    }
    loadSlots();
    return () => {
      alive = false;
    };
  }, [token, onlyOpen]);

  // load my requests
  const refreshMyRequests = async () => {
    if (!token) return;
    setReqsLoading(true);
    setReqsErr("");
    try {
      const { data } = await doctorApi.get(`/doctors/me/requests`);
      setMyReqs(Array.isArray(data) ? data : []);
    } catch (e) {
      setReqsErr(e?.response?.data?.message || "Failed to load requests.");
      setMyReqs([]);
    } finally {
      setReqsLoading(false);
    }
  };
  useEffect(() => {
    refreshMyRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // submit new request
  async function submitDoctorRequest() {
    // client-side minimal validation
    const { kind, payload, reason } = reqDlg;
    if (kind === "leave_day" && !payload?.day) {
      setReqDlg((d) => ({ ...d, error: "Please choose a day." }));
      return;
    }
    if (kind === "cancel_slot" && !payload?.slot_id) {
      setReqDlg((d) => ({ ...d, error: "Missing slot to cancel." }));
      return;
    }
    if (kind === "shift_slot") {
      if (!payload?.slot_id) {
        setReqDlg((d) => ({ ...d, error: "Missing slot to shift." }));
        return;
      }
      if (!payload?.to) {
        setReqDlg((d) => ({ ...d, error: "Please pick the new time (To)." }));
        return;
      }
    }

    try {
      setReqDlg((d) => ({ ...d, busy: true, error: "" }));
      await postDoctorRequest(kind, payload, (reason || "").trim());
      await refreshMyRequests();
      setReqDlg({
        open: false,
        kind: "leave_day",
        payload: {},
        reason: "",
        busy: false,
        error: "",
      });
    } catch (e) {
      setReqDlg((d) => ({
        ...d,
        busy: false,
        error: e?.response?.data?.message || "Failed to submit request.",
      }));
    }
  }

  // build handy options for shift "to" select
  const TIME_GRID = useMemo(() => buildTimeGrid("07:00", "20:00", 30), []);

  const today = ymd(new Date());
  const todayAppointments = appointments.filter((a) => a?.date === today);
  const upcomingAppointments = appointments.filter((a) => a?.date > today);
  const pastAppointments = appointments.filter((a) => a?.date < today);

  // group slots by day
  const slotsByDay = useMemo(() => {
    const map = {};
    for (const s of slots) {
      const k = (s.day && String(s.day).slice(0, 10)) || "";
      if (!k) continue;
      if (!map[k]) map[k] = [];
      map[k].push(s);
    }
    // sort each day by start_time
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
    );
    return map;
  }, [slots]);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>👨‍⚕️ Doctor Dashboard</h2>

      {doctor ? (
        <p>
          Welcome, <strong>{doctor.name}</strong> — {doctor.email}
        </p>
      ) : (
        <p>Redirecting to login…</p>
      )}

      {/* Availability (read-only, computed from DB) */}
      <div
        style={{
          marginTop: "1rem",
          marginBottom: "1.5rem",
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "1rem",
          boxShadow: "0 0 8px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>🗓️ My Availability (next 14 days)</h3>
          <label style={{ fontSize: 14 }}>
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Only open
          </label>
        </div>

        {slotsLoading ? (
          <p style={{ marginTop: 10 }}>Loading availability…</p>
        ) : slotsErr ? (
          <p style={{ marginTop: 10, color: "crimson" }}>{slotsErr}</p>
        ) : Object.keys(slotsByDay).length === 0 ? (
          <p style={{ marginTop: 10 }}>No published slots in this range.</p>
        ) : (
          Object.entries(slotsByDay).map(([day, list]) => (
            <div key={day} style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                {new Date(day + "T00:00:00").toLocaleDateString()}
                <button
                  className="btn"
                  style={{ padding: "4px 8px", fontSize: 12, border: "1px solid #ddd", background: "#fff", borderRadius: 6 }}
                  onClick={() =>
                    setReqDlg({
                      open: true,
                      kind: "leave_day",
                      payload: { day },
                      reason: "",
                      busy: false,
                      error: "",
                    })
                  }
                >
                  Request day off
                </button>
              </div>
              {list.map((s) => {
                const free = Math.max((s.capacity ?? 0) - (s.booked_count ?? 0), 0);
                const full = free <= 0;
                const holdText =
                  s.hold_expires_at && new Date(s.hold_expires_at) > new Date()
                    ? ` • hold until ${new Date(s.hold_expires_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "";
                const wl = s.waitlist_count ? ` • WL ${s.waitlist_count}` : "";
                return (
                  <div
                    key={s.slot_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "8px 10px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      marginBottom: 6,
                      background: full ? "#fafafa" : "#ffffff",
                    }}
                  >
                    <div>
                      <strong>
                        {hhmm(s.start_time)}–{hhmm(s.end_time)}
                      </strong>{" "}
                      <span style={{ color: "#6b7280" }}>
                        (cap {s.capacity ?? 1}, booked {s.booked_count ?? 0}, free {free})
                        {wl}
                        {holdText}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: "1px solid #e5e7eb",
                          fontSize: 12,
                          background: full ? "#fee2e2" : "#dcfce7",
                        }}
                      >
                        {full ? "Full" : "Open"}
                      </span>

                      {/* Quick actions for this slot */}
                      <button
                        className="btn"
                        style={{ padding: "3px 8px", fontSize: 12, border: "1px solid #ddd", background: "#fff", borderRadius: 6 }}
                        onClick={() =>
                          setReqDlg({
                            open: true,
                            kind: "cancel_slot",
                            payload: {
                              slot_id: s.slot_id,
                              day,
                              start_time: hhmm(s.start_time),
                              end_time: hhmm(s.end_time),
                            },
                            reason: "",
                            busy: false,
                            error: "",
                          })
                        }
                      >
                        Request cancel
                      </button>
                      <button
                        className="btn"
                        style={{ padding: "3px 8px", fontSize: 12, border: "1px solid #ddd", background: "#fff", borderRadius: 6 }}
                        onClick={() =>
                          setReqDlg({
                            open: true,
                            kind: "shift_slot",
                            payload: {
                              slot_id: s.slot_id,
                              day,
                              from: hhmm(s.start_time),
                              to: "", // doctor will choose
                            },
                            reason: "",
                            busy: false,
                            error: "",
                          })
                        }
                      >
                        Request shift
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* My Requests (doctor-visible) */}
      <div
        style={{
          marginTop: "1rem",
          marginBottom: "1.5rem",
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "1rem",
          boxShadow: "0 0 8px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>📝 My Requests</h3>
          <button className="btn" style={{ marginLeft: "auto", border: "1px solid #ddd" }} onClick={refreshMyRequests}>
            Refresh
          </button>
        </div>

        {reqsLoading ? (
          <p style={{ marginTop: 10 }}>Loading…</p>
        ) : reqsErr ? (
          <p style={{ marginTop: 10, color: "crimson" }}>{reqsErr}</p>
        ) : !myReqs.length ? (
          <p style={{ marginTop: 10, color: "#666" }}>No requests yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>When</th>
                <th style={{ textAlign: "left", padding: 8 }}>Type</th>
                <th style={{ textAlign: "left", padding: 8 }}>Reason</th>
                <th style={{ textAlign: "left", padding: 8 }}>Target</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                <th style={{ textAlign: "left", padding: 8 }}>Decision note</th>
              </tr>
            </thead>
            <tbody>
              {myReqs.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: 8 }}>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                  <td style={{ padding: 8 }}>
                    <span className="badge">{r.kind}</span>
                  </td>
                  <td style={{ padding: 8 }}>{r.reason || "—"}</td>
                  <td style={{ padding: 8, fontSize: 13, color: "#374151" }}>
                    {formatReqTarget(r)}
                      </td>

                  <td style={{ padding: 8 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid #e5e7eb",
                        background:
                          r.status === "pending"
                            ? "#fff7ed"
                            : r.status === "approved"
                            ? "#dcfce7"
                            : "#fee2e2",
                        fontSize: 12,
                        textTransform: "capitalize",
                      }}
                    >
                      {r.status || "pending"}
                    </span>
                  </td>
                  <td style={{ padding: 8, color: "#555" }}>{r.decision_note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Appointments */}
      {loading ? (
        <p>Loading…</p>
      ) : err ? (
        <p style={{ color: "crimson" }}>{err}</p>
      ) : (
        <div
          style={{
            marginTop: "2rem",
            backgroundColor: "#f9f9f9",
            border: "1px solid #ccc",
            borderRadius: 10,
            padding: "1rem",
            boxShadow: "0 0 8px rgba(0,0,0,0.05)",
          }}
        >
          <Section title="📅 Today's Appointments" rows={todayAppointments} />
          <Section title="🔜 Upcoming Appointments" rows={upcomingAppointments} />
          <Section title="🕘 Past Appointments" rows={pastAppointments} faded />
        </div>
      )}

      {/* Request Modal */}
      {reqDlg.open && (
        <Modal onClose={() => setReqDlg((d) => ({ ...d, open: false }))}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>New request</h3>

          <div style={{ display: "grid", gap: 10 }}>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Type</div>
              <select
                value={reqDlg.kind}
                onChange={(e) => setReqDlg((d) => ({ ...d, kind: e.target.value }))}
                className="btn"
                style={{ borderColor: "#ddd", width: "100%" }}
              >
                <option value="leave_day">Leave (whole day)</option>
                <option value="cancel_slots">Cancel slot</option>
                <option value="shift_slots">Shift slot</option>
              </select>
            </label>

            {/* Payload editors */}
            {reqDlg.kind === "leave_day" && (
              <label>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Day (YYYY-MM-DD)</div>
                <input
                  className="btn"
                  style={{ width: "100%", borderColor: "#ddd" }}
                  value={reqDlg.payload.day || ""}
                  onChange={(e) =>
                    setReqDlg((d) => ({
                      ...d,
                      payload: { ...d.payload, day: e.target.value.slice(0, 10) },
                    }))
                  }
                  placeholder="e.g. 2025-11-02"
                />
              </label>
            )}

            {reqDlg.kind === "cancel_slot" && (
              <div style={{ fontSize: 13, color: "#444" }}>
                <div><strong>Day:</strong> {reqDlg.payload.day || "—"}</div>
                <div>
                  <strong>From–To:</strong>{" "}
                  {reqDlg.payload.start_time || "—"}–{reqDlg.payload.end_time || "—"}
                </div>
                {!reqDlg.payload.slot_id && (
                  <div style={{ color: "crimson", marginTop: 6 }}>
                    Missing slot id — please reopen from a slot row.
                  </div>
                )}
              </div>
            )}

            {reqDlg.kind === "shift_slot" && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 13, color: "#444" }}>
                  <div><strong>Day:</strong> {reqDlg.payload.day || "—"}</div>
                  <div><strong>From:</strong> {reqDlg.payload.from || "—"}</div>
                </div>
                {!reqDlg.payload.slot_id && (
                  <div style={{ color: "crimson" }}>
                    Missing slot id — please reopen from a slot row.
                  </div>
                )}
                <label>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>To (HH:MM)</div>
                  <select
                    className="btn"
                    style={{ width: "100%", borderColor: "#ddd" }}
                    value={reqDlg.payload.to || ""}
                    onChange={(e) =>
                      setReqDlg((d) => ({
                        ...d,
                        payload: { ...d.payload, to: e.target.value },
                      }))
                    }
                  >
                    <option value="">Select time…</option>
                    {TIME_GRID.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <label>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Your reason (visible to admin)</div>
              <textarea
                rows={4}
                className="btn"
                style={{ width: "100%", borderColor: "#ddd" }}
                value={reqDlg.reason}
                onChange={(e) => setReqDlg((d) => ({ ...d, reason: e.target.value }))}
                placeholder="Briefly explain the reason…"
              />
            </label>

            {reqDlg.error && <div style={{ color: "crimson" }}>{reqDlg.error}</div>}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <button className="btn" onClick={() => setReqDlg((d) => ({ ...d, open: false }))}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={reqDlg.busy} onClick={submitDoctorRequest}>
              {reqDlg.busy ? "Submitting…" : "Submit"}
            </button>
          </div>
        </Modal>
      )}

      <button
        onClick={async () => {
          try {
            if (doctor?.id) {
              await doctorApi.post(`/doctors/activity`, {
                doctor_id: doctor.id,
                action: "logged out",
              });
            }
          } finally {
            localStorage.removeItem("doctorUser");
            localStorage.removeItem("doctorToken");
            window.dispatchEvent(new Event("authchange"));
            navigate("/doctor/login", { replace: true });
          }
        }}
        style={{
          marginTop: "2rem",
          padding: "10px 20px",
          backgroundColor: "#cc0000",
          color: "#fff",
          border: "none",
          borderRadius: 5,
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}

function Section({ title, rows, faded }) {
  return (
    <>
      <h3 style={{ marginTop: "1.25rem" }}>{title}</h3>
      {rows.length === 0 ? (
        <p>{title.includes("Past") ? "No past appointments." : "None."}</p>
      ) : (
        rows.map((a, i) => {
          const apptId = a.id ?? a.appointment_id ?? a.appointmentId;
          return (
            <div
              key={apptId ?? i}
              style={{
                padding: ".5rem 0",
                borderBottom: "1px solid #ddd",
                color: faded ? "gray" : "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <strong>{a.patient_name || "Patient"}</strong>{" "}
                  {a.date ? `on ${new Date(a.date).toLocaleDateString()}` : ""}{" "}
                  {a.time ? `at ${String(a.time).slice(0, 5)}` : ""} —{" "}
                  <em>{a.status || "booked"}</em>
                </div>

                {apptId ? (
                  <Link
                    to={`/doctor/appointments/${apptId}/details`}
                    className="btn btn-sm"
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #ccccccff",
                      background: "#0066ff",
                      borderRadius: 6,
                      textDecoration: "none",
                      color: "#fff",
                    }}
                  >
                    Details
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

/* Simple inline modal to avoid external deps */
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
          width: "min(600px, 96vw)",
          background: "#fff",
          borderRadius: 12,
          padding: 18,
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
