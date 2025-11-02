// src/api.js
import axios from "axios";
import { API_BASE as RAW_BASE } from "./config"; // keep as "./config" unless you have an alias

// Normalize base once (remove trailing slash)
const API_BASE = String(RAW_BASE || "").replace(/\/+$/, "");



// Helper: build a role-scoped Axios client
function makeClient({ tokenKeys = [], loginPath = "" }) {
  const client = axios.create({
    baseURL: API_BASE,              // e.g. http://localhost:5000/api
    withCredentials: false,         // set true only if using httpOnly cookies
    timeout: 20000,
    headers: { Accept: "application/json" },
  });

  // Attach role token (localStorage first, then sessionStorage)
  client.interceptors.request.use((cfg) => {
    const get = (k) => localStorage.getItem(k) || sessionStorage.getItem(k);
    const token = tokenKeys.map(get).find(Boolean);
    if (token) {
      cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${token}` };
    }
    return cfg;
  });

  // Normalize errors + role-specific 401 handling
  client.interceptors.response.use(
    (r) => r,
    (err) => {
      const resp = err?.response;
      err.normalized = {
        status: resp?.status,
        message:
          resp?.data?.message ||
          (resp?.status === 401 ? "Unauthorized" : "Request failed"),
      };

      if (!resp) return Promise.reject(err); // network/timeout/etc.

      if (resp.status === 401) {
        // Clear only this roles tokens
        for (const k of tokenKeys) {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        }
        // Let App.jsx listeners resync any global headers
        window.dispatchEvent(new Event("authchange"));

        // Avoid redirect loop; send to the correct login with ?next=
        if (loginPath && window.location.pathname !== loginPath) {
          const next = encodeURIComponent(
            window.location.pathname + window.location.search
          );
          window.location.replace(`${loginPath}?next=${next}`);
        }
      }
      return Promise.reject(err);
    }
  );
  

  return client;
}

/* =========================
 * Named role-specific APIs
 * ======================= */
export const patientApi = makeClient({
  tokenKeys: ["patientToken"],
  loginPath: "/patient/login",
});

export const doctorApi = makeClient({
  tokenKeys: ["doctorToken"],
  loginPath: "/doctor/login",
});

export const adminApi = makeClient({
  tokenKeys: ["adminToken"],
  loginPath: "/admin/login",
});

/* =========================
 * Public/unauthenticated API
 * ======================= */
export const apiPublic = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: { Accept: "application/json" },
});

/* =========================
 * Backward-compatible default
 *  - Default export remains the ADMIN client
 *    so old `import api from "./api"` keeps working
 * ======================= */
export default adminApi;
