// src/pages/HomePage.jsx
import { Link } from "react-router-dom";
import doctorImg from "../assets/doctors.png";

export default function HomePage() {
  return (
    <>
      <style>{`
        :root {
          --brand: #4B4BFF;
          --ink: #0f172a;
          --muted: #667085;
          --bg: #f8fafc;
          --card: #ffffff;
          --border: #e2e8f0;
          --primary-gradient: linear-gradient(135deg, #4B4BFF, #0066FF);
          --hero-gradient: linear-gradient(135deg, #0066ff, #0066ff);
        }
        
        .home-wrap {
          background: var(--bg);
          min-height: 100vh;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 28px 20px 64px;
        }
        
          /* Hero – compact */
  .hero {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 0.9fr;
    align-items: center;
    gap: 28px;                         /* 40px → 28px */
    color: #fff;
    border-radius: 20px;
    padding: 40px 36px;                /* 64px 56px → 40px 36px */
    overflow: hidden;
    background: var(--hero-gradient);
    box-shadow: 0 14px 40px rgba(0,102,255,0.16);
    margin-bottom: 36px;               /* 80px → 36px (bring next section up) */
  }
        
        .blob {
    position: absolute;
    inset: auto -80px -80px auto;
    width: 380px;                      /* 500px → 380px */
    height: 380px;
    background: radial-gradient(closest-side, #9CA3FF 0%, rgba(156,163,255,0.2) 60%, transparent 100%);
    filter: blur(50px);
    opacity: 0.55;
    pointer-events: none;
  }
        
        .hero-content {
          position: relative;
          z-index: 2;
        }
        
        .hero h1 {
          margin: 0 0 16px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.1;
          font-size: clamp(28px, 3.6vw, 42px);
        }
        
        .hero p {
          margin: 0 0 16px;
          color: #E7E9FF;
          font-size: clamp(14px, 1.4vw, 16px);
          line-height: 1.6;
        }
        
        .actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 15px;
        }
        
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
        }
        
        .btn-primary {
          background: blue;
          color: var(--brand);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }
        
        .btn-ghost {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.65);
        }
        
        .btn-ghost:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 16px;
          padding: 0;
          list-style: none;
        }
        
        .pill {
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 14px;
          backdrop-filter: blur(10px);
        }
        
        .hero-media {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          z-index: 2;
        }
        
        .hero-media img {
          width: min(420px, 100%);
          height: auto;
          border-radius: 12px;
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.24);
        }
        
        /* Sections */
        .section {
          margin-top: 80px;
        }
        
        .section-header {
          text-align: center;
          margin-bottom: 28px;
        }
        
        .section h2 {
          margin: 0 0 12px;
          color: var(--ink);
          font-size: clamp(14px, 2vw, 24px);
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        
        .muted {
          color: var(--muted);
          margin: 0;
          font-size: 16px;
          line-height: 1.6;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        /* Cards Grid */
        .grid {
          display: grid;
          gap: 22px;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }
        
        .card {
          background: var(--card);
          border-radius: 16px;
          padding: 24px 20px;
          box-shadow: 0 8px 24px rgba(16, 24, 40, 0.08);
          border: 1px solid var(--border);
          transition: all 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(14, 20, 38, 0.10);
        }
        
        .card h3 {
          margin: 16px 0 12px;
          font-size: 20px;
          color: var(--ink);
          font-weight: 700;
        }
        
        .card p {
          margin: 0;
          color: var(--muted);
          font-size: 16px;
          line-height: 1.6;
        }
        
        
        
        /* Steps */.icon {
          font-size: 32px;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(75, 75, 255, 0.08);
          border-radius: 12px;
        }
        .steps {
          display: grid;
          gap: 24px;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }
        
        .step {
          background: var(--card);
          border-radius: 16px;
          padding: 32px 24px;
          border: 1px solid var(--border);
          box-shadow: 0 8px 30px rgba(16, 24, 40, 0.06);
          transition: all 0.3s ease;
          text-align: center;
        }
        
        .step:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(16, 24, 40, 0.1);
        }
        
        .num {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          background: #EEF2FF;
          color: var(--brand);
          margin-bottom: 16px;
          font-size: 18px;
        }
        
        .step h3 {
          margin: 0 0 12px;
          font-size: 20px;
          color: var(--ink);
        }
        
         /* CTA – also tighter */
  .cta {
    margin-top: 56px;                   /* 80 → 56 */
    border-radius: 20px;
    padding: 32px 36px;                 /* 48x56 → 32x36 */
    background: var(--primary-gradient);
    color: #fff;
    display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
    box-shadow: 0 16px 48px rgba(75,75,255,0.18);
  }
  .cta-content { flex: 1; min-width: 300px; }
  .cta strong { font-size: clamp(18px, 2.2vw, 24px); display: block; margin-bottom: 12px; line-height: 1.3; }
  .cta p { margin: 0; color: #E7E9FF; font-size: 16px; }

  /* Responsive tweaks (kept, with smaller paddings) */
  @media (max-width: 1024px) {
    .hero { padding: 32px 28px; gap: 24px; }
  }
  @media (max-width: 900px) {
    .hero { grid-template-columns: 1fr; padding: 28px 24px; text-align: center; }
    .hero-media { order: -1; margin-bottom: 16px; }
    .actions, .pills { justify-content: center; }
  }
  @media (max-width: 640px) {
    .container { padding: 20px 16px 48px; }
    .hero { padding: 24px 20px; margin-bottom: 44px; }
    .section { margin-top: 44px; }
    .cta { padding: 24px 20px; text-align: center; }
    .cta .actions, .btn { width: 100%; max-width: 280px; }
  }
  
`}</style>

      <div className="home-wrap">
        <div className="container">
          {/* HERO */}
          <section className="hero">
            <div className="blob" aria-hidden="true" />
            <div className="hero-content">
              <h1>Book Appointment<br />With Trusted Doctors</h1>
              <p>
                Browse an extensive list of verified doctors and schedule your appointment in minutes.
                Secure, simple, and built for small clinics.
              </p>
              <div className="actions">
                <Link to="/patient/login" className="btn btn-primary">Book appointment </Link>
                <Link to="/all-doctors" className="btn btn-ghost">Browse doctors</Link>
              </div>
              <ul className="pills" aria-label="Key benefits">
                <li className="pill">🔒 Secure & private</li>
                <li className="pill">⏱️ Same-day slots</li>
                <li className="pill">📍 Nearby clinics</li>
              </ul>
            </div>

            <div className="hero-media">
              <img src={doctorImg} alt="Reception booking area with doctors and patients" />
            </div>
          </section>

          {/* WHY CLINICHUB */}
          <section className="section">
            <div className="section-header">
              <h2>Why ClinicHub</h2>
              <p className="muted">Everything you need to manage and book appointments with confidence.</p>
            </div>
            <div className="grid">
              <div className="card">
                <div className="icon">🩺</div>
                <h3>Verified Doctors</h3>
                <p>Profiles with specialties, experience, and availability—so you can choose the right fit.</p>
              </div>
              <div className="card">
                <div className="icon">📆</div>
                <h3>Smart Scheduling</h3>
                <p>See real-time slots and receive reminders to reduce no-shows and waiting times.</p>
              </div>
              <div className="card">
                <div className="icon">💳</div>
                <h3>Easy Payments</h3>
                <p>Optional online pre-payment or pay at clinic—your choice, fully secure.</p>
              </div>
              <div className="card">
                <div className="icon">📱</div>
                <h3>Mobile Friendly</h3>
                <p>Book and manage appointments on any device—no apps required.</p>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="section">
            <div className="section-header">
              <h2>How it works</h2>
              <p className="muted">Simple steps to book your appointment with ClinicHub</p>
            </div>
            <div className="steps">
              <div className="step">
                <div className="num">1</div>
                <h3>Create account</h3>
                <p className="muted">Register quickly with your name, email, and a secure password.</p>
              </div>
              <div className="step">
                <div className="num">2</div>
                <h3>Choose a doctor</h3>
                <p className="muted">Filter by specialty and view ratings, fees, and available times.</p>
              </div>
              <div className="step">
                <div className="num">3</div>
                <h3>Pick a time</h3>
                <p className="muted">Select a suitable slot and confirm your appointment instantly.</p>
              </div>
              <div className="step">
                <div className="num">4</div>
                <h3>Visit or tele-consult</h3>
                <p className="muted">Attend at the clinic or join a secure video call—your choice.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="cta">
            <div className="cta-content">
              <strong>Ready to get started? Create your free patient account.</strong>
              <p>Join thousands of patients who book appointments easily with ClinicHub</p>
            </div>
            <div className="actions">
              <Link to="/patient/register" className="btn btn-primary">Create account</Link>
              <Link to="/all-doctors" className="btn btn-ghost">View doctors</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}