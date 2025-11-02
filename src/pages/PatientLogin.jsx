import { useState, useEffect, useMemo } from "react";
import { apiPublic } from "../api"; // use the public client
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_BASE as API } from "../config";

export default function PatientLogin() {
  const location = useLocation();
  const navigate = useNavigate();

  // Prefill from query (nice UX if you later send links like /patient/login?email=foo@bar)
  const initialEmail = useMemo(() => {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get("email") || "";
    } catch {
      return "";
    }
  }, []);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Wipe password if component remounts (avoid stale value)
  useEffect(() => setPassword(""), []);

  // Where to go after login (e.g. /book/:doctorId), or fallback to profile
  const destAfterLogin = (() => {
    const sp = new URLSearchParams(location.search);
    const next = sp.get("next");
    if (next && next !== "/patient/login") return next;
    return (
      location.state?.from?.pathname ||
      location.state?.from ||
      "/patient/Home"   //  default page after patient login
    );
  })()

  // Simplified email/password guards (avoid empty submissions)
  const formValid = email.trim().length > 3 && password.length >= 4;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formValid || loading) return;

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
       const { data } = await apiPublic.post(`/patients/login`, {
        email: email.trim(),
        password,
      });

      const { token, patient, message } = data || {};
      if (!token) throw new Error("No token returned from server");

      // Storage: remember -> localStorage, otherwise sessionStorage
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("patientToken", token);
      storage.setItem("patient", JSON.stringify(patient || {}));
        // ensure token doesn't live in both storages
      (remember ? sessionStorage : localStorage).removeItem("patientToken");
      (remember ? sessionStorage : localStorage).removeItem("patient");

      // Broadcast so other tabs / components can react
      window.dispatchEvent(new Event("authchange"));

      setMsg({ type: "success", text: message || "Login successful" });

      // Navigate back to where the user was heading (booking page), or profile
      navigate(destAfterLogin, { replace: true });
    } catch (err) {
      // Normalize server/client errors
      const text =
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please try again.";
      setMsg({ type: "error", text });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageWrap} role="main" aria-label="Patient login page">
      <div style={card}>
        <h1 style={brand} aria-label="ClinicHub">ClinicHub</h1>
        <h2 style={title}>Patient Login</h2>

        {/* Contextual notice: why we’re here */}
        <p style={subtle}>
          {location.state?.from
            ? "Please log in to continue booking your appointment."
            : "Log in to access your patient portal."}
        </p>

        {msg.text ? (
          <div
            role="alert"
            style={{
              ...banner,
              background: msg.type === "error" ? "#fde2e1" : "#e6faea",
              color: "#222",
              border: `1px solid ${msg.type === "error" ? "#f2a29f" : "#b7e3c7"}`,
            }}
          >
            {msg.text}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <label style={label} htmlFor="email">Email</label>
          <input
            id="email"
            style={input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ""))}
            autoComplete="email"
            placeholder="you@example.com"
            required
            inputMode="email"
          />

          <label style={label} htmlFor="password">Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              style={input}
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Your password"
              required
              aria-label="Password"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              style={eyeBtn}
              aria-pressed={showPwd}
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>

          <label style={rememberRow}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span style={{ color: "#555", fontSize: 13 }}>Stay signed in on this device</span>
          </label>

          <button
            type="submit"
            style={{ ...button, opacity: loading || !formValid ? 0.7 : 1 }}
            disabled={loading || !formValid}
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p style={footText}>
          Don’t have an account?{" "}
          <Link
            to="/patient/register"
            style={link}
            state={location.state?.from ? { from: location.state.from } : undefined}
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ——— minimal, neutral inline styles (keeps file self-contained) ——— */
const pageWrap = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  background: "linear-gradient(to bottom, #f8f9fa, #f1f1f1)",
  padding: 16,
};
const card = {
  width: 380,
  maxWidth: "92vw",
  background: "#fff",
  padding: 28,
  borderRadius: 12,
  boxShadow: "0 12px 28px rgba(16,24,40,.10)",
};
const brand = { textAlign: "center", color: "#0B5CF0", margin: 0, fontWeight: 800, fontSize: 22 };
const title = { textAlign: "center", margin: "10px 0 6px", fontWeight: 700, fontSize: 18 };
const subtle = { textAlign: "center", marginBottom: 16, color: "#667085" };
const banner = { padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: 14 };
const label = { fontSize: 13, color: "#344054", margin: "6px 0" };
const input = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #D0D5DD",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
};
const eyeBtn = {
  position: "absolute",
  right: 8,
  top: 7,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "#0B5CF0",
  fontWeight: 600,
};
const rememberRow = { display: "flex", gap: 8, alignItems: "center", margin: "10px 0 16px" };
const button = {
  width: "100%",
  padding: 12,
  background: "#0B5CF0",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 6,
};
const footText = { textAlign: "center", marginTop: 14, fontSize: 14, color: "#555" };
const link = { color: "#0B5CF0", textDecoration: "none", fontWeight: 600 };
