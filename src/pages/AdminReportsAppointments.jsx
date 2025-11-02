// src/pages/AdminReportsAppointments.jsx
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend as RechartsLegend
} from "recharts";
import axios from "axios";
import { API_BASE } from "../config";

/* --------------------------- Axios (admin auth) -------------------------- */
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("adminToken");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

/* ------------------------------ Color helpers ---------------------------- */
const BASE_PALETTE = [
  "#4F46E5", "#16A34A", "#DC2626", "#0EA5E9", "#D97706",
  "#9333EA", "#F43F5E", "#059669", "#EA580C", "#2563EB",
];
function colorFor(dept) {
  let h = 0;
  for (let i = 0; i < dept.length; i++) h = (h * 31 + dept.charCodeAt(i)) | 0;
  return BASE_PALETTE[Math.abs(h) % BASE_PALETTE.length];
}
function rgba(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const [, r, g, b] = m.map((v) => parseInt(v, 16));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function slugifyId(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "_");
}

/* ------------------------------- UI ranges ------------------------------- */
const WINDOW_RANGE = {
  day: { min: 7, max: 30, step: 1, default: 14 },
  week: { min: 4, max: 26, step: 1, default: 12 },
  month: { min: 6, max: 24, step: 1, default: 12 },
};

export default function AdminReportsAppointments() {
  const [granularity, setGranularity] = useState("month"); // day|week|month
  const [days, setDays] = useState(WINDOW_RANGE.month.default);
  const [rawRows, setRawRows] = useState([]); // { period, ...dept_kind }
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState("counts"); // counts | percent
  const [selected, setSelected] = useState(() => new Set()); // for legend filtering
  const [trendDept, setTrendDept] = useState(""); // dropdown department
  const controllerRef = useRef(null);

  /* keep window bounds in sync with granularity */
  useEffect(() => {
    const r = WINDOW_RANGE[granularity];
    setDays((prev) => clamp(prev, r.min, r.max, r.default));
  }, [granularity]);

  /* fetch metrics (abortable) */
  useEffect(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    (async () => {
      try {
        setLoading(true); setErr("");
        const { data } = await api.get("/admins/metrics/appointments-by-dept", {
          params: { granularity, days },
          signal: controller.signal,
        });
        const series = (data?.series || []).map((row) => ({
          label: formatLabel(row.period, granularity),
          ...row,
        }));
        setRawRows(series || []);
        const depts = Array.isArray(data?.departments) ? data.departments : [];
        setDepartments(depts);
        setSelected((prev) => (prev.size ? prev : new Set(depts)));
        setTrendDept((prev) => (prev || depts[0] || ""));
      } catch (e) {
        if (axios.isCancel?.(e) || e.name === "CanceledError" || e.name === "AbortError") return;
        setErr(e?.response?.data?.message || "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [granularity, days]);

  /* -------- active departments for chart #1 (respects legend toggles) ------- */
  const activeDepts = useMemo(
    () => departments.filter((d) => selected.has(d)),
    [departments, selected]
  );

  /* -------------------- chart #1: department comparison rows ----------------- */
  const summaryRows = useMemo(() => {
    // totals per department across the whole lookback window
    const totals = activeDepts.map((dept) => {
      let c = 0, b = 0;
      for (const r of rawRows) {
        c += r[`${dept}_completed`] || 0;
        b += r[`${dept}_booked`] || 0;
      }
      return { label: dept, c, b };
    });

    if (mode === "percent") {
      const grand = totals.reduce((s, t) => s + t.c + t.b, 0);
      return totals.map(({ label, c, b }) => {
        const deptTotal = c + b;
        const share = grand ? (deptTotal / grand) * 100 : 0;
        const completed = deptTotal ? +(share * (c / deptTotal)).toFixed(2) : 0;
        const booked    = deptTotal ? +(share * (b / deptTotal)).toFixed(2) : 0;
        return { label, completed, booked };
        // bars per dept sum to 100% across all departments
      });
    }
    // counts
    return totals.map(({ label, c, b }) => ({ label, completed: c, booked: b }));
  }, [rawRows, activeDepts, mode]);

  /* -------------------- chart #2: single department trend rows --------------- */
  const trendRows = useMemo(() => {
    if (!trendDept) return [];
    return rawRows.map((r) => {
      const c = r[`${trendDept}_completed`] || 0;
      const b = r[`${trendDept}_booked`] || 0;
      const denom = c + b;
      if (mode === "percent") {
        return {
          label: r.label,
          completed: denom ? +((c / denom) * 100).toFixed(2) : 0,
          booked:    denom ? +((b / denom) * 100).toFixed(2) : 0,
          __completionRate: denom ? +((c / denom) * 100).toFixed(2) : 0,
        };
      }
      return {
        label: r.label,
        completed: c,
        booked: b,
        __completionRate: denom ? +((c / denom) * 100).toFixed(2) : 0,
      };
    });
  }, [rawRows, trendDept, mode]);

  const windowLabel = useMemo(
    () => `${days} ${granularity}${days > 1 ? "s" : ""}`,
    [days, granularity]
  );

  /* -------------------------------- Handlers -------------------------------- */
  function toggleDept(dept) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      if (next.size === 0 && !prev.has(dept)) next.add(dept);
      return next;
    });
  }

  function exportCSV() {
    const headers = ["Period"];
    activeDepts.forEach((d) => headers.push(`${d} Completed`, `${d} Booked`));
    const rows = rawRows.map((r) => {
      const cells = [r.label];
      activeDepts.forEach((d) => {
        cells.push(r[`${d}_completed`] ?? 0, r[`${d}_booked`] ?? 0);
      });
      return cells.join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments_${granularity}_${days}${mode === "percent" ? "_percent" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rangeCfg = WINDOW_RANGE[granularity];

  return (
    <div className="reports-container">
      <style>{`
        .reports-container {
          margin-left: 220px;
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding: 0 8px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .kpi-pill {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .kpi-label {
          color: #64748b;
          font-weight: 500;
        }

        .kpi-value {
          color: #1e293b;
          font-weight: 600;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
          border-color: #2563eb;
        }

        .btn-secondary {
          background: white;
          border-color: #d1d5db;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .btn-active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .controls-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .controls-row {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .segmented-control {
          display: inline-flex;
          background: #f1f5f9;
          border-radius: 10px;
          padding: 4px;
        }

        .segmented-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: transparent;
          color: #64748b;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s;
        }

        .segmented-btn.active {
          background: white;
          color: #1e293b;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .range-control {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .range-slider {
          width: 200px;
        }

        .range-value {
          min-width: 40px;
          font-weight: 600;
          color: #1e293b;
          text-align: center;
        }

        .chart-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .chart-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .chart-subtitle {
          color: #64748b;
          font-size: 14px;
          margin-top: 4px;
        }

        .chart-container {
          width: 100%;
          height: 400px;
          margin-bottom: 20px;
        }

        .legend-container {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .legend-item:hover {
          background: #f8fafc;
        }

        .legend-item.active {
          background: white;
          border-color: #3b82f6;
          box-shadow: 0 1px 3px rgba(59, 130, 246, 0.2);
        }

        .legend-item.inactive {
          opacity: 0.5;
          background: #f1f5f9;
        }

        .legend-color {
          display: flex;
          gap: 2px;
        }

        .color-swatch {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }

        .legend-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px;
          color: #64748b;
          gap: 12px;
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-state {
          background: #fef2f2;
          color: #dc2626;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #fecaca;
          text-align: center;
          margin: 20px 0;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .empty-subtitle {
          font-size: 14px;
        }

        .department-select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
          min-width: 200px;
        }

        .department-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Appointment Analytics</h1>
          <div className="chart-subtitle">Department-wise appointment trends and performance metrics</div>
        </div>
        <div className="header-controls">
          <div className="kpi-pill">
            <span className="kpi-label">Window:</span>
            <span className="kpi-value">{windowLabel}</span>
          </div>
          <div className="kpi-pill">
            <span className="kpi-label">Mode:</span>
            <span className="kpi-value">{mode === "percent" ? "Share %" : "Counts"}</span>
          </div>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "percent" ? "counts" : "percent"))}
            className="btn btn-secondary"
          >
            {mode === "percent" ? "📊 Show Counts" : "📈 Show % Share"}
          </button>
          <button type="button" onClick={exportCSV} className="btn btn-secondary">
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Controls Section */}
      <div className="controls-section">
        <div className="controls-row">
          <div className="control-group">
            <label className="control-label">Time Granularity</label>
            <div className="segmented-control">
              {[
                { value: "day", label: "Daily" },
                { value: "week", label: "Weekly" },
                { value: "month", label: "Monthly" }
              ].map((option) => (
                <button
                  key={option.value}
                  className={`segmented-btn ${granularity === option.value ? 'active' : ''}`}
                  onClick={() => setGranularity(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Lookback Period</label>
            <div className="range-control">
              <input
                type="range"
                min={rangeCfg.min}
                max={rangeCfg.max}
                step={rangeCfg.step}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="range-slider"
                aria-label="Lookback window"
              />
              <span className="range-value">{days} {granularity}{days > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          Loading appointment analytics...
        </div>
      ) : err ? (
        <div className="error-state">
          {err}
        </div>
      ) : (
        <>
          {/* Chart 1: Department Comparison */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h2 className="chart-title">Department Comparison</h2>
                <div className="chart-subtitle">
                  Total appointments completed vs booked across all departments
                  {mode === "percent" ? " (percentage share)" : " (absolute counts)"}
                </div>
              </div>
            </div>

            {summaryRows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <div className="empty-title">No Data Available</div>
                <div className="empty-subtitle">
                  Try adjusting the time range or granularity settings
                </div>
              </div>
            ) : (
              <>
                <div className="chart-container">
                  <ResponsiveContainer>
                    <BarChart
                      data={summaryRows}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      barCategoryGap={20}
                      barGap={8}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        height={80}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#64748b" }}
                        domain={mode === "percent" ? [0, 100] : ["auto", "auto"]}
                        tickFormatter={(v) => (mode === "percent" ? `${v}%` : v.toLocaleString())}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          mode === "percent" ? `${value}%` : value.toLocaleString(),
                          name
                        ]}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <RechartsLegend />
                      {/* Completed (per-dept color) */}
                      <Bar dataKey="completed" stackId="a" name="Completed" radius={[4, 4, 0, 0]}>
                        {summaryRows.map((row) => (
                          <Cell key={`c-${row.label}`} fill={colorFor(row.label)} />
                        ))}
                      </Bar>
                      {/* Booked (lighter same color) */}
                      <Bar dataKey="booked" stackId="a" name="Booked" radius={[4, 4, 0, 0]}>
                        {summaryRows.map((row) => (
                          <Cell key={`b-${row.label}`} fill={rgba(colorFor(row.label), 0.4)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Interactive Legend */}
                <div className="legend-container">
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginRight: '12px' }}>
                    Departments:
                  </div>
                  {departments.map((dept) => {
                    const isActive = selected.has(dept);
                    return (
                      <div
                        key={dept}
                        className={`legend-item ${isActive ? 'active' : 'inactive'}`}
                        onClick={() => toggleDept(dept)}
                      >
                        <div className="legend-color">
                          <div 
                            className="color-swatch" 
                            style={{ backgroundColor: colorFor(dept) }}
                            title="Completed"
                          />
                          <div 
                            className="color-swatch" 
                            style={{ backgroundColor: rgba(colorFor(dept), 0.4) }}
                            title="Booked"
                          />
                        </div>
                        <span className="legend-label">{dept}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Chart 2: Department Trend */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h2 className="chart-title">Department Trend Analysis</h2>
                <div className="chart-subtitle">
                  Appointment trends and completion rates over time
                  {mode === "percent" ? " (percentage values)" : " (absolute counts)"}
                </div>
              </div>
              <div className="control-group">
                <label className="control-label">Select Department</label>
                <select
                  value={trendDept}
                  onChange={(e) => setTrendDept(e.target.value)}
                  className="department-select"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {trendRows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📈</div>
                <div className="empty-title">No Trend Data</div>
                <div className="empty-subtitle">
                  Select a department to view detailed trends
                </div>
              </div>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer>
                  <ComposedChart
                    data={trendRows}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    barCategoryGap={12}
                    barGap={4}
                  >
                    <defs>
                      {trendDept && (
                        <Fragment>
                          <linearGradient id={`g-${slugifyId(trendDept)}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colorFor(trendDept)} />
                            <stop offset="100%" stopColor={rgba(colorFor(trendDept), 0.85)} />
                          </linearGradient>
                          <linearGradient id={`g-${slugifyId(trendDept)}-light`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={rgba(colorFor(trendDept), 0.45)} />
                            <stop offset="100%" stopColor={rgba(colorFor(trendDept), 0.25)} />
                          </linearGradient>
                        </Fragment>
                      )}
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      interval="preserveStartEnd"
                      height={80}
                    />
                    <YAxis
                      yAxisId="left"
                      allowDecimals={false}
                      tick={{ fill: "#64748b" }}
                      domain={mode === "percent" ? [0, 100] : ["auto", "auto"]}
                      tickFormatter={(v) => (mode === "percent" ? `${v}%` : v.toLocaleString())}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fill: "#64748b" }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "Completion Rate" ? `${value}%` : 
                        mode === "percent" ? `${value}%` : value.toLocaleString(),
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <RechartsLegend />

                    {/* Stacked bars for chosen department */}
                    <Bar
                      dataKey="completed"
                      stackId="one"
                      name="Completed"
                      fill={`url(#g-${slugifyId(trendDept)})`}
                      radius={[4, 4, 0, 0]}
                      yAxisId="left"
                    />
                    <Bar
                      dataKey="booked"
                      stackId="one"
                      name="Booked"
                      fill={`url(#g-${slugifyId(trendDept)}-light)`}
                      radius={[4, 4, 0, 0]}
                      yAxisId="left"
                    />

                    {/* Completion rate line */}
                    <Line
                      type="monotone"
                      dataKey="__completionRate"
                      name="Completion Rate"
                      yAxisId="right"
                      stroke="#0f172a"
                      strokeWidth={3}
                      dot={{ fill: "#0f172a", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: "#0f172a" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------ Tooltip & Time ----------------------------- */
function formatLabel(iso, g) {
  const d = new Date(iso);
  if (g === "day") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (g === "week") return `W${getISOWeek(d)} ${d.getFullYear()}`;
  return d.toLocaleDateString(undefined, { month: "short" }); // month
}
function getISOWeek(date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
}

/* --------------------------------- Utils ---------------------------------- */
function clamp(v, min, max, fallback) {
  if (Number.isFinite(v)) return Math.min(max, Math.max(min, v));
  return fallback;
}