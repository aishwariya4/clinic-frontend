import { Navigate, useLocation } from "react-router-dom";

export default function PatientPrivateRoute({ children }) {
  const token =
    localStorage.getItem("patientToken") ||
    sessionStorage.getItem("patientToken");
  const location = useLocation();

  return token
    ? children
    : <Navigate to="/patient/login" replace state={{ from: location }} />;
}
