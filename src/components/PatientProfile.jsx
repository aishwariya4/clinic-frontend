// src/components/PatientProfile.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { patientApi } from "../api";              // ✅ use the shared client
import { API_BASE as API } from "../config";      // only for SERVER building

/* -------------------------- small helpers -------------------------- */
const toYMD = (v) => {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;                // YYYY-MM-DD
  const m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(String(v)); // DD-MM-YYYY or DD/MM/YYYY
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};
const fromYMD = (v) => (v ? v : null);

// Fallback formatter: if patient_code missing, derive from numeric id
const formatPatientCode = (me) => {
  if (!me) return "";
  if (me.patient_code) return me.patient_code;
  if (me.id != null) return `PT${String(me.id).padStart(2, "0")}`;
  return "";
};

/* ================================================================== */

export default function PatientProfile() {
  const navigate = useNavigate();
  const location = useLocation();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // delete-state
  const [deleting, setDeleting] = useState(false);
  const [ack, setAck] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // appointments drawer state
  const [apptsOpen, setApptsOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [apptsLoading, setApptsLoading] = useState(false);
  const [apptsError, setApptsError] = useState("");
  const [apptsFilter, setApptsFilter] = useState("active"); // 'active' | 'completed'

  // show/hide danger zone (triggered from 3-dots menu)
  const [showDanger, setShowDanger] = useState(false);
  const dangerRef = useRef(null);

  const token = localStorage.getItem("patientToken") || sessionStorage.getItem("patientToken");
  const SERVER = API.replace(/\/api\/?$/, ""); // e.g. http://localhost:5000

  /* --------------------------- fetch on mount --------------------------- */
  useEffect(() => {
    let alive = true;

    // If no token at all, go to login before hitting the API
    if (!token) {
      navigate("/patient/login", { replace: true, state: { from: location } });
      return () => { alive = false; };
    }

    (async () => {
      try {
        const { data } = await patientApi.get(`/patients/me`);
        if (!alive) return;
        setMe({ ...data, dob: toYMD(data.dob) });
      } catch (e) {
        const status = e?.response?.status;
        const text = e?.response?.data?.message || "Failed to load profile";
        setMsg({ type: "error", text });
        if (status === 401) {
          // token is cleared by the shared client; redirect to login
          navigate("/patient/login", { replace: true, state: { from: location } });
          return;
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [token, navigate, location]);

  // When landing on /patient/profile?tab=appointments[&filter=completed]
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const tab = (q.get("tab") || "").toLowerCase();
    const f = (q.get("filter") || q.get("status") || "active").toLowerCase();
    if (tab === "appointments") {
      const allowed = ["active", "completed", "booked", "cancelled"];
      const next = allowed.includes(f) ? f : "active";
      setApptsFilter(next);
      setApptsOpen(true);
      fetchAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  if (loading) return <div style={{ padding: 24 }}>Loading profile…</div>;
  if (!me) return <div style={{ padding: 24 }}>No profile found.</div>;

  const imgUrl =
    me.avatar_url
      ? me.avatar_url.startsWith("http")
        ? me.avatar_url
        : `${SERVER}/${me.avatar_url}`
      : null;

  const code = formatPatientCode(me);
  const firstName = String(me.name || "").trim().split(" ")[0] || "there";

  /* ---------------------------- handlers ---------------------------- */
  const onChange = (e) => setMe((m) => ({ ...m, [e.target.name]: e.target.value }));

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg({ type: "", text: "" });

    // instant preview
    const preview = URL.createObjectURL(file);
    setMe((m) => ({ ...m, avatar_url: preview }));

    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const { data } = await patientApi.put(`/patients/me/avatar`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMe((m) => ({ ...m, avatar_url: data.avatar_url }));
      setMsg({ type: "success", text: data.message || "Avatar updated" });
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.message || "Avatar upload failed" });
    } finally {
      URL.revokeObjectURL(preview);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      const payload = {
        name: me.name,
        phone: me.phone || null,
        dob: fromYMD(me.dob),
        gender: me.gender || null,
        address: me.address || null,
      };
      const { data } = await patientApi.put(`/patients/me`, payload);
      setMe((m) => ({ ...m, ...data.patient, dob: toYMD(data.patient.dob) }));
      setMsg({ type: "success", text: data.message || "Profile updated" });
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.message || "Failed to update" });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    const form = e.currentTarget;
    const current_password = form.elements.current.value;
    const new_password = form.elements.next.value;
    const confirm = form.elements.confirm.value;

    if (new_password !== confirm) {
      setMsg({ type: "error", text: "New passwords do not match" });
      return;
    }
    try {
      const { data } = await patientApi.put(`/patients/me/password`, { current_password, new_password });
      setMsg({ type: "success", text: data.message || "Password changed" });
      form.reset();
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.message || "Failed to change password" });
    }
  };

  const deleteAccount = async () => {
    if (!ack || confirmText !== "DELETE") {
      setMsg({ type: "error", text: 'Please tick the box and type "DELETE" to confirm.' });
      return;
    }
    setDeleting(true);
    setMsg({ type: "", text: "" });
    try {
      await patientApi.delete(`/patients/me`);

      // purge auth and redirect
      ["patientToken", "patient"].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      window.dispatchEvent(new Event("authchange"));
      navigate("/", { replace: true });
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.message || "Failed to delete account" });
    } finally {
      setDeleting(false);
    }
  };

  /* ------------------------- Appointments (drawer) ------------------------ */

  const openAppointments = async (filter = "active") => {
    setApptsFilter(filter);
    setApptsOpen(true);
    await fetchAppointments();
  };

  const closeAppointments = () => {
    setApptsOpen(false);
    setAppointments([]);
    setApptsError("");
  };

  const fetchAppointments = async () => {
    setApptsLoading(true);
    setApptsError("");
    try {
      const res = await patientApi.get(`/patients/me/appointments`);
      const rows = Array.isArray(res.data) ? res.data : res.data.appointments ?? res.data.rows ?? [];
      setAppointments(rows);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      setApptsError(
        err.response?.data?.message ||
          "Could not load appointments. Make sure your backend exposes GET /api/patients/me/appointments"
      );
    } finally {
      setApptsLoading(false);
    }
  };

  const apptDate = (r) => {
    if (!r) return "";
    if (r.starts_at) {
      const d = new Date(r.starts_at);
      if (!Number.isNaN(+d)) return d.toLocaleDateString();
    }
    if (r.date) return toYMD(r.date);
    return toYMD(r.starts_at?.slice?.(0, 10) || r.date);
  };
  const apptTime = (r) => {
    if (!r) return "";
    if (r.starts_at) {
      const d = new Date(r.starts_at);
      if (!Number.isNaN(+d)) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (r.time) return r.time;
    return "";
  };
  const apptDoctor = (r) => r?.doctor_name || r?.doctor?.name || r?.doctorName || "—";

  const isCompleted = (r) => String(r.status || "").toLowerCase() === "completed";
  const isCancelled = (r) => {
    const s = String(r.status || "").toLowerCase();
    return s === "cancelled" || s === "no_show";
  };
  const filteredAppts =
    apptsFilter === "completed"
      ? appointments.filter(isCompleted)
      : appointments.filter((r) => !isCompleted(r) && !isCancelled(r));

  /* ----------------------------- render ----------------------------- */
  return (
    <div style={wrap}>
      <div style={card}>
        {/* Header with greeting + 3-dots menu */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={h2}>Hi, {firstName}</h2>
          {code ? <div style={{ ...badge }}>Patient ID: <strong>{code}</strong></div> : null}

          <div style={{ marginLeft: "auto" }}>
            <KebabMenu
              onActive={() => openAppointments("active")}
              onCompleted={() => openAppointments("completed")}
              onDelete={() => {
                setShowDanger(true);
                setTimeout(() => dangerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
              }}
            />
          </div>
        </div>

        {msg.text ? (
          <div
            role="status"
            style={{
              ...banner,
              background: msg.type === "error" ? "#fde2e1" : "#e6faea",
              color: "#222",
            }}
          >
            {msg.text}
          </div>
        ) : null}

        {/* Danger zone toggled by 3-dots → Delete my account */}
        {showDanger && (
          <div ref={dangerRef}>
            <DangerZone
              ack={ack}
              setAck={setAck}
              confirmText={confirmText}
              setConfirmText={setConfirmText}
              onDelete={deleteAccount}
              deleting={deleting}
              onCancel={() => {
                setShowDanger(false);
                setAck(false);
                setConfirmText("");
                setMsg({ type: "", text: "" });
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <AvatarBlock imgUrl={imgUrl} onAvatar={onAvatar} />
          <ProfileForm me={me} onChange={onChange} onSubmit={saveProfile} saving={saving} />
        </div>

        <hr style={{ margin: "24px 0" }} />

        <PasswordForm onSubmit={changePassword} />
      </div>

      {/* Appointments Drawer */}
      <Drawer open={apptsOpen} onClose={closeAppointments} width={560}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>My appointments</h3>
          <button
            onClick={closeAppointments}
            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20 }}
          >
            ×
          </button>
        </div>

        {/* Filter toggle inside drawer */}
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <button
            onClick={() => setApptsFilter("active")}
            style={{
              ...pillBtn,
              background: apptsFilter === "active" ? "#4B4BFF" : "#f3f4f6",
              color: apptsFilter === "active" ? "#fff" : "#111827",
            }}
          >
            Active
          </button>
          <button
            onClick={() => setApptsFilter("completed")}
            style={{
              ...pillBtn,
              background: apptsFilter === "completed" ? "#4B4BFF" : "#f3f4f6",
              color: apptsFilter === "completed" ? "#fff" : "#111827",
            }}
          >
            Completed
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          {apptsLoading ? (
            <div>Loading appointments…</div>
          ) : apptsError ? (
            <div style={{ color: "#b91c1c" }}>{apptsError}</div>
          ) : filteredAppts.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No appointments found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: 8 }}>Date</th>
                  <th style={{ padding: 8 }}>Time</th>
                  <th style={{ padding: 8 }}>Doctor</th>
                  <th style={{ padding: 8 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppts.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #fafafa" }}>
                    <td style={{ padding: 8 }}>{apptDate(r)}</td>
                    <td style={{ padding: 8 }}>{apptTime(r)}</td>
                    <td style={{ padding: 8 }}>{apptDoctor(r)}</td>
                    <td style={{ padding: 8, color: isCompleted(r) ? "#16a34a" : isCancelled(r) ? "#b91c1c" : "#0f172a" }}>
                      {r.status || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Drawer>
    </div>
  );
}

/* ------------------------- small in-file blocks ------------------------- */

function KebabMenu({ onActive, onCompleted, onDelete }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onDoc = (e) => setOpen((o) => (e.target.closest?.(".kebab-root") ? o : false));
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);
  return (
    <div className="kebab-root" style={{ position: "relative", display: "inline-block" }}>
      <button
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          background: "#fff",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,.04)",
          fontSize: 18,
        }}
      >
        ⋮
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: 8,
            minWidth: 220,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,.08)",
            padding: 6,
            zIndex: 10,
          }}
        >
          <MenuItem onClick={() => { setOpen(false); onActive?.(); }}>📅 My appointments (Active)</MenuItem>
          <MenuItem onClick={() => { setOpen(false); onCompleted?.(); }}>✅ Appointments completed</MenuItem>
          <div style={{ borderTop: "1px solid #f1f5f9", margin: "6px 0" }} />
          <MenuItem danger onClick={() => { setOpen(false); onDelete?.(); }}>🗑️ Delete my account</MenuItem>
        </div>
      )}
    </div>
  );
}
function MenuItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        borderRadius: 8,
        padding: "10px 10px",
        cursor: "pointer",
        color: danger ? "#b91c1c" : "#0f172a",
      }}
    >
      {children}
    </button>
  );
}

function Drawer({ open, onClose, children, width = 480 }) {
  return (
    <div
      aria-hidden={!open}
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        height: "100vh",
        width,
        maxWidth: "100%",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 240ms ease",
        background: "#fff",
        boxShadow: "-20px 0 40px rgba(0,0,0,0.12)",
        zIndex: 1200,
        padding: 18,
        overflowY: "auto",
      }}
    >
      {children}
      {!open && (
        <button onClick={onClose} style={{ display: "none" }}>
          close
        </button>
      )}
    </div>
  );
}

function AvatarBlock({ imgUrl, onAvatar }) {
  return (
    <div>
      <div style={avatar}>
        {imgUrl ? (
          <img src={imgUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          "No Photo"
        )}
      </div>
      <label style={uploadBtn}>
        <input type="file" accept="image/*" onChange={onAvatar} style={{ display: "none" }} autoComplete="off" />
        Upload photo
      </label>
    </div>
  );
}

function ProfileForm({ me, onChange, onSubmit, saving }) {
  const code = formatPatientCode(me);
  return (
    <form onSubmit={onSubmit} style={{ flex: 1, minWidth: 280 }}>
      <FormRow label="Patient ID">
        <input value={code} style={{ ...input, background: "#f5f5f5" }} disabled />
      </FormRow>

      <FormRow label="Full name">
        <input name="name" value={me.name || ""} onChange={onChange} style={input} required autoComplete="name" />
      </FormRow>

      <FormRow label="Email">
        <input value={me.email || ""} style={{ ...input, background: "#f5f5f5" }} disabled autoComplete="email" />
      </FormRow>

      <FormRow label="Phone">
        <input name="phone" value={me.phone || ""} onChange={onChange} style={input} autoComplete="tel" />
      </FormRow>

      <FormRow label="Date of birth">
        <input type="date" name="dob" value={me.dob || ""} onChange={onChange} style={input} autoComplete="bday" />
      </FormRow>

      <FormRow label="Gender">
        <input name="gender" value={me.gender || ""} onChange={onChange} style={input} placeholder="Female/Male/Other" autoComplete="sex" />
      </FormRow>

      <FormRow label="Address">
      <textarea name="address" value={me.address || ""} onChange={onChange} style={{ ...input, minHeight: 70 }} autoComplete="street-address" />
      </FormRow>

      <button type="submit" style={button} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function PasswordForm({ onSubmit }) {
  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 420 }}>
      <h3 style={{ margin: "0 0 8px" }}>Change password</h3>
      <input name="current" type="password" placeholder="Current password" style={input} required autoComplete="current-password" />
      <input name="next" type="password" placeholder="New password (8+ chars)" style={input} required autoComplete="new-password" />
      <input name="confirm" type="password" placeholder="Confirm new password" style={input} required autoComplete="new-password" />
      <button type="submit" style={button}>Update password</button>
    </form>
  );
}

function DangerZone({ ack, setAck, confirmText, setConfirmText, onDelete, deleting, onCancel }) {
  return (
    <>
      <hr style={{ margin: "24px 0" }} />
      <section
        aria-labelledby="danger-title"
        style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: 16 }}
      >
        <h3 id="danger-title" style={{ marginTop: 0, color: "#991b1b" }}>Danger zone</h3>
        <p style={{ color: "#7f1d1d", marginBottom: 12 }}>
          Deleting your account is <strong>permanent</strong>. All your appointments and personal data will be removed.
          <br />
          <strong>This action cannot be undone.</strong>
        </p>

        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0 12px", color: "#7f1d1d" }}>
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          I understand this cannot be undone.
        </label>

        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder='Type "DELETE" to confirm'
          autoComplete="off"
          style={{
            width: "100%",
            maxWidth: 360,
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 12,
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "10px 14px",
              background: "#fff",
              color: "#111827",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting || !ack || confirmText !== "DELETE"}
            style={{
              padding: "10px 14px",
              background: deleting || !ack || confirmText !== "DELETE" ? "#fca5a5" : "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: deleting || !ack || confirmText !== "DELETE" ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </section>
    </>
  );
}

function FormRow({ label, children }) {
  return (
    <label style={labelStyle}>
      <span style={labelText}>{label}</span>
      {children}
    </label>
  );
}

/* ------------------------------- styles ------------------------------- */
const wrap = { display: "flex", justifyContent: "center", padding: 24, background: "#f8f9fb", minHeight: "100vh" };
const card = { width: "min(980px, 100%)", background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 8px 24px rgba(16,24,40,.08)" };
const h2 = { margin: "4px 0 16px", fontWeight: 800, color: "#0f172a" };
const banner = { padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: 14 };
const badge = { display: "inline-block", padding: "6px 10px", borderRadius: 8, background: "#eef2ff", color: "#1e293b", fontSize: 14 };
const input = { width: "100%", border: "1px solid #D0D5DD", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none" };
const button = { marginTop: 12, padding: "10px 14px", background: "#4B4BFF", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" };
const avatar = { width: 140, height: 140, borderRadius: "50%", background: "#eef2ff", overflow: "hidden", display: "grid", placeItems: "center", color: "#4B4BFF", fontWeight: 700 };
const uploadBtn = { display: "inline-block", marginTop: 10, padding: "8px 12px", border: "1px solid #d0d5dd", borderRadius: 999, cursor: "pointer", color: "#334155", fontSize: 14 };
const labelStyle = { display: "block", margin: "12px 0 6px" };
const labelText = { display: "block", marginBottom: 6, color: "#344054", fontSize: 14 };
const pillBtn = { padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", cursor: "pointer", fontWeight: 600 };
