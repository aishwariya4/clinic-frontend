// src/components/DoctorLogin.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiPublic } from "../api"; // unauthenticated axios client (baseURL = API_BASE)

export default function DoctorLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      // POST /api/doctors/login  ->  { token, doctor }
      const { data } = await apiPublic.post("/doctors/login", {
        email: form.email.trim(),
        password: form.password,
      });

      // Persist auth for doctor role
      localStorage.setItem("doctorUser", JSON.stringify(data?.doctor || {}));
      localStorage.setItem("doctorToken", data?.token || "");

      // Notify any listeners (api.js interceptors listen for this)
      window.dispatchEvent(new Event("authchange"));

      // Redirect to ?next=... if present, else dashboard
      const params = new URLSearchParams(location.search);
      const next = params.get("next");
      navigate(next || "/doctor/dashboard", { replace: true });
    } catch (err) {
      setMsg(
        err?.response?.data?.message ||
          err?.normalized?.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrapStyle}>
      <form onSubmit={onSubmit} style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Doctor Login</h2>

        {msg ? (
          <div style={errStyle}>{msg}</div>
        ) : (
          <p style={{ color: "#666", marginTop: 0 }}>
            Sign in with your email and password.
          </p>
        )}

        <label style={labelStyle}>Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={onChange}
          placeholder="you@example.com"
          required
          style={inputStyle}
        />

        <label style={labelStyle}>Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={onChange}
          placeholder="********"
          required
          style={inputStyle}
        />

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

/* ---------- inline styles (kept simple) ---------- */
const wrapStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#f7f8fb",
  padding: 16,
};
const cardStyle = {
  width: 360,
  maxWidth: "100%",
  background: "#fff",
  border: "1px solid #e6e9f3",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
};
const labelStyle = { display: "block", marginTop: 12, fontWeight: 600 };
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d7dfee",
  outline: "none",
  marginTop: 6,
};
const buttonStyle = {
  width: "100%",
  padding: "12px",
  marginTop: 18,
  backgroundColor: "#0047ab",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  cursor: "pointer",
};
const errStyle = {
  background: "#ffe9ea",
  color: "#b00020",
  border: "1px solid #ffd0d3",
  borderRadius: 8,
  padding: "8px 10px",
  margin: "4px 0 8px",
};
