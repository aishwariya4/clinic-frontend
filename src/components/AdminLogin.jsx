import axios from "axios";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/admins/login", { email, password });
      localStorage.setItem("adminToken", res.data.token);
      if (res.data.admin) localStorage.setItem("adminUser", JSON.stringify(res.data.admin));
      navigate("/admin/dashboard", { replace: true });
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#eef5ff,#f7f9fc)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 12px 30px rgba(0,0,0,.08)",
        padding: 28
      }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#0b3a75", letterSpacing: 0.4 }}>
            ClinicHub <span style={{ color: "#1e5bb8" }}>Admin</span>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
            Sign in to manage doctors, patients, and activity.
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            style={{
              width: "100%", marginTop: 6, marginBottom: 14, padding: "11px 12px",
              borderRadius: 10, border: "1px solid #d1d5db", outline: "none"
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Password</label>
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              style={{ border: "none", background: "transparent", color: "#1e40af", fontSize: 12, cursor: "pointer" }}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
          <input
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{
              width: "100%", marginTop: 6, marginBottom: 8, padding: "11px 12px",
              borderRadius: 10, border: "1px solid #d1d5db", outline: "none"
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
              <input type="checkbox" checked={remember} onChange={() => setRemember(v => !v)} />
              Remember me
            </label>
            <Link to="/forgot-password" style={{ fontSize: 12, color: "#1e40af", textDecoration: "none" }}>
              Forgot password?
            </Link>
          </div>

          {error && <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", marginTop: 16, padding: "12px 14px",
              background: "#143F79", color: "white", fontWeight: 700,
              border: "none", borderRadius: 10, cursor: "pointer", opacity: loading ? 0.8 : 1
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 12, color: "#6b7280", textAlign: "center" }}>
          Not an admin?{" "}
          <a href="/login" style={{ color: "#1e40af", textDecoration: "none" }}>Patient/Doctor login</a>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
          Security tip: Do not share your credentials. Enable 2-factor authentication in Settings later.
        </div>
      </div>
    </div>
  );
}
