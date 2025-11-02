/* eslint-disable react-hooks/exhaustive-deps */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE as API } from "../config";



export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // hide on admin pages
  if (location.pathname.startsWith("/admin")) return null;

  // ✅ hide on real doctor area (/doctor, /doctor/...), but NOT /doctors
  const p = location.pathname;
  const inDoctorArea = p === "/doctor" || p.startsWith("/doctor/");
  if (inDoctorArea) return null;
  

  const getToken = () =>
    localStorage.getItem("patientToken") || sessionStorage.getItem("patientToken");

  const [authed, setAuthed] = useState(Boolean(getToken()));

  const patient = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("patient") || "null") ||
        JSON.parse(sessionStorage.getItem("patient") || "null")
      );
    } catch {
      return null;
    }
  }, [authed]); // re-evaluate when auth toggles (or we dispatch authchange)

  // keep axios header in sync
  useEffect(() => {
    const t = getToken();
    if (t) axios.defaults.headers.common.Authorization = `Bearer ${t}`;
    else delete axios.defaults.headers.common.Authorization;
  }, [authed]);

  // react to storage changes from other tabs/windows
  useEffect(() => {
    const onStorage = () => setAuthed(Boolean(getToken()));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // react to in-tab auth changes (custom event we fire on login/logout/delete)
  useEffect(() => {
    const onAuthChange = () => setAuthed(Boolean(getToken()));
    window.addEventListener("authchange", onAuthChange);
    return () => window.removeEventListener("authchange", onAuthChange);
  }, []);

  // also re-check when route changes (covers navigations)
  useEffect(() => {
    setAuthed(Boolean(getToken()));
  }, [location.key]);

  // Helper: save patient in the same storage as the token currently lives
  const savePatientObject = (p) => {
    const hasLocal = !!localStorage.getItem("patientToken");
    const json = JSON.stringify(p || null);
    if (hasLocal) localStorage.setItem("patient", json);
    else sessionStorage.setItem("patient", json);
  };

  // Backfill: if authed but no patient_code in cache, fetch /patients/me once
  useEffect(() => {
    const t = getToken();
    if (!t) return;

    const cached =
      JSON.parse(localStorage.getItem("patient") || "null") ||
      JSON.parse(sessionStorage.getItem("patient") || "null");

    if (cached?.patient_code) return; // already have code

    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/patients/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (cancelled || !data) return;
        // store with patient_code, fall back to numeric id if needed
        const withCode = {
          ...cached,
          ...data,
          patient_code:
            data.patient_code || (data.id != null ? `PT${String(data.id).padStart(2, "0")}` : undefined),
        };
        savePatientObject(withCode);
        // notify current tab subscribers (and re-run our useMemo)
        window.dispatchEvent(new Event("authchange"));
      } catch {
        /* ignore – navbar should not block on this */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authed]);

  const logout = () => {
    localStorage.removeItem("patientToken");
    sessionStorage.removeItem("patientToken");
    localStorage.removeItem("patient");
    sessionStorage.removeItem("patient");
    delete axios.defaults.headers.common.Authorization;
    setAuthed(false);
    window.dispatchEvent(new Event("authchange"));
    navigate("/", { replace: true });
  };

  const linkStyle = (path) => ({
    textDecoration: "none",
    color: location.pathname === path ? "#0066ff" : "#000",
    fontWeight: location.pathname === path ? "bold" : "normal",
  });

  const ctaPrimary = { backgroundColor: "#0066ff", color: "#fff", padding: "8px 16px", borderRadius: "20px", textDecoration: "none" };
  const ctaText = { color: "black", padding: "8px 12px", borderRadius: "12px", textDecoration: "none", marginRight: 6 };
  const dangerBtn = { background: "#ef4444", color: "#fff", padding: "8px 14px", borderRadius: "12px", border: "none", cursor: "pointer", marginLeft: 8 };
  const codeBadge = { marginLeft: 8, fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "#eef2ff", color: "#1e293b" };

  const firstName = patient?.name ? patient.name.split(" ")[0] : null;
  const code =
    patient?.patient_code ||
    (patient?.id != null ? `PT${String(patient.id).padStart(2, "0")}` : null);

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "15px 40px",
        borderBottom: "1px solid #ddd",
        backgroundColor: "#fff",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#040416ff" }}>ClinicHub</div>

      <div style={{ display: "flex", gap: "25px", fontSize: "16px" }}>
        <Link to="/" style={linkStyle("/")}>Home</Link>
        <Link to="/doctors" style={linkStyle("/doctors")}>All Doctors</Link>
        <Link to="/about" style={linkStyle("/about")}>About</Link>
        <Link to="/contact" style={linkStyle("/contact")}>Contact</Link>
        
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {authed ? (
          <>
            <Link to="/patient/profile" style={ctaText}>
              {firstName ? `Hi, ${firstName}` : "My profile"}
            </Link>
            {code ? <span style={codeBadge}>{code}</span> : null}

            {/* 👇 New: only visible when logged in */}
            <Link to="/patient/appointments" style={ctaPrimary}>
              My Appointments
            </Link>
            <button onClick={logout} style={dangerBtn}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/patient/login" style={ctaText}>Log in</Link>
            <Link to="/patient/register" style={ctaPrimary}>Create account</Link>
          </>
        )}
      </div>
    </nav>
  );
}
