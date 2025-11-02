// src/components/DoctorRegister.jsx
import { doctorApi } from "../api";
import { useState } from "react";


function DoctorRegister() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    specialization: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      // ✅ no hardcode: uses API from config
     const res = await doctorApi.post(`/doctors/register`, form);

      setMessage(res.data?.message || "✅ Registered successfully");
      setForm({ name: "", email: "", specialization: "", password: "" });
    } catch (err) {
      setMessage(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "linear-gradient(to bottom, #e0f0ff, #f0f4f8)",
      height: "100vh", display: "flex", justifyContent: "center", alignItems: "center"
    }}>
      <div style={{
        background: "#fff", padding: 40, borderRadius: 12,
        boxShadow: "0 8px 20px rgba(0,0,0,0.1)", width: "100%", maxWidth: 450
      }}>
        <h2 style={{ textAlign: "center", color: "#004080", marginBottom: 20 }}>
          Doctor Registration
        </h2>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Name:</label>
          <input type="text" name="name" value={form.name}
                 onChange={handleChange} required style={inputStyle} />

          <label style={labelStyle}>Email:</label>
          <input type="email" name="email" value={form.email}
                 onChange={handleChange} required style={inputStyle} />

          <label style={labelStyle}>Specialization:</label>
          <input type="text" name="specialization" value={form.specialization}
                 onChange={handleChange} required style={inputStyle} />

          <label style={labelStyle}>Password:</label>
          <input type="password" name="password" value={form.password}
                 onChange={handleChange} required style={inputStyle} />

          <button type="submit" style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        {message && (
          <p style={{
            marginTop: 15, textAlign: "center",
            color: /failed|exist|error|invalid/i.test(message) ? "red" : "green"
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: "block", marginTop: 10, fontWeight: "bold", color: "#333" };
const inputStyle = {
  width: "100%", padding: 10, marginTop: 5, borderRadius: 6, border: "1px solid #ccc", marginBottom: 10
};
const buttonStyle = {
  width: "100%", padding: 12, marginTop: 20, backgroundColor: "#004080",
  color: "#fff", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer"
};

export default DoctorRegister;
