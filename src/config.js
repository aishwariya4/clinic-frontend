// src/config.js
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";


// Optional: app branding (safe to read from env)
export const APP = {
  name: import.meta.env.VITE_APP_NAME || "ClinicHub",
  description: import.meta.env.VITE_APP_DESCRIPTION || "",
  themeColor: import.meta.env.VITE_APP_THEME_COLOR || "#0066FF",
  logo: import.meta.env.VITE_APP_LOGO || "clinichub.png",
  colors: {
    primary: import.meta.env.VITE_APP_PRIMARY_COLOR || "#0066FF",
    secondary: import.meta.env.VITE_APP_SECONDARY_COLOR || "#4B4BFF",
    heroStart: import.meta.env.VITE_APP_HERO_GRADIENT_START || "#0066FF",
    heroEnd: import.meta.env.VITE_APP_HERO_GRADIENT_END || "#4B4BFF",
    ctaStart: import.meta.env.VITE_APP_CTA_GRADIENT_START || "#4B4BFF",
    ctaEnd: import.meta.env.VITE_APP_CTA_GRADIENT_END || "#0066FF",
  },
};
