// src/api.js
import axios from "axios";
import { API_BASE } from "./config";

// Helper to make a client for a specific role
function makeClient({ tokenKeys, loginPath }) {
  const client = axios.create({
    baseURL: API_BASE,
    withCredentials: false, // set true only if you rely on httpOnly cookies
  });

  // Attach the right token before each request
  client.interceptors.request.use((config) => {
    // check localStorage first, then sessionStorage
    const get = (k) => localStorage.getItem(k) || sessionStorage.getItem(k);
    const token =
      get(tokenKeys[0]) || (tokenKeys[1] ? get(tokenKeys[1]) : null);

    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Handle 401s role-specifically
  client.interceptors.response.use(
    (r) => r,
    (err) => {
      if (err?.response?.status === 401) {
        // remove only this role’s tokens
        for (const k of tokenKeys) {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        }
        // optional: also remove shared default header if you set it elsewhere
        delete axios.defaults.headers.common.Authorization;

        // send to the correct login
        if (loginPath) window.location.href = loginPath;
      }
      return Promise.reject(err);
    }
  );

  return client;
}

// Export role-specific clients
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

// If you also need unauthenticated/public calls:
export const api = axios.create({ baseURL: API_BASE });
