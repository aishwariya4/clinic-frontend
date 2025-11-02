import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./axiosSetup";          // keep if you use it
import App from "./App.jsx";    // <-- IMPORTANT: .jsx

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
