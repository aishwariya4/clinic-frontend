import axios from "axios";
import { Suspense, useEffect } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";

// components
import DoctorPrivateRoute from "./components/DoctorPrivateRoute";
import Navbar from "./components/Navbar";
import PatientPrivateRoute from "./components/PatientPrivateRoute";
import PrivateRoute from "./components/PrivateRoute";

// pages
import AdminDashboard from "./components/AdminDashboard";
import AdminLogin from "./components/AdminLogin";
import AdminPatients from "./components/AdminPatients";
import DoctorDashboard from "./components/DoctorDashboard";
import DoctorLogin from "./components/DoctorLogin";
import DoctorRegister from "./components/DoctorRegister";
import PatientProfile from "./components/PatientProfile";
import About from "./pages/About";
import AdminDoctors from "./pages/AdminDoctors";
import AllDoctors from "./pages/AllDoctors";
import Contact from "./pages/Contact";
import HomePage from "./pages/HomePage";
import PatientLogin from "./pages/PatientLogin";
import PatientRegister from "./pages/PatientRegister";
import AdminReportsAppointments from "./pages/AdminReportsAppointments";
import AdminLayout from "./layouts/AdminLayout";
import BookAppointment from "./pages/BookAppointment";
import PatientAppointments from "./pages/PatientAppointments";
import DoctorAppointmentDetails from "./pages/DoctorAppointmentDetails";

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Route-aware Authorization header (ensures correct role token is sent)
function RoleAwareAuthHeader() {
  const { pathname } = useLocation();

  useEffect(() => {
    const read = (k) => localStorage.getItem(k) || sessionStorage.getItem(k);

    let t = null;
    if (pathname.startsWith("/doctor")) {
      t = read("doctorToken");
    } else if (pathname.startsWith("/admin")) {
      t = read("adminToken");
    } else if (pathname.startsWith("/patient")) {
      t = read("patientToken");
    } else {
      // fallback for public pages; prefer patient token for convenience
      t = read("patientToken") || read("doctorToken") || read("adminToken");
    }

    if (t) axios.defaults.headers.common.Authorization = `Bearer ${t}`;
    else delete axios.defaults.headers.common.Authorization;
  }, [pathname]);

  return null;
}

// Guest-only wrapper for patient auth routes
function GuestOnly({ children }) {
  const t = localStorage.getItem("patientToken") || sessionStorage.getItem("patientToken");
  return t ? <Navigate to="/patient/profile" replace /> : children;
}

export default function App() {
  // Keep axios Authorization synced on token storage/authchange events (cross-tab support)
  useEffect(() => {
    const read = (k) => localStorage.getItem(k) || sessionStorage.getItem(k);
    const syncHeader = () => {
      // This uses "any" token as a fallback; RoleAwareAuthHeader will override on next route effect.
      const t = read("patientToken") || read("doctorToken") || read("adminToken");
      if (t) axios.defaults.headers.common.Authorization = `Bearer ${t}`;
      else delete axios.defaults.headers.common.Authorization;
    };
    syncHeader();
    window.addEventListener("authchange", syncHeader);
    window.addEventListener("storage", syncHeader);
    return () => {
      window.removeEventListener("authchange", syncHeader);
      window.removeEventListener("storage", syncHeader);
    };
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <RoleAwareAuthHeader />

      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <Navbar />
        <Routes>
          {/* Landing */}
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />

          {/* Patient auth */}
          <Route
            path="/patient/register"
            element={
              <GuestOnly>
                <PatientRegister />
              </GuestOnly>
            }
          />
          <Route
            path="/patient/login"
            element={
              <GuestOnly>
                <PatientLogin />
              </GuestOnly>
            }
          />

          {/* Patient */}
          <Route path="/patient" element={<Navigate to="/patient/profile" replace />} />
          <Route
            path="/patient/profile"
            element={
              <PatientPrivateRoute>
                <PatientProfile />
              </PatientPrivateRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <PatientPrivateRoute>
                <PatientAppointments />
              </PatientPrivateRoute>
            }
          />

          {/* Doctors listing + auth */}
          <Route path="/doctors" element={<AllDoctors />} />
          <Route path="/all-doctors" element={<AllDoctors />} />
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/doctor/register" element={<DoctorRegister />} />
          <Route path="/doctor" element={<Navigate to="/doctor/dashboard" replace />} />
          <Route
            path="/doctor/dashboard"
            element={
              <DoctorPrivateRoute>
                <DoctorDashboard />
              </DoctorPrivateRoute>
            }
          />
          <Route
            path="/doctor/appointments/:appointmentId/details"
            element={
              <DoctorPrivateRoute>
                <DoctorAppointmentDetails />
              </DoctorPrivateRoute>
            }
          />

          {/* Static pages */}
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="doctors" element={<AdminDoctors />} />
            <Route path="patients" element={<AdminPatients />} />
            <Route path="reports/appointments" element={<AdminReportsAppointments />} />
          </Route>

          {/* Book flow (patient) */}
          <Route
            path="/book/:doctorId"
            element={
              <PatientPrivateRoute>
                <BookAppointment />
              </PatientPrivateRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
