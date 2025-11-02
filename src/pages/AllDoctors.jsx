// pages/AllDoctors.jsx
import axios from "axios";
import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import doctorImage from "../assets/doctors.png";
import { API_BASE } from "../config";

const api = axios.create({ baseURL: API_BASE, withCredentials: true });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("patientToken") || sessionStorage.getItem("patientToken");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

/* ------------------------- helpers ------------------------- */
function todayYMD() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function formatTimeLabel(hhmm) {
  const [h, m] = String(hhmm).split(":").map((x) => parseInt(x, 10));
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}
function getPatientToken() {
  return localStorage.getItem("patientToken") || sessionStorage.getItem("patientToken");
}

/* ----------------------- page component -------------------- */
export default function AllDoctors() {
  const navigate = useNavigate();
  const location = useLocation();
  const qs = new URLSearchParams(location.search);

  // /doctors?reschedule=1&apptId=27&doctorId=11&date=2025-10-23
  const rescheduleId = qs.get("apptId") || qs.get("reschedule");
  const origDoctorId = qs.get("origDoctorId") || qs.get("doctorId");
  const doctorIdParam = qs.get("doctorId");
  const dateParam = qs.get("date");
  const isReschedule = Boolean(rescheduleId);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // modal state
  const [open, setOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // availability
  const [availableDates, setAvailableDates] = useState(new Set());
  const [viewYearMonth, setViewYearMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [timeSlotsForDate, setTimeSlotsForDate] = useState([]); // [{ id, start_time, is_booked }]
  const [selectedTime, setSelectedTime] = useState("");

  // my waitlist entries for selected doctor+day: { "HH:MM": "queued" | "offered" }
  const [myWaitlistByTime, setMyWaitlistByTime] = useState({});

  // whether THIS patient has any active appt with the selected doctor (for hiding waitlist button globally)
  const [hasActiveWithSelectedDoctor, setHasActiveWithSelectedDoctor] = useState(false);
  // which times on the selected day are booked by THIS patient (["09:00","09:30"])
  const [myBookedTimesForDay, setMyBookedTimesForDay] = useState([]);

  /* load doctors */
  useEffect(() => {
    api
      .get("/doctors/approved-public", { params: { q: "" } })
      .then((res) => setDoctors(Array.isArray(res.data) ? res.data : []))
      .catch(() => setDoctors([]));
  }, []);

  /* my waitlist for doctor+date */
  async function loadMyWaitlistForDay(docId, isoDate) {
    if (!docId || !isoDate) {
      setMyWaitlistByTime({});
      return;
    }
    try {
      const { data } = await api.get("/patients/waitlist/my");
      const map = {};
      (Array.isArray(data) ? data : []).forEach((r) => {
        const st = String(r?.status || "");
        if (
          Number(r?.doctor_id) === Number(docId) &&
          String(r?.date) === String(isoDate) &&
          (st === "queued" || st === "offered")
        ) {
          const t = String(r?.time || "").slice(0, 5);
          if (t) map[t] = st;
        }
      });
      setMyWaitlistByTime(map);
    } catch {
      setMyWaitlistByTime({});
    }
  }
  const joinedStateFor = (t) => myWaitlistByTime[String(t || "").slice(0, 5)];

  /* load "my active with this doc" AND "my own booked times for this day" using existing route */
  async function loadMyDoctorDayUsingExistingRoute(docId, isoDate) {
    if (!docId) {
      setHasActiveWithSelectedDoctor(false);
      setMyBookedTimesForDay([]);
      return;
    }
    try {
      // existing route: /patients/me/appointments (optionally with status filter)
      const { data } = await api.get("/patients/me/appointments", {
        params: { status: "booked,rescheduled" },
      });
      const list = Array.isArray(data) ? data : [];

      // any active with this doc (for hiding waitlist button)
      const hasActive = list.some((a) => Number(a?.doctor_id) === Number(docId));
      setHasActiveWithSelectedDoctor(hasActive);

      // my times for THIS doc & THIS date (for per-slot message)
      if (isoDate) {
        const mineToday = list
          .filter(
            (a) =>
              Number(a?.doctor_id) === Number(docId) &&
              String(a?.date).slice(0, 10) === String(isoDate)
          )
          .map((a) => String(a?.time || a?.start_time || "").slice(0, 5))
          .filter(Boolean);
        setMyBookedTimesForDay(mineToday);
      } else {
        setMyBookedTimesForDay([]);
      }
    } catch {
      setHasActiveWithSelectedDoctor(false);
      setMyBookedTimesForDay([]);
    }
  }

  /* open modal and load available days + my state */
  const openBooking = async (doc) => {
    if (!getPatientToken()) {
      navigate("/patient/login", {
        replace: false,
        state: { from: location, intended: { doctorId: doc.id } },
      });
      return;
    }

    setSelectedDoctor(doc);
    setSelectedDate("");
    setSelectedTime("");
    setTimeSlotsForDate([]);
    setAvailableDates(new Set());
    setMyWaitlistByTime({});
    setHasActiveWithSelectedDoctor(false);
    setMyBookedTimesForDay([]);
    setOpen(true);

    try {
      // active status with this doctor
      await loadMyDoctorDayUsingExistingRoute(doc.id, null);

      const { data } = await api.get(`/admins/public/doctors/${doc.id}/days`);
      const raw = Array.isArray(data) ? data : [];

      const today = todayYMD();
      const future = raw
        .map((d) => String(d).slice(0, 10))
        .filter((d) => d >= today)
        .sort();

      setAvailableDates(new Set(future));

      const base = future[0] || today;
      const [yy, mm] = base.split("-").map(Number);
      setViewYearMonth({ year: yy, month: (mm || 1) - 1 });

      if (future.length) {
        const pick = dateParam && future.includes(dateParam) ? dateParam : base;
        setSelectedDate(pick);
        await loadMyWaitlistForDay(doc.id, pick);
        await loadMyDoctorDayUsingExistingRoute(doc.id, pick);
      }
    } catch {
      setAvailableDates(new Set());
      const t = new Date();
      setViewYearMonth({ year: t.getFullYear(), month: t.getMonth() });
    }
  };

  /* auto-open when query contains doctor id */
  useEffect(() => {
    if (!doctors.length) return;
    const idToOpen = origDoctorId || doctorIdParam;
    if (!idToOpen) return;
    const doc = doctors.find((d) => String(d.id) === String(idToOpen));
    if (doc) openBooking(doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors, origDoctorId, doctorIdParam]);

  /* close modal */
  const closeBooking = () => {
    setOpen(false);
    setSelectedDoctor(null);
    setSelectedDate("");
    setSelectedTime("");
    setAvailableDates(new Set());
    setTimeSlotsForDate([]);
    setMyWaitlistByTime({});
    setHasActiveWithSelectedDoctor(false);
    setMyBookedTimesForDay([]);
    setLoadingSlots(false);
  };

  /* load slots for selected date + refresh my state */
  useEffect(() => {
    let alive = true;
    setTimeSlotsForDate([]);
    setSelectedTime("");
    if (!selectedDoctor || !selectedDate)
      return () => {
        alive = false;
      };

    // refresh my waitlist + my own bookings for the selected doctor/day
    loadMyWaitlistForDay(selectedDoctor.id, selectedDate);
    loadMyDoctorDayUsingExistingRoute(selectedDoctor.id, selectedDate);

    (async () => {
      try {
        setLoadingSlots(true);
        const { data } = await api.get(
          `/doctors/${selectedDoctor.id}/time-slots`,
          { params: { day: selectedDate } }
        );
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setTimeSlotsForDate(list);

        const firstFree = list.find((s) => !Boolean(s?.is_booked));
        if (firstFree) {
          const start = firstFree?.start_time ?? firstFree?.start ?? firstFree;
          const t = String(start || "").slice(0, 5);
          if (t) setSelectedTime(t);
        }
      } catch {
        setTimeSlotsForDate([]);
      } finally {
        if (alive) setLoadingSlots(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedDoctor, selectedDate]);

  async function joinWaitlist(t) {
    // UI guard (server also blocks)
    if (hasActiveWithSelectedDoctor) {
      alert("You already have an active appointment with this doctor. Please reschedule or cancel instead of joining the waitlist.");
      return;
    }
    if (isReschedule) {
      alert("You already have an appointment with this doctor. Use reschedule instead of waitlist.");
      return;
    }
    if (!selectedDoctor || !selectedDate) return;
    if (!getPatientToken()) {
      navigate("/patient/login", { replace: false, state: { from: location } });
      return;
    }
    try {
      const { data } = await api.post("/patients/waitlist", {
        doctor_id: selectedDoctor.id,
        date: selectedDate,
        time: t,
      });
      alert(data?.message || "Added to waitlist.");
      setMyWaitlistByTime((prev) => ({ ...prev, [String(t).slice(0, 5)]: "queued" }));
    } catch (e) {
      alert(e?.response?.data?.message || "Could not join waitlist.");
    }
  }

  /* confirm booking or reschedule */
  const confirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;

    if (!getPatientToken()) {
      navigate("/patient/login", {
        replace: false,
        state: { from: location, intended: { path: "/doctors" } },
      });
      return;
    }

    try {
      if (isReschedule) {
        if (!origDoctorId || String(selectedDoctor.id) !== String(origDoctorId)) {
          alert("Reschedule is limited to the original doctor.");
          return;
        }
        const selectedSlot = timeSlotsForDate.find(
          (s) => String((s?.start_time ?? s?.start ?? "")).slice(0, 5) === selectedTime
        );
        const selectedSlotId = selectedSlot?.id;
        if (!selectedSlotId) {
          alert("Selected time is not an available slot.");
          return;
        }
        try {
          await api.put(`/patients/appointments/${rescheduleId}/reschedule`, {
            doctor_id: selectedDoctor.id,
            slot_id: selectedSlotId,
          });
        } catch (e) {
          alert(e?.response?.data?.message || "Could not reschedule. Your current booking remains unchanged.");
          return;
        }
      } else {
        // normal booking (server prevents double-booking with same doc)
        await api.post("/patients/appointments", {
          doctor_id: selectedDoctor.id,
          date: selectedDate,
          time: selectedTime,
        });
      }

      try {
        const { data: refreshed } = await api.get(
          `/doctors/${selectedDoctor.id}/time-slots`,
          { params: { day: selectedDate } }
        );
        setTimeSlotsForDate(Array.isArray(refreshed) ? refreshed : []);
      } catch {}

      closeBooking();
      navigate("/patient/appointments?tab=active", { replace: true });
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to book. Please try another slot.");
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const name = (doc?.name || "").toLowerCase();
    const spec = (doc?.specialization || "").toLowerCase();
    const term = (searchTerm || "").toLowerCase();
    return name.includes(term) || spec.includes(term);
  });

  return (
    <>
      <style>{`
        .doctors-wrap {
          background: #f8fafc;
          min-height: 100vh;
          padding: 40px 0;
        }
        
        .doctors-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        .doctors-header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .doctors-header h2 {
          font-size: clamp(32px, 4vw, 48px);
          font-weight: 100;
          color: #0f172a;
          margin: 0 0 50px;
          letter-spacing: -0.5px;
        }
        
        .doctors-header p {
          color: #667085;
          font-size: 18px;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto;
        }
        
        .reschedule-banner {
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
          border: 1px solid #c7d2fe;
          border-radius: 12px;
          padding: 16px 20px;
          margin: 24px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .reschedule-banner::before {
          content: "🔄";
          font-size: 20px;
        }
        
        .search-container {
          display: flex;
          justify-content: center;
          margin-bottom: 40px;
        }
        
        .search-input {
          padding: 14px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          width: 100%;
          max-width: 500px;
          background: white;
          transition: all 0.3s ease;
        }
        
        .search-input:focus {
          outline: none;
          border-color: #4B4BFF;
          box-shadow: 0 0 0 3px rgba(75, 75, 255, 0.1);
        }
        
        .doctors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }
        
        .doctor-card {
          background: white;
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 8px 30px rgba(16, 24, 40, 0.08);
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        
        .doctor-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(16, 24, 40, 0.12);
        }
        
        .doctor-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }
        
        .doctor-info {
          padding: 24px;
        }
        
        .doctor-name {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px;
        }
        
        .doctor-specialization {
          color: #4B4BFF;
          font-weight: 600;
          margin: 0 0 16px;
          font-size: 16px;
        }
        
        .availability-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f0f9ff;
          color: #0369a1;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        
        .availability-badge::before {
          content: "●";
          font-size: 12px;
        }
        
        .book-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #4B4BFF, #0066FF);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .book-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(75, 75, 255, 0.3);
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #667085;
        }
        
        .empty-state h3 {
          font-size: 20px;
          margin: 0 0 8px;
          color: #0f172a;
        }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        
        .modal-content {
          background: white;
          border-radius: 20px;
          padding: 32px;
          width: min(920px, 96vw);
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          position: relative;
        }
        
        .modal-close {
          position: absolute;
          right: 20px;
          top: 20px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 20px;
          transition: all 0.2s ease;
        }
        
        .modal-close:hover {
          background: #4B4BFF;
          color: white;
        }
        
        .modal-header {
          margin-bottom: 24px;
        }
        
        .modal-header h3 {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px;
        }
        
        .modal-subtitle {
          color: #4B4BFF;
          font-weight: 600;
          font-size: 16px;
          margin: 0;
        }
        
        .booking-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          align-items: start;
        }
        
        .date-section, .time-section {
          background: #f8fafc;
          border-radius: 16px;
          padding: 24px;
        }
        
        .section-title {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 16px;
          font-size: 18px;
        }
        
        .time-slots-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .time-slot {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .slot-btn {
          flex: 1;
          padding: 14px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .slot-btn:hover:not(:disabled) {
          border-color: #4B4BFF;
          background: #f0f4ff;
        }
        
        .slot-btn.selected {
          border-color: #4B4BFF;
          background: #e0e7ff;
          color: #4B4BFF;
        }
        
        .slot-btn:disabled {
          background: #f8fafc;
          color: #94a3b8;
          cursor: not-allowed;
        }
        
        .slot-status {
          font-size: 12px;
          font-weight: 600;
        }
        
        .my-booking {
          color: #166534;
        }
        
        .booked-other {
          color: #dc2626;
        }
        
        .waitlist-btn {
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        
        .waitlist-btn:hover {
          border-color: #4B4BFF;
          background: #f0f4ff;
        }
        
        .waitlist-btn:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }
        
        .waitlist-joined {
          background: #e0e7ff;
          color: #4B4BFF;
          border-color: #c7d2fe;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }
        
        .cancel-btn {
          padding: 12px 24px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .cancel-btn:hover {
          border-color: #94a3b8;
          background: #f8fafc;
        }
        
        .confirm-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #4B4BFF, #0066FF);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .confirm-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(75, 75, 255, 0.3);
        }
        
        .confirm-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .loading-text {
          color: #64748b;
          font-style: italic;
          text-align: center;
          padding: 20px;
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
          .booking-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
        
        @media (max-width: 768px) {
          .doctors-wrap {
            padding: 24px 0;
          }
          
          .doctors-grid {
            grid-template-columns: 1fr;
          }
          
          .modal-content {
            padding: 24px;
          }
          
          .time-slot {
            flex-direction: column;
            align-items: stretch;
          }
          
          .waitlist-btn {
            width: 100%;
          }
        }
        
        @media (max-width: 480px) {
          .modal-actions {
            flex-direction: column;
          }
          
          .cancel-btn, .confirm-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="doctors-wrap">
        <div className="doctors-container">
          <div className="doctors-header">
            
            
          </div>

          {isReschedule && (
            <div className="reschedule-banner">
              Rescheduling an existing appointment. Pick a slot with the same doctor.
            </div>
          )}

          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="doctors-grid">
            {filteredDoctors.length === 0 ? (
              <div className="empty-state">
                <h3>No doctors found</h3>
                <p>Try adjusting your search terms or check back later for new doctors</p>
              </div>
            ) : (
              filteredDoctors.map((doc) => (
                <div key={doc.id} className="doctor-card">
                  <img
                    src={doctorImage}
                    alt="Doctor"
                    className="doctor-image"
                  />
                  <div className="doctor-info">
                    <h3 className="doctor-name">{doc.name}</h3>
                    <p className="doctor-specialization">{doc.specialization}</p>
                    <div className="availability-badge">Available for appointments</div>
                    <button
                      onClick={() => openBooking(doc)}
                      className="book-btn"
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {open && selectedDoctor && (
            <Modal onClose={closeBooking}>
              <div className="modal-content">
                <button className="modal-close" onClick={closeBooking}>×</button>
                
                <div className="modal-header">
                  <h3>
                    {isReschedule ? "Reschedule Appointment" : "Book Appointment"}
                  </h3>
                  <p className="modal-subtitle">{selectedDoctor.specialization}</p>
                </div>

                <div className="booking-layout">
                  {/* Calendar Section */}
                  <div className="date-section">
                    <div className="section-title">SELECT DATE</div>
                    <SmallCalendar
                      year={viewYearMonth.year}
                      month={viewYearMonth.month}
                      availableDates={availableDates}
                      onChangeMonth={(y, m) => setViewYearMonth({ year: y, month: m })}
                      value={selectedDate}
                      onChange={(isoDate) => setSelectedDate(isoDate)}
                    />
                  </div>

                  {/* Time Slots Section */}
                  <div className="time-section">
                    <div className="section-title">SELECT TIME</div>
                    {!selectedDate ? (
                      <div className="loading-text">Please select an available date</div>
                    ) : loadingSlots ? (
                      <div className="loading-text">Loading available times…</div>
                    ) : timeSlotsForDate.length === 0 ? (
                      <div className="loading-text">No time slots available for this date</div>
                    ) : (
                      <div className="time-slots-grid">
                        {timeSlotsForDate.map((s) => {
                          const start = s?.start_time ?? s?.start ?? s;
                          const t = String(start || "").slice(0, 5);
                          const isBooked = Boolean(s?.is_booked);
                          const active = selectedTime === t;
                          const joined = joinedStateFor(t);
                          const isMyBooked = myBookedTimesForDay.includes(t);

                          return (
                            <div key={s?.id ?? t} className="time-slot">
                              <button
                                disabled={isBooked}
                                onClick={() => !isBooked && setSelectedTime(t)}
                                className={`slot-btn ${active ? 'selected' : ''}`}
                              >
                                <span>{formatTimeLabel(t)}</span>
                                {isBooked && (
                                  <span className={`slot-status ${isMyBooked ? 'my-booking' : 'booked-other'}`}>
                                    {isMyBooked ? "Your booking" : "Booked"}
                                  </span>
                                )}
                              </button>

                              {isBooked && !isMyBooked && !isReschedule && !hasActiveWithSelectedDoctor && (
                                <button
                                  onClick={() => joinWaitlist(t)}
                                  disabled={joined}
                                  className={`waitlist-btn ${joined ? 'waitlist-joined' : ''}`}
                                >
                                  {joined === "offered" ? "Offer Pending" : joined ? "Joined" : "Waitlist"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={closeBooking} className="cancel-btn">
                    Cancel
                  </button>
                  <button
                    onClick={confirmBooking}
                    disabled={!selectedDate || !selectedTime}
                    className="confirm-btn"
                  >
                    {isReschedule ? "Confirm Reschedule" : "Confirm Booking"}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------------- SmallCalendar ---------------------- */
function SmallCalendar({ year, month, onChangeMonth, availableDates = new Set(), value, onChange }) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const header = `${first.toLocaleString(undefined, { month: "long" })} ${year}`;

  const grid = [];
  for (let i = 0; i < startDay; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);

  const cellStyle = (isAllowed, isSelected) => ({
    padding: "12px 8px",
    textAlign: "center",
    borderRadius: "10px",
    border: isSelected ? "2px solid #4B5BFF" : "1px solid #e2e8f0",
    background: isSelected ? "#e0e7ff" : isAllowed ? "#fff" : "#f8fafc",
    color: isAllowed ? "#0f172a" : "#94a3b8",
    cursor: isAllowed ? "pointer" : "not-allowed",
    userSelect: "none",
    fontWeight: "600",
    transition: "all 0.2s ease",
  });

  return (
    <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <button 
          onClick={() => {
            const d = new Date(year, month, 1);
            d.setMonth(d.getMonth() - 1);
            onChangeMonth(d.getFullYear(), d.getMonth());
          }}
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >‹</button>
        <strong style={{ fontSize: "16px", color: "#0f172a" }}>{header}</strong>
        <button 
          onClick={() => {
            const d = new Date(year, month, 1);
            d.setMonth(d.getMonth() + 1);
            onChangeMonth(d.getFullYear(), d.getMonth());
          }}
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >›</button>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(7, 1fr)", 
        gap: "8px", 
        marginBottom: "12px", 
        color: "#64748b", 
        fontSize: "12px",
        fontWeight: "600"
      }}>
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} style={{ textAlign: "center" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
        {grid.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isAllowed = availableDates.has(iso);
          const isSelected = value === iso;
          return (
            <div
              key={iso}
              style={cellStyle(isAllowed, isSelected)}
              onClick={() => isAllowed && onChange(iso)}
              title={isAllowed ? "Select date" : "No availability on this date"}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------- Modal ------------------------- */
function Modal({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
