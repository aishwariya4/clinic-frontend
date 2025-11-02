// src/pages/BookAppointment.jsx
import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../config";

const api = axios.create({ baseURL: API_BASE, withCredentials: true });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("patientToken") || sessionStorage.getItem("patientToken");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^\d{2}:\d{2}$/;

export default function BookAppointment() {
  const [qs] = useSearchParams();
  const navigate = useNavigate();

  const rescheduleId = qs.get("reschedule");     // appointment id for reschedule
  const doctorIdQS   = qs.get("doctorId");       // pass this in query for reschedule
  const isReschedule = useMemo(() => Boolean(rescheduleId), [rescheduleId]);

  const [doctorId, setDoctorId] = useState(doctorIdQS || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState([]);        // [{id, day, start_time, is_booked}, ...]
  const [msg, setMsg] = useState("");

  // load slots when doctor/date changes
  useEffect(() => {
    const did = Number(doctorId);
    if (!did || !ISO.test(date)) { setSlots([]); return; }
    api.get(`/admins/public/doctors/${did}/slots`, { params: { day: date } })
      .then(({ data }) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setSlots([]));
  }, [doctorId, date]);

  const title = isReschedule ? "Reschedule appointment" : "Book appointment";
  const cta   = isReschedule ? "Confirm Reschedule"     : "Confirm Booking";
  const canSubmit =
    ISO.test(date) &&
    HHMM.test(time) &&
    (isReschedule || (Number(doctorId) > 0));

  function findSelectedSlotId() {
    // input[type=time] gives "HH:MM"; DB has "HH:MM:00"
    const hhmm = String(time).slice(0, 5);
    const s = slots.find(x => String(x.start_time || x.time).slice(0,5) === hhmm);
    return s?.id;
  }

  async function submit() {
    setMsg("");
    if (!ISO.test(date)) { setMsg("Pick a valid date (YYYY-MM-DD)."); return; }
    if (!HHMM.test(time)) { setMsg("Pick a valid time (HH:MM 24h)."); return; }
    if (!isReschedule && !(Number(doctorId) > 0)) { setMsg("Doctor ID is required."); return; }

    try {
      if (isReschedule) {
        const sid = findSelectedSlotId();
        if (!sid) { setMsg("Selected time is not an available slot."); return; }
        await api.put(`/patients/appointments/${rescheduleId}/reschedule`, {
          doctor_id: Number(doctorId),
          slot_id: sid,
        });
      } else {
        const sid = findSelectedSlotId(); // optional
        await api.post(`/patients/appointments`, {
          doctor_id: Number(doctorId),
          date,             // backend expects 'date'
          time,             // "HH:MM"
          slot_id: sid,     // optional; backend will still verify availability
        });
      }
      navigate("/patient/appointments?tab=active", { replace: true });
    } catch (e) {
      setMsg(e?.response?.data?.message || "Failed");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>{title}</h2>

      {msg && <div style={{ color: "#b00", marginBottom: 8 }}>{msg}</div>}

      {!isReschedule && (
        <div style={{ marginBottom: 10 }}>
          <label>
            Doctor ID:&nbsp;
            <input
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </label>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label>Date:&nbsp;
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label>Time:&nbsp;
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => navigate(-1)} type="button">Cancel</button>
        <button onClick={submit} disabled={!canSubmit}>{cta}</button>
      </div>
    </div>
  );
}
