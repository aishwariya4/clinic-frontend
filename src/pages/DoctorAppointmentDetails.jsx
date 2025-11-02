import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import { doctorApi } from "../api";
import "../pages/DoctorAppointmentDetails.css"; // ⬅️ add this

export default function DoctorAppointmentDetails() {
const { appointmentId } = useParams();   
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  
  const [p, setP] = useState(null);
  const [enc, setEnc] = useState({ progress_notes: "" });
  const [initialEnc, setInitialEnc] = useState(null); // for unsaved guard

  async function load() {
    setLoading(true);
    const { data } = await doctorApi.get(`/doctors/appointments/${appointmentId}/details`);
     setP(data || null);
    if (data?.encounter) {
         setEnc({ ...data.encounter });
         setInitialEnc({ ...data.encounter });
       } else {
         setEnc({ progress_notes: "" });
         setInitialEnc({ progress_notes: "" });
       }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [appointmentId]);

  async function saveEncounter(e) {
    e.preventDefault();
    await doctorApi.put(`/doctors/appointments/${appointmentId}/encounter`, enc);
    await load();
    }

  // --- helpers for "unsaved changes" guard ---
    const normEnc = (e) => {
    const keys = [
        "bp_systolic","bp_diastolic","heart_rate","respiratory_rate",
        "temperature_c","spo2_percent","height_cm","weight_kg","bmi","progress_notes"
    ];
    const o = {};
    keys.forEach(k => { o[k] = e?.[k] ?? null; });
    return o;
    };
    const hasUnsaved = JSON.stringify(normEnc(enc)) !== JSON.stringify(normEnc(initialEnc || {}));
  // warn on tab/browser close
    useEffect(() => {
    const beforeUnload = (e) => { if (hasUnsaved) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
    }, [hasUnsaved]);

    const smartBack = () => {
    const from = location.state?.from;
    if (from) navigate(from);
    else if (window.history.length > 1) navigate(-1);
    else navigate("/doctor/dashboard");
    };
    const onBackClick = (e) => {
    e.preventDefault();
    if (!hasUnsaved) return smartBack();
    if (window.confirm("You have unsaved changes in Encounter. Leave without saving?")) {
        smartBack();
    }
    };

    async function addRow(apiPath, payload) {
    await doctorApi.post(`/doctors/appointments/${appointmentId}/${apiPath}`, payload);
    await load();
    }

    if (loading) return (
    <div className="page">
    <div className="loading"><div className="spinner"/> Loading…</div>
    </div>
    );
    if (!p) return <div className="page">Not found.</div>;

    const apptJson = p.appointment || {};
    const apptId   = p.appointment_id ?? apptJson.id ?? appointmentId;

    const apptDateRaw =
    p.appt_date ?? p.appointment_date ?? p.date ?? p.appointment?.date ?? null;
    const apptTimeRaw =
    p.appt_time ?? p.appointment_time ?? p.time ?? p.appointment?.time ?? null;
    const apptStatus =
    p.appt_status ?? p.appointment_status ?? p.status ?? p.appointment?.status ?? "booked";

    const apptDate = apptDateRaw ? new Date(apptDateRaw).toLocaleDateString() : "-";
    const apptTime = apptTimeRaw ? String(apptTimeRaw).slice(0, 5) : "";

    const pat = p.patient || {};
    const displayName   = p.patient_name   ?? pat.name   ?? "-";
    const displayGender = p.patient_gender ?? pat.gender ?? "-";
    const displayDob    = p.patient_dob    ?? pat.dob    ?? null;
    const displayPhone  = p.patient_phone  ?? pat.phone  ?? "-";
    const displayAddr   = p.patient_address?? pat.address?? "-";
    const patientCode   = p.patient_code   ?? pat.patient_code ?? null;

      return (
    <div className="page stack-16">
      {/* Sticky toolbar */}
      <div className="toolbar">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <a href="#" onClick={onBackClick}>Doctor Dashboard</a>
          <span className="sep">▸</span>
          <span className="current">Appointment {apptId}</span>
          {displayName ? (<>
            <span className="sep">▸</span>
            <span className="crumb-patient">{displayName}</span>
          </>) : null}
        </nav>
        <nav className="tabs" aria-label="Sections">
          <a href="#encounter">Encounter</a>
          <a href="#history">History</a>
          <a href="#meds">Medications</a>
          <a href="#dx">Diagnostics</a>
          <a href="#plan">Care Plan</a>
        </nav>
     </div>

      {/* Header */}
      <div>
         <div className="h1">Appointment Details</div>
         <div className="meta">
           <span><b>Appointment:</b> {apptId}</span>
           <span className="dot"></span>
           <span>{apptDate}{apptTime ? ` • ${apptTime}` : ""}</span>
           <span className="dot"></span>
           <span className={`badge ${apptStatus === "completed" ? "success" : (apptStatus === "booked" ? "" : "warn")}`}>
             {apptStatus}
           </span>
           {patientCode && (<><span className="dot"></span><span>Patient Code: {patientCode}</span></>)}
         </div>
       </div>

      {/* Patient */}

        <section className="card" id="patient">
        <div className="card-title">Patient Demographics</div>
        <div className="stack-12">
            <div><b>Name:</b> <span className="muted">{displayName}</span></div>
            <div><b>Gender:</b> <span className="muted">{displayGender}</span></div>
            <div><b>DOB:</b> <span className="muted">{displayDob ? new Date(displayDob).toLocaleDateString() : "-"}</span></div>
            <div><b>Phone:</b> <span className="muted">{displayPhone}</span></div>
            <div><b>Address:</b> <span className="muted">{displayAddr}</span></div>
        </div>
        </section>

      {/* Encounter */}

        <section className="card" id="encounter">
        <div className="card-title">Encounter (Vitals & Notes)</div>
        <form onSubmit={saveEncounter} className="stack-12">
            <div className="grid-4">
            <input className="input" placeholder="BP Systolic" type="number"
                value={enc.bp_systolic ?? ""} onChange={e=>setEnc(s=>({...s, bp_systolic:e.target.value}))}/>
            <input className="input" placeholder="BP Diastolic" type="number"
                value={enc.bp_diastolic ?? ""} onChange={e=>setEnc(s=>({...s, bp_diastolic:e.target.value}))}/>
            <input className="input" placeholder="Heart Rate" type="number"
                value={enc.heart_rate ?? ""} onChange={e=>setEnc(s=>({...s, heart_rate:e.target.value}))}/>
            <input className="input" placeholder="Resp Rate" type="number"
                value={enc.respiratory_rate ?? ""} onChange={e=>setEnc(s=>({...s, respiratory_rate:e.target.value}))}/>
            <input className="input" placeholder="Temp °C" type="number" step="0.1"
                value={enc.temperature_c ?? ""} onChange={e=>setEnc(s=>({...s, temperature_c:e.target.value}))}/>
            <input className="input" placeholder="SpO2 %" type="number"
                value={enc.spo2_percent ?? ""} onChange={e=>setEnc(s=>({...s, spo2_percent:e.target.value}))}/>
            <input className="input" placeholder="Height cm" type="number" step="0.1"
                value={enc.height_cm ?? ""} onChange={e=>setEnc(s=>({...s, height_cm:e.target.value}))}/>
            <input className="input" placeholder="Weight kg" type="number" step="0.1"
                value={enc.weight_kg ?? ""} onChange={e=>setEnc(s=>({...s, weight_kg:e.target.value}))}/>
            <input className="input" placeholder="BMI" type="number" step="0.1"
                value={enc.bmi ?? ""} onChange={e=>setEnc(s=>({...s, bmi:e.target.value}))}/>
            </div>

            <textarea className="textarea" rows={6} placeholder="Progress notes…"
            value={enc.progress_notes ?? ""} onChange={e=>setEnc(s=>({...s, progress_notes:e.target.value}))}/>

            <div className="form-actions">
    <button type="submit" className="btn btn-primary btn-sm">Save Encounter</button>
    </div>
        </form>
        </section>

      {/* Sections */}
    <DataSection
        id="history"
        title="History & Allergies"
        apiPath="conditions"
        fields={[
        { name: "condition_type", options: ["medical", "family", "allergy"] },
        { name: "name", placeholder: "Condition or allergen" },
        { name: "details", placeholder: "Details" },
        { name: "onset_date", placeholder: "YYYY-MM-DD" },
        { name: "status", options: ["active", "resolved", "unknown"] },
        { name: "reaction", placeholder: "(allergy)" },
        { name: "severity", placeholder: "mild/moderate/severe" },
        ]}
        rows={p.conditions}
        cols={["condition_type","name","status","onset_date","reaction","severity","details"]}
        addRow={addRow}
    />

    <DataSection
        id="meds"
        title="Medications"
        apiPath="medications"
        fields={[
        {name:"drug_name", placeholder:"Drug name", required:true},
        {name:"form", placeholder:"tablet"},
        {name:"strength", placeholder:"500 mg"},
        {name:"dosage", placeholder:"1 tab"},
        {name:"frequency", placeholder:"bid"},
        {name:"route", placeholder:"oral"},
        {name:"indication", placeholder:"Why"},
        {name:"start_date", placeholder:"YYYY-MM-DD"},
        {name:"end_date", placeholder:"YYYY-MM-DD"},
        {name:"status", placeholder:"active/discontinued/completed"},
        {name:"notes", placeholder:"Notes"},
        ]}
        rows={p.medications}
        cols={["drug_name","dosage","frequency","route","status","start_date","end_date","notes"]}
        addRow={addRow}
    />

    <DataSection
        id="dx"
        title="Diagnostics"
        apiPath="diagnostics"
        fields={[
        { name: "category", placeholder: "lab/imaging/radiology/immunization/other" },
        { name: "test_name", placeholder: "CBC / Chest X-ray", required: true },
        { name: "result_value", placeholder: "Value" },
        { name: "units", placeholder: "Units" },
        { name: "reference_range", placeholder: "Ref range" },
        { name: "abnormal", options: ["true", "false"] },
        { name: "result_date", placeholder: "YYYY-MM-DD", required: true },
        { name: "summary", placeholder: "Interpretation" },
        ]}
        rows={p.diagnostics}
        cols={["category","test_name","result_date","result_value","units","reference_range","abnormal","summary"]}
        addRow={addRow}
    />

    <DataSection
        id="plan"
        title="Care Plan"
        apiPath="care-plan"
        fields={[
        {name:"diagnosis_code", placeholder:"ICD-10"},
        {name:"diagnosis_text", placeholder:"Diagnosis", required:true},
        {name:"plan_text", placeholder:"Treatment plan", required:true},
        {name:"follow_up_date", placeholder:"YYYY-MM-DD"},
        {name:"status", placeholder:"active/resolved/on-hold"},
        ]}
        rows={p.care_plans}
        cols={["diagnosis_code","diagnosis_text","plan_text","follow_up_date","status"]}
        addRow={addRow}
        />
    </div>
    );
}

function DataSection({ id, title, apiPath, fields, rows, cols, addRow }) {
    const [m, setM] = useState({});
    return (
        <section className="card" id={id}>
        <div className="card-title">{title}</div>

        <form
        onSubmit={async (e) => { e.preventDefault(); await addRow(apiPath, m); setM({}); }}
        className="stack-12"
        >
        <div className="grid-3">
            {fields.map((f) => {
            const val = m[f.name] ?? "";
            const isDate = f.name.endsWith("_date");
            return f.options ? (
                <select
                key={f.name}
                className="select"
                value={val}
                required={!!f.required}
                onChange={(e) => setM((s) => ({ ...s, [f.name]: e.target.value }))}
                >
                <option value="">Select…</option>
                {f.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            ) : (
            <input
                key={f.name}
                className="input"
                type={isDate ? "date" : "text"}
                required={!!f.required}
                value={val}
                placeholder={f.placeholder}
                onChange={(e) => setM((s) => ({ ...s, [f.name]: e.target.value }))}
            />
            );
        })}
        </div>

        <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-sm">Add</button>
    </div>
        <hr className="hr" />
    </form>

    {!rows || rows.length === 0 ? (
        <div className="muted">No records</div>
    ) : (
        <div className="table-wrap">
        <table className="table">
            <thead>
            <tr>
                {cols.map((c) => (<th key={c}>{c}</th>))}
            </tr>
            </thead>
            <tbody>
            {rows.map((r) => (
                <tr key={r.id || JSON.stringify(r)}>
                {cols.map((c) => (<td key={c}>{String(r[c] ?? "")}</td>))}
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    )}
    </section>
    );
}
