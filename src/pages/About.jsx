function About() {
  return (
    <>
      <style>{`
        .about-wrap {
          background: #f8fafc;
          min-height: 100vh;
          padding: 40px 0;
        }
        
        .about-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        .about-hero {
          background: linear-gradient(135deg, #0066ff, #4B4BFF);
          color: white;
          border-radius: 20px;
          padding: 60px 40px;
          text-align: center;
          margin-bottom: 60px;
          box-shadow: 0 20px 60px rgba(0, 102, 255, 0.2);
          position: relative;
          overflow: hidden;
        }
        
        .about-hero::before {
          content: '';
          position: absolute;
          top: -50px;
          right: -50px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          border-radius: 50%;
        }
        
        .about-hero::after {
          content: '';
          position: absolute;
          bottom: -80px;
          left: -80px;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(156,163,255,0.15) 0%, transparent 70%);
          border-radius: 50%;
        }
        
        .about-hero h2 {
          font-size: clamp(32px, 4vw, 48px);
          font-weight: 800;
          margin: 0 0 20px;
          letter-spacing: -0.5px;
          position: relative;
          z-index: 2;
        }
        
        .about-hero p {
          font-size: 18px;
          line-height: 1.6;
          margin: 0;
          opacity: 0.9;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 2;
        }
        
        .about-content {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 8px 30px rgba(16, 24, 40, 0.08);
          border: 1px solid #e2e8f0;
          margin-bottom: 40px;
        }
        
        .about-section {
          margin-bottom: 32px;
        }
        
        .about-section:last-child {
          margin-bottom: 0;
        }
        
        .about-section h3 {
          color: #0f172a;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .about-section h3::before {
          content: '';
          display: block;
          width: 4px;
          height: 24px;
          background: linear-gradient(135deg, #4B4BFF, #0066FF);
          border-radius: 2px;
        }
        
        .about-section p {
          color: #667085;
          font-size: 16px;
          line-height: 1.7;
          margin: 0 0 16px;
        }
        
        .tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-top: 20px;
        }
        
        .tech-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s ease;
        }
        
        .tech-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(16, 24, 40, 0.1);
          border-color: #4B4BFF;
        }
        
        .tech-icon {
          font-size: 32px;
          margin-bottom: 12px;
          display: block;
        }
        
        .tech-card h4 {
          color: #0f172a;
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        
        .about-footer {
          text-align: center;
          padding: 30px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(16, 24, 40, 0.08);
          border: 1px solid #e2e8f0;
        }
        
        .about-footer p {
          color: #667085;
          font-size: 16px;
          margin: 0;
          line-height: 1.6;
        }
        
        .university {
          color: #4B4BFF;
          font-weight: 600;
        }
        
        @media (max-width: 768px) {
          .about-hero {
            padding: 40px 24px;
          }
          
          .about-content {
            padding: 30px 24px;
          }
          
          .tech-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 480px) {
          .about-wrap {
            padding: 20px 0;
          }
          
          .tech-grid {
            grid-template-columns: 1fr;
          }
          
          .about-hero {
            padding: 32px 20px;
          }
        }
      `}</style>

      <div className="about-wrap">
        <div className="about-container">
          {/* Hero Section */}
          <section className="about-hero">
            <h2>About ClinicHub</h2>
            <p>
              Revolutionizing healthcare access through technology - making doctor appointments 
              simple, secure, and accessible for everyone.
            </p>
          </section>

          {/* Main Content */}
          <div className="about-content">
            <div className="about-section">
              <h3>Our Mission</h3>
              <p>
                <strong>ClinicHub</strong> is a simple and user-friendly patient appointment management system 
                designed for small clinics. This platform helps patients find trusted doctors and book 
                appointments easily. It also provides admins and doctors with tools to manage appointments and 
                keep track of activities efficiently.
              </p>
              <p>
                We believe that healthcare should be accessible to everyone. ClinicHub bridges the gap 
                between patients and healthcare providers, ensuring that booking medical appointments 
                is as easy as a few clicks.
              </p>
            </div>

            <div className="about-section">
              <h3>Technology Stack</h3>
              <p>Built with modern technologies for reliability and performance:</p>
              <div className="tech-grid">
                <div className="tech-card">
                  <span className="tech-icon">⚛️</span>
                  <h4>React</h4>
                  <p>Frontend</p>
                </div>
                <div className="tech-card">
                  <span className="tech-icon">🚀</span>
                  <h4>Node.js & Express</h4>
                  <p>Backend</p>
                </div>
                <div className="tech-card">
                  <span className="tech-icon">🗄️</span>
                  <h4>PostgreSQL</h4>
                  <p>Database</p>
                </div>
                <div className="tech-card">
                  <span className="tech-icon">🔐</span>
                  <h4>JWT</h4>
                  <p>Authentication</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="about-footer">
            <p>
              Developed by <strong>Aishwariya Gopan</strong> as part of an academic project at{" "}
              <span className="university">Vilnius University</span>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default About;