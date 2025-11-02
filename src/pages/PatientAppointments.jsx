// src/pages/PatientAppointments.jsx
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

const api = axios.create({ baseURL: API_BASE, withCredentials: true });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("patientToken") || sessionStorage.getItem("patientToken");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default function PatientAppointments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("booked"); // booked|active|completed|no_show|waitlist
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [waitlist, setWaitlist] = useState([]);

  const [now, setNow] = useState(Date.now());
useEffect(() => {
  const t = setInterval(() => setNow(Date.now()), 1000); // 1s tick
  return () => clearInterval(t);
}, []);

  
  async function cancelAppt(id) {
    if (!id) return;
    if (!confirm("Cancel this appointment?")) return;
    try {
      await api.delete(`/patients/appointments/${id}`);
      setItems(xs => xs.filter(x => x.id !== id));
      alert("Appointment cancelled");
    } catch (e) {
      alert(e?.response?.data?.message || "Could not cancel appointment.");
    }
  }

  function startReschedule(a) {
    // Keep same doctor. Preselect current date.
    navigate(
      `/doctors?reschedule=1&apptId=${a.id}&doctorId=${a.doctor_id}&date=${a.date}`
    );
  }

  // load appointments per tab (existing behavior)
  useEffect(() => {
    if (tab === "waitlist") return; // handled below
    let alive = true;
    setLoading(true);
    const statusMap = {
      booked: "booked,rescheduled",
      active: "active",
      completed: "completed",
      no_show: "no_show",
    };
    api
      .get("/patients/me/appointments", { params: { status: statusMap[tab] || "booked" } })
      .then((res) => alive && setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tab]);

  // load waitlist when tab selected
  useEffect(() => {
    if (tab !== "waitlist") return;
    let alive = true;
    setLoading(true);
    api
      .get("/patients/waitlist/my")
      .then((res) => alive && setWaitlist(Array.isArray(res.data) ? res.data : []))
      .catch(() => alive && setWaitlist([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tab]);

  async function cancelWait(id) {
    if (!id) return;
    try {
      await api.post(`/patients/waitlist/${id}/cancel`);
      setWaitlist((xs) => xs.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)));
    } catch (e) {
      alert(e?.response?.data?.message || "Could not cancel waitlist entry.");
    }
  }
  async function acceptOffer(id) {
    try {
    
       await api.post(`/patients/waitlist/offers/${id}/accept`);
       setTab("booked"); // reloads Booked list

    } catch (e) {
      alert(e?.response?.data?.message || "Could not accept offer.");
    }
  }
  async function declineOffer(id) {
    try {
      await api.post(`/patients/waitlist/offers/${id}/decline`);
      setWaitlist((xs) => xs.map((x) => (x.id === id ? { ...x, status: "declined" } : x)));
    } catch (e) {
      alert(e?.response?.data?.message || "Could not decline offer.");
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>My Appointments</h2>
      <div style={{ display: "flex", gap: 10, margin: "10px 0 18px" }}>
        {["booked", "active", "completed", "no_show", "waitlist"].map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #e1e1e1",
              background: tab === k ? "#e8edff" : "#fff",
              fontWeight: 700,
              textTransform: "capitalize",
            }}
          >
            {k === "no_show" ? "No-show" : k === "waitlist" ? "My Waitlist" : k}
          </button>
        ))}
      </div>

      {tab !== "waitlist" ? (
        loading ? (
          <p>Loading…</p>
        ) : items.length === 0 ? (
          <p>No {tab === "no_show" ? "No-show" : tab} appointments.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((a) => (
              <li
                key={a.id}
                style={{
                  border: "1px solid #ececec",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{a.doctor_name}</div>
                  <div style={{ color: "#666" }}>{a.specialization}</div>
                  <div style={{ marginTop: 6 }}>{a.date} • {a.time}</div>
                </div>
                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#444", fontWeight: 600 }}>{a.status}</span>
                  {(a.status === "booked" || a.status === "rescheduled") && (
                    <>
                      <button
                        onClick={() => startReschedule(a)}
                        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
                        title="Pick a different time with the same doctor"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => cancelAppt(a.id)}
                        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
                        title="Cancel this appointment"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
                
              </li>
            ))}
          </ul>
        )
      ) : loading ? (
        <p>Loading…</p>
      ) : waitlist.length === 0 ? (
        <p>You have no waitlist entries.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {waitlist.map((w) => (
            <li
              key={w.id}
              style={{
                border: "1px solid #ececec",
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{w.doctor_name || `Doctor #${w.doctor_id}`}</div>
                <div style={{ marginTop: 6 }}>{w.date} • {w.time}</div>
                <div style={{ marginTop: 6, color: "#666" }}>Status: {w.status}</div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {w.status === "queued" && (
                  <button
                    onClick={() => cancelWait(w.id)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
                    title="Leave this waitlist"
                  >
                    Cancel
                  </button>
                )}
                {w.status === "offered" && (() => {
  const expMs = w.offer_expires_at ? new Date(w.offer_expires_at).getTime() : 0;
  const expired = !expMs || expMs <= now;

  return (
    <>
      <button
        onClick={() => !expired && acceptOffer(w.id)}
        disabled={expired}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "none",
          background: expired ? "#cbd5e1" : "#4B5BFF",
          color: "#fff",
          fontWeight: 700,
          cursor: expired ? "not-allowed" : "pointer",
          opacity: expired ? 0.6 : 1
        }}
        title={expired ? "Offer expired" : "Accept this offer"}
      >
        Accept
      </button>

      <button
        onClick={() => !expired && declineOffer(w.id)}
        disabled={expired}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #ddd",
          background: expired ? "#f3f4f6" : "#fff",
          color: expired ? "#9ca3af" : "#111827",
          cursor: expired ? "not-allowed" : "pointer",
          opacity: expired ? 0.6 : 1
        }}
        title={expired ? "Offer expired" : "Decline this offer"}
      >
        Decline
      </button>

      {expired && <span style={{ marginLeft: 8, color: "#666" }}>expired</span>}
    </>
  );
})()}

  </div>
    </li>
          ))}
        </ul>
      )}
    </div>
  );
}
