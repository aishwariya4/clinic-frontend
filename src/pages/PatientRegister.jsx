import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE as API } from "../config";

/* ---------- helpers ---------- */
const onlyLetters = (v) => /^[A-Za-z]+$/.test(v);
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const pwdOk = (v) =>
  v.length >= 8 &&
  v.length <= 11 &&
  /[A-Z]/.test(v) &&
  /[a-z]/.test(v) &&
  /\d/.test(v); // 8–11, must include upper/lower/number

export default function PatientRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
    accept: true,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [touched, setTouched] = useState({});

  /* ---------- validation ---------- */
  const errors = {
    firstName:
      !form.firstName.trim()
        ? "First name is required"
        : !onlyLetters(form.firstName)
        ? "First name must contain letters only"
        : "",
    lastName:
      !form.lastName.trim()
        ? "Surname is required"
        : !onlyLetters(form.lastName)
        ? "Surname must contain letters only"
        : "",
    email: !form.email ? "Email is required" : !emailOk(form.email) ? "Enter a valid email" : "",
    password:
      !form.password
        ? "Password is required"
        : !pwdOk(form.password)
        ? "Password must be 8–11 chars and include upper, lower, and a number"
        : "",
    confirm:
      !form.confirm
        ? "Please confirm your password"
        : form.confirm !== form.password
        ? "Passwords do not match"
        : "",
    accept: !form.accept ? "You must accept the terms" : "",
  };
  const hasErrors = Object.values(errors).some(Boolean);

  /* ---------- handlers ---------- */
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "firstName" || name === "lastName") {
      const lettersOnly = value.replace(/[^A-Za-z]/g, "");
      setForm((f) => ({ ...f, [name]: lettersOnly }));
      return;
    }
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirm: true,
      accept: true,
    });
    if (hasErrors) return;

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const { data } = await axios.post(`${API}/patients/register`, {
        name,
        email: form.email.trim(),
        password: form.password,
      });

      setMsg({ type: "success", text: data?.message || "Registered successfully" });
      setTimeout(() => navigate("/patient/login", { state: { registeredEmail: form.email } }), 700);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Registration failed" });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div style={pageWrap}>
      <div style={card}>
        <h2 style={brand}>ClinicHub</h2>
        <h3 style={title}>Create Account</h3>
        <p style={subtle}>Please sign up to book your appointment</p>

        {msg.text ? (
          <div style={{ ...banner, background: msg.type === "error" ? "#fde2e1" : "#e6faea", color: "#222" }}>
            {msg.text}
          </div>
        ) : null}

        <form onSubmit={onSubmit} noValidate>
          {/* First + Surname */}
          <div style={{ display: "grid", gap: 10 }}>
            <input
              style={input}
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={onChange}
              onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
              autoComplete="given-name"
              placeholder="First Name"
              aria-label="First Name"
              required
            />
            {touched.firstName && errors.firstName && <div style={errText}>{errors.firstName}</div>}

            <input
              style={input}
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={onChange}
              onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
              autoComplete="family-name"
              placeholder="Surname"
              aria-label="Surname"
              required
            />
            {touched.lastName && errors.lastName && <div style={errText}>{errors.lastName}</div>}
          </div>

          {/* Email */}
          <div style={{ marginTop: 10 }}>
            <input
              style={input}
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              autoComplete="email"
              placeholder="Email"
              aria-label="Email"
              required
            />
            {touched.email && errors.email && <div style={errText}>{errors.email}</div>}
          </div>

          {/* Password */}
          <div style={{ marginTop: 10, position: "relative" }}>
            <input
              style={input}
              type={showPwd ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={onChange}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="new-password"
              placeholder="Password (8–11 chars)"
              aria-label="Password"
              minLength={8}
              maxLength={11}
              required
            />
            <button type="button" onClick={() => setShowPwd((s) => !s)} style={eyeBtn}>
              {showPwd ? "Hide" : "Show"}
            </button>
            <small style={hint}>Must include uppercase, lowercase, and a number.</small>
            {touched.password && errors.password && <div style={errText}>{errors.password}</div>}
          </div>

          {/* Confirm Password */}
          <div style={{ marginTop: 10, position: "relative" }}>
            <input
              style={input}
              type={showConfirm ? "text" : "password"}
              name="confirm"
              value={form.confirm}
              onChange={onChange}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              autoComplete="new-password"
              placeholder="Confirm Password"
              aria-label="Confirm Password"
              minLength={8}
              maxLength={11}
              required
            />
            <button type="button" onClick={() => setShowConfirm((s) => !s)} style={eyeBtn}>
              {showConfirm ? "Hide" : "Show"}
            </button>
            {touched.confirm && errors.confirm && <div style={errText}>{errors.confirm}</div>}
          </div>

          {/* Terms */}
          <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0 14px" }}>
            <input type="checkbox" name="accept" checked={form.accept} onChange={onChange} />
            <span style={{ color: "#555", fontSize: 13 }}>I agree to the terms & privacy policy</span>
          </label>
          {touched.accept && errors.accept && <div style={errText}>{errors.accept}</div>}

          <button
            type="submit"
            style={{ ...button, opacity: loading || hasErrors ? 0.8 : 1 }}
            disabled={loading || hasErrors}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p style={footText}>
          Already have an account?{" "}
          <Link to="/patient/login" style={link}>
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}

/* styles (polished minimal) */
const pageWrap = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  background: "linear-gradient(to bottom, #f8f9fa, #f1f1f1)",
};
const card = {
  width: 360,
  background: "#fff",
  padding: 28,
  borderRadius: 12,
  boxShadow: "0 10px 26px rgba(16,24,40,.10)",
};
const brand = { textAlign: "center", color: "#0066ff", margin: 0, fontWeight: 800 };
const title = { textAlign: "center", margin: "10px 0 6px", fontWeight: 800 };
const subtle = { textAlign: "center", marginBottom: 16, color: "#667085" };
const banner = { padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: 14 };
const input = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #D0D5DD",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  background: "#fff",
};
const eyeBtn = {
  position: "absolute",
  right: 10,
  top: 10,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "#0066ff",
  fontWeight: 700,
};
const hint = { display: "block", color: "#6b7280", fontSize: 12, marginTop: 6 };
const errText = { color: "#dc2626", fontSize: 12, marginTop: 6 };
const button = {
  width: "100%",
  padding: 12,
  background: "0066ff",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 8,
};
const footText = { textAlign: "center", marginTop: 14, fontSize: 14, color: "#555" };
const link = { color: "0066ff", textDecoration: "none", fontWeight: 700 };
