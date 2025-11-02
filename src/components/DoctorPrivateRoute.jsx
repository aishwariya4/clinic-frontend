// src/components/DoctorPrivateRoute.jsx
import { Navigate } from "react-router-dom";

export default function DoctorPrivateRoute({ children }) {
  const doctor = localStorage.getItem("doctorUser");
  const token = localStorage.getItem("doctorToken");
  return doctor && token ? children : <Navigate to="/doctor/login" replace />;
}
